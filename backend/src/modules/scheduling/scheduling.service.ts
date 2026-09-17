import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SystemSettingsService } from '../config/system-settings.service';
import { addMinutes, format, parse, startOfDay, endOfDay, isBefore, isAfter, isEqual } from 'date-fns';

export interface TimeSlot {
  startTime: Date;
  endTime: Date;
  occupiedDurationMinutes: number;
  isAvailable: boolean;
  barberId: string;
}

@Injectable()
export class SchedulingService {
  private readonly logger = new Logger(SchedulingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SystemSettingsService,
  ) {}

  /**
   * Calculates total occupied duration for a slot according to business formula:
   * occupied_duration = service_duration + standard_15_minute_buffer + (house_call_travel_buffer ? 15 : 0)
   */
  calculateOccupiedDuration(serviceDurationMinutes: number, isHouseCall: boolean = false): number {
    const standardBuffer = this.settingsService.getNumber('standard_buffer_minutes', 15);
    const travelBuffer = isHouseCall
      ? this.settingsService.getNumber('house_call_travel_buffer_minutes', 15)
      : 0;
    return serviceDurationMinutes + standardBuffer + travelBuffer;
  }

  /**
   * Generates available slots for a barber on a specific date.
   */
  async getAvailableSlots(
    branchId: string,
    barberId: string,
    serviceId: string,
    targetDate: Date,
    isHouseCall: boolean = false,
  ): Promise<TimeSlot[]> {
    const service = await this.prisma.service.findUnique({ where: { id: serviceId } });
    if (!service || !service.isActive) {
      throw new BadRequestException('Invalid or inactive service');
    }

    const dayOfWeek = targetDate.getDay(); // 0 = Sunday, 1 = Monday...
    const schedule = await this.prisma.barberSchedule.findUnique({
      where: {
        barberId_branchId_dayOfWeek: {
          barberId,
          branchId,
          dayOfWeek,
        },
      },
    });

    if (!schedule || !schedule.isWorkingDay) {
      return []; // Barber not working on this day
    }

    const occupiedDuration = this.calculateOccupiedDuration(service.durationMinutes, isHouseCall);

    // Parse start and end time of barber working shift
    const dateStr = format(targetDate, 'yyyy-MM-dd');
    const shiftStart = parse(`${dateStr} ${schedule.startTime}`, 'yyyy-MM-dd HH:mm', new Date());
    const shiftEnd = parse(`${dateStr} ${schedule.endTime}`, 'yyyy-MM-dd HH:mm', new Date());

    // Fetch existing confirmed/held bookings for this barber on target date
    const dayStart = startOfDay(targetDate);
    const dayEnd = endOfDay(targetDate);

    const existingBookings = await this.prisma.booking.findMany({
      where: {
        barberId,
        startTime: { gte: dayStart, lte: dayEnd },
        status: { in: ['CONFIRMED', 'HELD'] },
      },
    });

    // Fetch active holds
    const activeHolds = await this.prisma.bookingHold.findMany({
      where: {
        barberId,
        startTime: { gte: dayStart, lte: dayEnd },
        expiresAt: { gt: new Date() },
      },
    });

    // Fetch block-out periods
    const blockOuts = await this.prisma.barberBlockOut.findMany({
      where: {
        barberId,
        branchId,
        startTime: { lte: dayEnd },
        endTime: { gte: dayStart },
      },
    });

    const slots: TimeSlot[] = [];
    let currentSlotStart = shiftStart;

    while (isBefore(addMinutes(currentSlotStart, occupiedDuration), shiftEnd) || isEqual(addMinutes(currentSlotStart, occupiedDuration), shiftEnd)) {
      const currentSlotEnd = addMinutes(currentSlotStart, occupiedDuration);

      // Check for overlap with existing bookings
      const hasBookingOverlap = existingBookings.some((b) =>
        this.checkOverlap(currentSlotStart, currentSlotEnd, b.startTime, b.endTime),
      );

      // Check for overlap with holds
      const hasHoldOverlap = activeHolds.some((h) =>
        this.checkOverlap(currentSlotStart, currentSlotEnd, h.startTime, h.endTime),
      );

      // Check for overlap with block outs
      const hasBlockOutOverlap = blockOuts.some((b) =>
        this.checkOverlap(currentSlotStart, currentSlotEnd, b.startTime, b.endTime),
      );

      const isFuture = isAfter(currentSlotStart, new Date());
      const isAvailable = !hasBookingOverlap && !hasHoldOverlap && !hasBlockOutOverlap && isFuture;

      slots.push({
        startTime: currentSlotStart,
        endTime: currentSlotEnd,
        occupiedDurationMinutes: occupiedDuration,
        isAvailable,
        barberId,
      });

      // Increment slot by 15-minute intervals for fine granularity
      currentSlotStart = addMinutes(currentSlotStart, 15);
    }

    return slots;
  }

  /**
   * Evaluates if two time intervals overlap
   */
  checkOverlap(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
    return isBefore(startA, endB) && isAfter(endA, startB);
  }
}
