import { Controller, Post, Get, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { RecurringService, CreateRecurringDto } from './recurring.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('recurring-bookings')
export class RecurringController {
  constructor(private readonly recurringService: RecurringService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createSeries(@Req() req: any, @Body() body: Omit<CreateRecurringDto, 'clientId'>) {
    return this.recurringService.createRecurringGroup({
      ...body,
      clientId: req.user.id,
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getSeries(@Param('id') id: string) {
    return this.recurringService.getGroupById(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async cancelSeries(@Param('id') id: string) {
    return this.recurringService.cancelSeries(id);
  }
}
