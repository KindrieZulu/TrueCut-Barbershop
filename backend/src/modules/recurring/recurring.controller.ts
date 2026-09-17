import { Controller, Post, Get, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { RecurringService } from './recurring.service';
import { CreateRecurringRequestDto } from './dto/create-recurring-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('recurring-bookings')
export class RecurringController {
  constructor(private readonly recurringService: RecurringService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createSeries(@Req() req: any, @Body() body: CreateRecurringRequestDto) {
    return this.recurringService.createRecurringGroup({
      ...body,
      clientId: req.user.id,
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getSeries(@Req() req: any, @Param('id') id: string) {
    return this.recurringService.getGroupById(id, req.user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async cancelSeries(@Req() req: any, @Param('id') id: string) {
    return this.recurringService.cancelSeries(id, req.user);
  }
}
