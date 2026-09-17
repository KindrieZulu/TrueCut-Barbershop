import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { RecurringService } from '../modules/recurring/recurring.service';
import { PrismaService } from '../database/prisma.service';
import { BookingHoldsService } from '../modules/booking-holds/booking-holds.service';
import { BookingsService } from '../modules/bookings/bookings.service';
import { UserRole } from '@prisma/client';

// Regression test for an IDOR: GET/DELETE /recurring-bookings/:id never
// checked the series' clientId against the requesting user, so any
// authenticated client could view or cancel another client's recurring
// booking series just by knowing/guessing its id.
describe('RecurringService ownership checks', () => {
  let service: RecurringService;
  let prismaMock: any;

  beforeEach(async () => {
    prismaMock = {
      recurringBookingGroup: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      booking: {
        updateMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecurringService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: BookingHoldsService, useValue: {} },
        { provide: BookingsService, useValue: {} },
      ],
    }).compile();

    service = module.get(RecurringService);
  });

  const owner = { id: 'client-owner', role: UserRole.CLIENT };
  const otherClient = { id: 'client-attacker', role: UserRole.CLIENT };
  const receptionist = { id: 'staff-1', role: UserRole.RECEPTIONIST };

  it('throws NotFoundException when the series does not exist', async () => {
    prismaMock.recurringBookingGroup.findUnique.mockResolvedValue(null);
    await expect(service.getGroupById('missing', owner)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lets the owning client read their own series', async () => {
    prismaMock.recurringBookingGroup.findUnique
      .mockResolvedValueOnce({ id: 'g1', clientId: owner.id })
      .mockResolvedValueOnce({ id: 'g1', clientId: owner.id, bookings: [] });

    const result = await service.getGroupById('g1', owner);
    expect(result).toEqual({ id: 'g1', clientId: owner.id, bookings: [] });
  });

  it('blocks a different client from reading someone else’s series (the actual IDOR)', async () => {
    prismaMock.recurringBookingGroup.findUnique.mockResolvedValue({ id: 'g1', clientId: owner.id });
    await expect(service.getGroupById('g1', otherClient)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks a different client from cancelling someone else’s series', async () => {
    prismaMock.recurringBookingGroup.findUnique.mockResolvedValue({ id: 'g1', clientId: owner.id });
    await expect(service.cancelSeries('g1', otherClient)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prismaMock.recurringBookingGroup.update).not.toHaveBeenCalled();
  });

  it('lets staff roles (receptionist/admin) act on any series', async () => {
    prismaMock.recurringBookingGroup.findUnique.mockResolvedValue({ id: 'g1', clientId: owner.id });
    prismaMock.recurringBookingGroup.update.mockResolvedValue({});
    prismaMock.booking.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.cancelSeries('g1', receptionist)).resolves.toEqual({
      message: 'Recurring series cancelled successfully',
    });
    expect(prismaMock.recurringBookingGroup.update).toHaveBeenCalledTimes(1);
  });
});
