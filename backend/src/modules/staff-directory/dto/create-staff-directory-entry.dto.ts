import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateStaffDirectoryEntryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  roleLabel: string;

  @IsString()
  @IsNotEmpty()
  branchId: string;
}
