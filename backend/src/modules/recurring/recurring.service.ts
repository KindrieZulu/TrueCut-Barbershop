import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { BookingHoldsService } from '../booking-holds/booking-holds.service';
import { BookingsService } from '../bookings/bookings.service';
import { BookingType } from '@prisma/client';
import { addWeeks, parse, format, addMinutes } from 'date-fns';

export interface CreateRecurringDto {
  clientId: string;
  branchId: string;
  barberId: string;
  serviceId: string;
  dayOfWeek: number; // 0-6
  timeSlot: string; // "10:00"
  occurrencesCount?: number; // default 4 weeks ahead
}

@Injectable()
export class RecurringService {
  private readonly logger = new Logger(RecurringService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly holdsService: BookingHoldsService,
    private readonly bookingsService: BookingsService,
  ) {}

  async createRecurringGroup(dto: CreateRecurringDto) {
    const occurrences = dto.occurrencesCount || 4;

    const group = await this.prisma.recurringBookingGroup.create({
      data: {
        clientId: dto.clientId,
        branchId: dto.branchId,
        barberId: dto.barberId,
        serviceId: dto.serviceId,
        dayOfWeek: dto.dayOfWeek,
        timeSlot: dto.timeSlot,
        startDate: new Date(),
        isActive: true,
      },
    });

    // Generate weekly occurrences
    const createdBookings = [];
    let currentDate = new Date();

    // Adjust to next matching dayOfWeek
    while (currentDate.getDay() !== dto.dayOfWeek) {
      currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
    }

    for (let i = 0; i < occurrences; i++) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const startTimeStr = `${dateStr} ${dto.timeSlot}`;

      try {
        const holdResult = await this.holdsService.createHold({
          branchId: dto.branchId,
          barberId: dto.barberId,
          serviceId: dto.serviceId,
          clientId: dto.clientId,
          startTimeStr,
          bookingType: BookingType.GENERAL,
        });

        const booking = await this.bookingsService.createBookingFromHold(holdResult.hold.holdToken);

        await this.prisma.booking.update({
          where: { id: booking.id },
          data: { recurringGroupId: group.id },
        });

        createdBookings.push(booking);
      } catch (e) {
        this.logger.warn(`[RECURRING OVERLAP] Could not book occurrence on ${startTimeStr}: ${e.message}`);
      }

      currentDate = addWeeks(currentDate, 1);
    }

    return {
      recurringGroup: group,
      generatedBookings: createdBookings,
    };
  }

  async getGroupById(groupId: string) {
    return this.prisma.recurringBookingGroup.findUnique({
      where: { id: groupId },
      include: {
        bookings: {
          include: { service: true, barber: { select: { name: true } } },
          orderBy: { startTime: 'asc' },
        },
      },
    });
  }

  async cancelSeries(groupId: string) {
    await this.prisma.recurringBookingGroup.update({
      where: { id: groupId },
      data: { isActive: false },
    });

    const pendingBookings = await this.prisma.booking.findMany({
      where: {
        recurringGroupId: groupId,
        status: 'HELD',
        startTime: { gt: new Date() },
      },
    });

    for (const b of pendingBookings) {
      await this.prisma.booking.update({
        where: { id: b.id },
        data: { status: 'CANCELLED' },
      });
    }

    return { message: 'Recurring series cancelled successfully' };
  }
}
