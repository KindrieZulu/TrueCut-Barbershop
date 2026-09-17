import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';
import { IsPhoneLike } from './phone.validators';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @IsPhoneLike()
  phone: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'password must be at least 8 characters' })
  password?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
