import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SmsAdapter } from './adapters/sms.adapter';
import { BookingStatus, NotificationStatus, UserRole } from '@prisma/client';
import { addMinutes } from 'date-fns';

const REMINDER_TYPE = 'BOOKING_REMINDER';
const REMINDER_LEAD_MINUTES = 15;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly smsAdapter: SmsAdapter,
  ) {}

  async sendBookingConfirmation(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        client: true,
        barber: true,
        service: true,
        branch: true,
      },
    });

    if (!booking) return;

    // 1. Client SMS
    const clientMsg = `TrueCut Barbershop: Booking confirmed! Code: ${booking.bookingCode}. Service: ${booking.service.name} with ${booking.barber.name} on ${booking.startTime.toLocaleString()} at ${booking.branch.address}.`;
    await this.dispatchSms(booking.id, booking.client.phone, UserRole.CLIENT, 'BOOKING_CONFIRMATION', clientMsg);

    // 2. Barber SMS
    const barberMsg = `TrueCut Appointment: New booking ${booking.bookingCode}. Client: ${booking.client.name} (${booking.client.phone}), Service: ${booking.service.name} at ${booking.startTime.toLocaleTimeString()}.`;
    await this.dispatchSms(booking.id, booking.barber.phone, UserRole.BARBER, 'BARBER_NOTIFICATION', barberMsg);
  }

  async dispatchSms(
    bookingId: string | undefined,
    phone: string,
    role: UserRole,
    type: string,
    message: string,
  ) {
    const log = await this.prisma.notificationLog.create({
      data: {
        bookingId: bookingId || null,
        recipientPhone: phone,
        recipientRole: role,
        type,
        message,
        status: NotificationStatus.SCHEDULED,
      },
    });

    try {
      const result = await this.smsAdapter.sendSms(phone, message);
      await this.prisma.notificationLog.update({
        where: { id: log.id },
        data: {
          status: result.success ? NotificationStatus.SENT : NotificationStatus.FAILED,
          providerRef: result.providerRef,
          sentAt: new Date(),
        },
      });
    } catch (e) {
      await this.prisma.notificationLog.update({
        where: { id: log.id },
        data: { status: NotificationStatus.FAILED },
      });
    }
  }

  /**
   * Finds CONFIRMED bookings starting within the next REMINDER_LEAD_MINUTES
   * that have not already had a reminder sent, and sends one. Intended to
   * be called by a frequent cron tick (see JobsService) - the "not already
   * sent" check against NotificationLog is what makes it safe to call
   * repeatedly while a booking sits inside that window, rather than relying
   * on catching it at an exact instant.
   */
  async sendUpcomingReminders() {
    const now = new Date();
    const windowEnd = addMinutes(now, REMINDER_LEAD_MINUTES);

    const upcomingBookings = await this.prisma.booking.findMany({
      where: {
        status: BookingStatus.CONFIRMED,
        startTime: { gte: now, lte: windowEnd },
        notifications: {
          none: { type: REMINDER_TYPE },
        },
      },
      include: { client: true, barber: true, service: true, branch: true },
    });

    for (const booking of upcomingBookings) {
      const message = `TrueCut Barbershop: Reminder! Your ${booking.service.name} appointment with ${booking.barber.name} starts at ${booking.startTime.toLocaleTimeString()} at ${booking.branch.address}. Code: ${booking.bookingCode}.`;
      await this.dispatchSms(booking.id, booking.client.phone, UserRole.CLIENT, REMINDER_TYPE, message);
      this.logger.log(`[BOOKING REMINDER] Sent to ${booking.client.phone} for ${booking.bookingCode}`);
    }

    return upcomingBookings.length;
  }

  async getLogs(bookingId?: string) {
    return this.prisma.notificationLog.findMany({
      where: bookingId ? { bookingId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
