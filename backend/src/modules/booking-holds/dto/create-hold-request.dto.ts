import { IsBoolean, IsEnum, IsISO8601, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { BookingType } from '@prisma/client';

// clientId is excluded: always comes from req.user.id, never client input.
//
// isSqueezeIn is deliberately excluded too: it bypasses the slot-overlap
// check in BookingHoldsService.createHold, and the only legitimate caller
// of isSqueezeIn: true is ReceptionistService.processWalkInBooking, which
// calls BookingHoldsService directly in-process - it never goes through
// this HTTP endpoint. Without this exclusion, any authenticated CLIENT
// could send isSqueezeIn: true here and skip the availability check that
// the public booking UI never even exposes as an option.
export class CreateHoldRequestDto {
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @IsString()
  @IsNotEmpty()
  barberId: string;

  @IsString()
  @IsNotEmpty()
  serviceId: string;

  @IsISO8601()
  startTimeStr: string;

  @IsEnum(BookingType)
  bookingType: BookingType;

  @IsOptional()
  @IsString()
  houseCallAddress?: string;

  @IsOptional()
  @IsBoolean()
  isEmergency?: boolean;
}
