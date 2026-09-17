import { IsOptional, IsString, MinLength } from 'class-validator';
import { IsPhoneLike } from './phone.validators';

export class LoginDto {
  @IsString()
  @IsPhoneLike()
  phone: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  password?: string;
}
