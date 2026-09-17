import { IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

// clientId is deliberately excluded: it always comes from the authenticated
// request (req.user.id), never from client-supplied input.
export class CreateRecurringRequestDto {
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @IsString()
  @IsNotEmpty()
  barberId: string;

  @IsString()
  @IsNotEmpty()
  serviceId: string;

  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'timeSlot must be in HH:mm 24-hour format' })
  timeSlot: string;

  // Unbounded before this: a client could request an arbitrarily large
  // occurrencesCount, triggering that many sequential hold+booking creations.
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(52)
  occurrencesCount?: number;
}
