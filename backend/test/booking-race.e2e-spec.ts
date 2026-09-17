import { randomUUID } from 'crypto';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { BookingStatus, BookingType, PaymentType, UserRole } from '@prisma/client';

import { PrismaModule } from '../src/database/prisma.module';
import { PrismaService } from '../src/database/prisma.service';
import { EventsModule } from '../src/modules/events/events.module';
import { SystemSettingsModule } from '../src/modules/config/system-settings.module';
import { SchedulingModule } from '../src/modules/scheduling/scheduling.module';
import { BookingHoldsModule } from '../src/modules/booking-holds/booking-holds.module';
import { BookingHoldsService } from '../src/modules/booking-holds/booking-holds.service';
import { BookingsModule } from '../src/modules/bookings/bookings.module';
import { BookingsService } from '../src/modules/bookings/bookings.service';
import { PaymentsModule } from '../src/modules/payments/payments.module';
import { PaymentsService } from '../src/modules/payments/payments.service';

/**
 * Regression test for the defect described in docs/security-assessment.md:
 * the architecture docs and ADRs promise that the (barberId, startTime)
 * unique constraint on booking_slots, applied inside
 * PaymentsService.confirmBookingAndRecordLedger transaction, is the
 * system real double-booking guard. That guarantee is only as good as the
 * database actually supporting multi-write transactions, which silently
 * did NOT hold when the datasource was MongoDB on a non-replica-set
 * container.
 *
 * This suite boots the real Nest providers (no mocked Prisma) against a
 * live Postgres instance and drives two concurrent payment confirmations
 * for bookings that land on the identical barber+time slot, then asserts
 * the database ends up in a consistent state: exactly one booking
 * confirmed, exactly one reserved slot, exactly one ledger entry.
 *
 * Requires DATABASE_URL to point at a real, migrated Postgres instance.
 * Locally: run docker compose up -d postgres from the repo root, then
 * set DATABASE_URL to match your POSTGRES_USER/PASSWORD/DB before running
 * npm run test:e2e. In CI, the postgres service container in
 * .github/workflows/ci.yml provides this automatically.
 */
describe('Concurrent booking confirmation (e2e)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let holdsService: BookingHoldsService;
  let bookingsService: BookingsService;
  let paymentsService: PaymentsService;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        'DATABASE_URL must point at a real, migrated Postgres instance to run this e2e suite. ' +
          'See the header comment in this file for local setup instructions.',
      );
    }

    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        EventsModule,
        SystemSettingsModule,
        SchedulingModule,
        BookingHoldsModule,
        BookingsModule,
        PaymentsModule,
      ],
    }).compile();

    await moduleRef.init();

    prisma = moduleRef.get(PrismaService);
    holdsService = moduleRef.get(BookingHoldsService);
    bookingsService = moduleRef.get(BookingsService);
    paymentsService = moduleRef.get(PaymentsService);
  });

  afterAll(async () => {
    await moduleRef?.close();
  });

  it('confirms exactly one of two concurrent payment confirmations for the same barber+time slot', async () => {
    const suffix = randomUUID().slice(0, 8);

    const branch = await prisma.branch.create({
      data: { name: `Race Branch ${suffix}`, code: `RB-${suffix}`, address: '1 Test St', phone: '0000000000' },
    });
    const barber = await prisma.user.create({
      data: { name: 'Race Barber', phone: `+1555${suffix}`, role: UserRole.BARBER },
    });
    const clientA = await prisma.user.create({
      data: { name: 'Race Client A', phone: `+1556${suffix}`, role: UserRole.CLIENT },
    });
    const clientB = await prisma.user.create({
      data: { name: 'Race Client B', phone: `+1557${suffix}`, role: UserRole.CLIENT },
    });
    const service = await prisma.service.create({
      data: { name: 'Race Cut', description: 'test service', price: 10, durationMinutes: 30 },
    });

    // A fixed future slot both holds target identically.
    const startTimeStr = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // isSqueezeIn: true legitimately bypasses the hold-time overlap guard (a real
    // product feature, front-desk squeeze-ins). That is intentional here: it lets
    // us reach two independently held bookings for the identical slot without
    // fighting the separate, lower-severity read-then-write race in hold
    // creation itself. The property under test is the payment confirmation
    // stage guarantee, which per the architecture docs is the system actual
    // last line of defense.
    const holdA = await holdsService.createHold({
      branchId: branch.id,
      barberId: barber.id,
      serviceId: service.id,
      clientId: clientA.id,
      startTimeStr,
      bookingType: BookingType.GENERAL,
      isSqueezeIn: true,
    });
    const holdB = await holdsService.createHold({
      branchId: branch.id,
      barberId: barber.id,
      serviceId: service.id,
      clientId: clientB.id,
      startTimeStr,
      bookingType: BookingType.GENERAL,
      isSqueezeIn: true,
    });

    const bookingA = await bookingsService.createBookingFromHold(holdA.hold.holdToken);
    const bookingB = await bookingsService.createBookingFromHold(holdB.hold.holdToken);

    expect(bookingA.barberId).toBe(barber.id);
    expect(bookingB.barberId).toBe(barber.id);
    expect(new Date(bookingA.startTime).getTime()).toBe(new Date(bookingB.startTime).getTime());

    // The actual race: two concurrent CASH payment confirmations for bookings
    // that occupy the same barber+time slot. Neither call awaits the other,
    // so both in-flight transactions genuinely overlap at the database.
    const results = await Promise.allSettled([
      paymentsService.initiatePayment(bookingA.id, barber.phone, PaymentType.CASH, `idem-a-${suffix}`),
      paymentsService.initiatePayment(bookingB.id, barber.phone, PaymentType.CASH, `idem-b-${suffix}`),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason?.message).toMatch(/slot was just taken/i);

    const [refreshedA, refreshedB] = await Promise.all([
      prisma.booking.findUniqueOrThrow({ where: { id: bookingA.id } }),
      prisma.booking.findUniqueOrThrow({ where: { id: bookingB.id } }),
    ]);

    const confirmedBookings = [refreshedA, refreshedB].filter((b) => b.status === BookingStatus.CONFIRMED);
    expect(confirmedBookings).toHaveLength(1);

    const reservedSlots = await prisma.bookingSlot.findMany({
      where: { barberId: barber.id, startTime: refreshedA.startTime },
    });
    expect(reservedSlots).toHaveLength(1);
    expect(reservedSlots[0].bookingId).toBe(confirmedBookings[0].id);

    const ledgerEntries = await prisma.paymentLedger.count({ where: { branchId: branch.id } });
    expect(ledgerEntries).toBe(1);
  }, 30000);
});
