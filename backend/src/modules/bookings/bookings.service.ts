import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SystemSettingsService } from '../config/system-settings.service';
import { BookingStatus, BookingType, UserRole } from '@prisma/client';
import { addMinutes, subDays, differenceInMinutes, isBefore } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SystemSettingsService,
  ) {}

  /**
   * Evaluates if a client qualifies as a Regular Customer based on completed booking history
   */
  async evaluateRegularCustomerEligibility(clientId: string): Promise<boolean> {
    const minBookings = this.settingsService.getNumber('regular_customer_min_bookings', 5);
    const periodDays = this.settingsService.getNumber('regular_customer_period_days', 60);

    const cutoffDate = subDays(new Date(), periodDays);

    const completedCount = await this.prisma.booking.count({
      where: {
        clientId,
        status: BookingStatus.SERVED,
        createdAt: { gte: cutoffDate },
      },
    });

    return completedCount >= minBookings;
  }

  /**
   * Converts a valid BookingHold into a Booking
   */
  async createBookingFromHold(holdToken: string, receptionistId?: string) {
    const hold = await this.prisma.bookingHold.findUnique({
      where: { holdToken },
      include: { service: true },
    });

    if (!hold) {
      throw new NotFoundException('Booking hold not found or expired');
    }

    if (isBefore(hold.expiresAt, new Date())) {
      await this.prisma.bookingHold.delete({ where: { id: hold.id } });
      throw new BadRequestException('Booking hold has expired. Please select the slot again.');
    }

    // Determine final booking type (check Regular eligibility if General)
    let finalBookingType = hold.bookingType;
    if (finalBookingType === BookingType.GENERAL) {
      const isRegular = await this.evaluateRegularCustomerEligibility(hold.clientId);
      if (isRegular) {
        finalBookingType = BookingType.REGULAR;
      }
    }

    // Calculate Fees
    const bookingFee = this.settingsService.getNumber('booking_fee', 2);
    const emergencyFee = hold.isEmergency ? this.settingsService.getNumber('emergency_fee', 10) : 0;
    const houseCallFee = hold.bookingType === BookingType.HOUSE_CALL ? this.settingsService.getNumber('house_call_fee', 5) : 0;
    const squeezeInFee = hold.isSqueezeIn ? this.settingsService.getNumber('squeeze_in_fee', 3) : 0;
    const serviceFee = Number(hold.service.price);
    const totalAmount = serviceFee + bookingFee + emergencyFee + houseCallFee + squeezeInFee;

    const bookingCode = `TC-${uuidv4().substring(0, 6).toUpperCase()}`;

    // Create booking and delete hold atomically
    const [booking] = await this.prisma.$transaction([
      this.prisma.booking.create({
        data: {
          bookingCode,
          branchId: hold.branchId,
          clientId: hold.clientId,
          barberId: hold.barberId,
          serviceId: hold.serviceId,
          receptionistId: receptionistId || null,
          bookingType: finalBookingType,
          status: BookingStatus.HELD, // Stays HELD until payment confirmed
          startTime: hold.startTime,
          endTime: hold.endTime,
          serviceFee,
          bookingFee,
          emergencyFee,
          houseCallFee,
          squeezeInFee,
          totalAmount,
          houseCallAddress: hold.houseCallAddress,
          isSqueezeIn: hold.isSqueezeIn,
        },
        include: {
          client: { select: { id: true, name: true, phone: true } },
          barber: { select: { id: true, name: true, phone: true } },
          service: true,
          branch: true,
        },
      }),
      this.prisma.bookingHold.delete({ where: { id: hold.id } }),
    ]);

    this.logger.log(`[BOOKING CREATED] Code: ${bookingCode} for Client: ${hold.clientId}`);

    return booking;
  }

  async getBookingById(id: string, requestingUser?: { id: string; role: string }) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, name: true, phone: true, email: true } },
        barber: { select: { id: true, name: true, phone: true } },
        receptionist: { select: { id: true, name: true } },
        service: true,
        branch: true,
        payments: true,
      },
    });
    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    if (requestingUser && requestingUser.role === UserRole.CLIENT && booking.clientId !== requestingUser.id) {
      throw new ForbiddenException('Access denied to booking record');
    }

    return booking;
  }

  async getClientBookings(clientId: string, page = 1, limit = 20) {
    return this.prisma.booking.findMany({
      where: { clientId },
      include: {
        barber: { select: { id: true, name: true } },
        service: true,
        branch: { select: { id: true, name: true, address: true } },
        payments: { select: { id: true, status: true, amount: true, paymentType: true } },
      },
      orderBy: { startTime: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async getBranchTodayBookings(branchId: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    return this.prisma.booking.findMany({
      where: {
        branchId,
        startTime: { gte: todayStart, lte: todayEnd },
      },
      include: {
        client: { select: { id: true, name: true, phone: true } },
        barber: { select: { id: true, name: true, phone: true } },
        service: true,
        payments: true,
      },
      orderBy: { startTime: 'asc' },
    });
  }

  /**
   * Exact Cancellation Policy Logic:
   * >= 2 hours before: full service refund, keep $2 booking fee, $0 penalty.
   * < 2 hours before: full service refund minus $3 penalty, keep $2 booking fee.
   */
  async cancelBooking(bookingId: string, cancelledByUserId: string, requestingUser?: { id: string; role: string }) {
    const booking = await this.getBookingById(bookingId, requestingUser);

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Booking is already cancelled');
    }

    if (booking.status === BookingStatus.SERVED) {
      throw new BadRequestException('Cannot cancel a completed service');
    }

    const now = new Date();
    const minutesUntilAppointment = differenceInMinutes(booking.startTime, now);

    const cancellationCutoff = this.settingsService.getNumber('cancellation_cutoff_minutes', 120);
    const penaltyFee = this.settingsService.getNumber('penalty_fee', 3);

    let penaltyApplied = 0;

    if (minutesUntilAppointment < cancellationCutoff) {
      penaltyApplied = penaltyFee; // $3 penalty if < 2h before
    }

    const updatedBooking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CANCELLED },
    });

    this.logger.log(`[BOOKING CANCELLED] ID: ${bookingId} Penalty: $${penaltyApplied}`);

    return {
      booking: updatedBooking,
      refundCalculation: {
        serviceFee: Number(booking.serviceFee),
        bookingFee: Number(booking.bookingFee),
        penaltyApplied,
        eligibleRefund: Math.max(0, Number(booking.serviceFee) - penaltyApplied),
      },
    };
  }

  /**
   * Auto No-Show Detector Background Job logic:
   * Checked 15 minutes past appointment start time.
   */
  async processNoShows() {
    const graceMinutes = this.settingsService.getNumber('no_show_grace_minutes', 15);
    const penaltyFee = this.settingsService.getNumber('penalty_fee', 3);
    const cutoffTime = addMinutes(new Date(), -graceMinutes);

    const result = await this.prisma.booking.updateMany({
      where: {
        status: BookingStatus.CONFIRMED,
        startTime: { lte: cutoffTime },
      },
      data: { status: BookingStatus.NO_SHOW },
    });

    if (result.count > 0) {
      this.logger.log(`[NO_SHOW AUTOMATION] Marked ${result.count} booking(s) as NO_SHOW (Penalty: $${penaltyFee})`);
    }

    return result.count;
  }

  /**
   * Marks a booking as SERVED when haircut/grooming is completed by barber
   */
  async markAsServed(bookingId: string) {
    const booking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.SERVED },
    });

    this.logger.log(`[BOOKING SERVED] Code: ${booking.bookingCode} completed`);

    return booking;
  }

  /**
   * Reschedules an existing booking by canceling the old booking and confirming the new hold
   */
  async rescheduleBooking(oldBookingId: string, newHoldToken: string, userId: string) {
    const oldBooking = await this.getBookingById(oldBookingId);

    if (oldBooking.status === BookingStatus.CANCELLED || oldBooking.status === BookingStatus.SERVED) {
      throw new BadRequestException('Cannot reschedule a cancelled or completed booking');
    }

    // Cancel old booking
    await this.cancelBooking(oldBookingId, userId);

    // Create new booking from hold
    const newBooking = await this.createBookingFromHold(newHoldToken);

    this.logger.log(`[BOOKING RESCHEDULED] Old ID: ${oldBookingId} -> New Code: ${newBooking.bookingCode}`);

    return {
      message: 'Booking rescheduled successfully',
      newBooking,
    };
  }
}
