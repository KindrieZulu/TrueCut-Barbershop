import { Controller, Post, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { BookingHoldsService } from './booking-holds.service';
import { CreateHoldRequestDto } from './dto/create-hold-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('booking-holds')
export class BookingHoldsController {
  constructor(private readonly holdsService: BookingHoldsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createHold(@Req() req: any, @Body() body: CreateHoldRequestDto) {
    return this.holdsService.createHold({
      ...body,
      clientId: req.user.id,
      isSqueezeIn: false,
    });
  }

  @Delete(':holdToken')
  @UseGuards(JwtAuthGuard)
  async cancelHold(@Param('holdToken') holdToken: string) {
    return this.holdsService.cancelHold(holdToken);
  }
}
