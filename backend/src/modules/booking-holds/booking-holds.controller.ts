import { Controller, Post, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { BookingHoldsService, CreateHoldDto } from './booking-holds.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('booking-holds')
export class BookingHoldsController {
  constructor(private readonly holdsService: BookingHoldsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createHold(@Req() req: any, @Body() body: Omit<CreateHoldDto, 'clientId'>) {
    return this.holdsService.createHold({
      ...body,
      clientId: req.user.id,
    });
  }

  @Delete(':holdToken')
  @UseGuards(JwtAuthGuard)
  async cancelHold(@Param('holdToken') holdToken: string) {
    return this.holdsService.cancelHold(holdToken);
  }
}
