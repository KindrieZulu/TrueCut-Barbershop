import { IsOptional, IsString, MaxLength } from 'class-validator';
import { VerifyOtpDto } from './verify-otp.dto';

export class VerifyOtpLoginDto extends VerifyOtpDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
}
