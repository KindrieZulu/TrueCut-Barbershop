import { IsNotEmpty, IsString } from 'class-validator';
import { IsPhoneLike } from './phone.validators';

export class RequestOtpDto {
  @IsString()
  @IsNotEmpty()
  @IsPhoneLike()
  phone: string;
}
