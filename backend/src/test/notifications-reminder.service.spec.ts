import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from '../modules/notifications/notifications.service';
import { PrismaService } from '../database/prisma.service';
import { SmsAdapter } from '../modules/notifications/adapters/sms.adapter';
import { BookingStatus, NotificationStatus, UserRole } from '@prisma/client';

describe('NotificationsService.sendUpcomingReminders', () => {
  let service: NotificationsService;
  let prismaMock: any;
  let smsMock: any;

  const booking = {
    id: 'booking-1',
    bookingCode: 'TC-ABC123',
    startTime: new Date('2026-10-01T09:00:00.000Z'),
    client: { phone: '+263771111111' },
    barber: { name: 'Tinashe Barber' },
    service: { name: 'Classic Haircut' },
    branch: { address: '1 Test St' },
  };

  beforeEach(async () => {
    prismaMock = {
      booking: { findMany: jest.fn() },
      notificationLog: {
        create: jest.fn().mockResolvedValue({ id: 'log-1' }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    smsMock = { sendSms: jest.fn().mockResolvedValue({ success: true, providerRef: 'SMS-1' }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: SmsAdapter, useValue: smsMock },
      ],
    }).compile();

    service = module.get(NotificationsService);
  });

  it('queries only CONFIRMED bookings starting within the next 15 minutes with no prior reminder', async () => {
    prismaMock.booking.findMany.mockResolvedValue([]);

    const before = Date.now();
    await service.sendUpcomingReminders();
    const after = Date.now();

    expect(prismaMock.booking.findMany).toHaveBeenCalledTimes(1);
    const call = prismaMock.booking.findMany.mock.calls[0][0];

    expect(call.where.status).toBe(BookingStatus.CONFIRMED);
    expect(call.where.notifications).toEqual({ none: { type: 'BOOKING_REMINDER' } });

    const gte = call.where.startTime.gte.getTime();
    const lte = call.where.startTime.lte.getTime();
    expect(gte).toBeGreaterThanOrEqual(before);
    expect(gte).toBeLessThanOrEqual(after);
    // Window is exactly 15 minutes wide.
    expect(lte - gte).toBe(15 * 60 * 1000);
  });

  it('sends one SMS reminder per matching booking and logs it via NotificationLog', async () => {
    prismaMock.booking.findMany.mockResolvedValue([booking]);

    const count = await service.sendUpcomingReminders();

    expect(count).toBe(1);
    expect(smsMock.sendSms).toHaveBeenCalledTimes(1);
    expect(smsMock.sendSms).toHaveBeenCalledWith('+263771111111', expect.stringContaining('TC-ABC123'));
    expect(prismaMock.notificationLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          bookingId: 'booking-1',
          recipientPhone: '+263771111111',
          recipientRole: UserRole.CLIENT,
          type: 'BOOKING_REMINDER',
          status: NotificationStatus.SCHEDULED,
        }),
      }),
    );
  });

  it('sends nothing when no bookings match (already reminded or outside the window)', async () => {
    prismaMock.booking.findMany.mockResolvedValue([]);

    const count = await service.sendUpcomingReminders();

    expect(count).toBe(0);
    expect(smsMock.sendSms).not.toHaveBeenCalled();
  });
});
