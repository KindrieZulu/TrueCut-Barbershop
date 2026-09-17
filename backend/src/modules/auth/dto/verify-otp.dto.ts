import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { IsPhoneLike } from './phone.validators';

export class VerifyOtpDto {
  @IsString()
  @IsNotEmpty()
  @IsPhoneLike()
  phone: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'code must be a 6-digit numeric string' })
  code: string;
}
