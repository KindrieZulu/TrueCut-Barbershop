import { Controller, Get, Query } from '@nestjs/common';
import { SchedulingService } from './scheduling.service';

@Controller('availability')
export class SchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  @Get()
  async getAvailability(
    @Query('branchId') branchId: string,
    @Query('barberId') barberId: string,
    @Query('serviceId') serviceId: string,
    @Query('date') dateStr: string,
    @Query('isHouseCall') isHouseCallStr?: string,
  ) {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const isHouseCall = isHouseCallStr === 'true';

    return this.schedulingService.getAvailableSlots(
      branchId,
      barberId,
      serviceId,
      targetDate,
      isHouseCall,
    );
  }
}
