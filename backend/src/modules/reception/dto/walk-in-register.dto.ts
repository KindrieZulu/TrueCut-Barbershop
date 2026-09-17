import { IsBoolean, IsEnum, IsISO8601, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PaymentType } from '@prisma/client';

export class WalkInRegisterDto {
  @IsString()
  @IsNotEmpty()
  clientName: string;

  @IsString()
  @IsNotEmpty()
  clientPhone: string;

  @IsOptional()
  @IsString()
  clientEmail?: string;

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

  @IsEnum(PaymentType)
  paymentType: PaymentType;

  @IsOptional()
  @IsBoolean()
  isSqueezeIn?: boolean;

  @IsOptional()
  @IsString()
  squeezeInReason?: string;
}
