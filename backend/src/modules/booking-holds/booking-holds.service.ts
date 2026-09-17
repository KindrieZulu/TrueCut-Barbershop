import {
  Injectable,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SchedulingService } from '../scheduling/scheduling.service';
import { SystemSettingsService } from '../config/system-settings.service';
import { BookingType } from '@prisma/client';
import { addMinutes } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

import { EventsService } from '../events/events.service';

export interface CreateHoldDto {
  branchId: string;
  barberId: string;
  serviceId: string;
  clientId: string;
  startTimeStr: string;
  bookingType: BookingType;
  houseCallAddress?: string;
  isEmergency?: boolean;
  isSqueezeIn?: boolean;
}

@Injectable()
export class BookingHoldsService {
  private readonly logger = new Logger(BookingHoldsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly schedulingService: SchedulingService,
    private readonly settingsService: SystemSettingsService,
    private readonly eventsService: EventsService,
  ) {}

  async createHold(dto: CreateHoldDto) {
    const service = await this.prisma.service.findUnique({ where: { id: dto.serviceId } });
    if (!service || !service.isActive) {
      throw new BadRequestException('Service not found or inactive');
    }

    const isHouseCall = dto.bookingType === BookingType.HOUSE_CALL;
    const occupiedDuration = this.schedulingService.calculateOccupiedDuration(
      service.durationMinutes,
      isHouseCall,
    );

    const startTime = new Date(dto.startTimeStr);
    const endTime = addMinutes(startTime, occupiedDuration);

    const holdMinutes = this.settingsService.getNumber('booking_hold_minutes', 10);
    const expiresAt = addMinutes(new Date(), holdMinutes);
    const holdToken = `HOLD-${uuidv4().substring(0, 8).toUpperCase()}`;

    return await this.prisma.$transaction(async (tx) => {
      await tx.user.findUnique({ where: { id: dto.barberId }, select: { id: true } });

      const overlappingBookings = await tx.booking.findMany({
        where: {
          barberId: dto.barberId,
          status: { in: ['CONFIRMED', 'HELD'] },
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      });

      if (overlappingBookings.length > 0 && !dto.isSqueezeIn) {
        throw new ConflictException('This time slot is no longer available. Please select another slot.');
      }

      const overlappingHolds = await tx.bookingHold.findMany({
        where: {
          barberId: dto.barberId,
          expiresAt: { gt: new Date() },
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      });

      if (overlappingHolds.length > 0 && !dto.isSqueezeIn) {
        throw new ConflictException('Another customer is currently holding this slot. Please try again shortly.');
      }

      // 4. Create hold record
      const hold = await tx.bookingHold.create({
        data: {
          holdToken,
          branchId: dto.branchId,
          barberId: dto.barberId,
          serviceId: dto.serviceId,
          clientId: dto.clientId,
          bookingType: dto.bookingType,
          startTime,
          endTime,
          expiresAt,
          houseCallAddress: dto.houseCallAddress,
          isEmergency: dto.isEmergency || dto.bookingType === BookingType.EMERGENCY,
          isSqueezeIn: dto.isSqueezeIn || false,
        },
      });

      this.logger.log(`[HOLD CREATED] Token: ${holdToken} for Barber: ${dto.barberId} (Expires: ${expiresAt.toISOString()})`);

      this.eventsService.emit('HOLD_CREATED', {
        barberId: dto.barberId,
        startTime: startTime.toISOString(),
        expiresAt: expiresAt.toISOString(),
      });

      // 5. Calculate Fee Breakdown
      const bookingFee = this.settingsService.getNumber('booking_fee', 2);
      const emergencyFee = dto.bookingType === BookingType.EMERGENCY
        ? this.settingsService.getNumber('emergency_fee', 10)
        : 0;
      const houseCallFee = isHouseCall
        ? this.settingsService.getNumber('house_call_fee', 5)
        : 0;
      const squeezeInFee = dto.isSqueezeIn
        ? this.settingsService.getNumber('squeeze_in_fee', 3)
        : 0;
      const servicePrice = Number(service.price);
      const totalAmount = servicePrice + bookingFee + emergencyFee + houseCallFee + squeezeInFee;

      return {
        hold,
        pricing: {
          servicePrice,
          bookingFee,
          emergencyFee,
          houseCallFee,
          squeezeInFee,
          totalAmount,
        },
      };
    });
  }

  async cancelHold(holdToken: string) {
    return this.prisma.bookingHold.deleteMany({
      where: { holdToken },
    });
  }

  async releaseExpiredHolds() {
    const deleted = await this.prisma.bookingHold.deleteMany({
      where: { expiresAt: { lte: new Date() } },
    });
    if (deleted.count > 0) {
      this.logger.log(`[HOLD CLEANUP] Released ${deleted.count} expired holds`);
    }
    return deleted.count;
  }
}
