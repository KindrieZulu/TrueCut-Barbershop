import { Controller, Get, Post, Param, Query, Body, UseGuards, Req } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post('from-hold')
  @UseGuards(JwtAuthGuard)
  async createFromHold(@Req() req: any, @Body('holdToken') holdToken: string) {
    const receptionistId = req.user.role === UserRole.RECEPTIONIST ? req.user.id : undefined;
    return this.bookingsService.createBookingFromHold(holdToken, receptionistId);
  }

  @Get('client')
  @UseGuards(JwtAuthGuard)
  async getMyBookings(@Req() req: any) {
    return this.bookingsService.getClientBookings(req.user.id);
  }

  @Get('branch/today')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RECEPTIONIST, UserRole.COMPANY_ADMIN, UserRole.SYSTEM_ADMIN)
  async getBranchTodayBookings(@Query('branchId') branchId: string) {
    return this.bookingsService.getBranchTodayBookings(branchId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getBookingById(@Req() req: any, @Param('id') id: string) {
    return this.bookingsService.getBookingById(id, req.user);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelBooking(@Req() req: any, @Param('id') id: string) {
    return this.bookingsService.cancelBooking(id, req.user.id, req.user);
  }

  @Post(':id/reschedule')
  @UseGuards(JwtAuthGuard)
  async rescheduleBooking(
    @Req() req: any,
    @Param('id') id: string,
    @Body('newHoldToken') newHoldToken: string,
  ) {
    return this.bookingsService.rescheduleBooking(id, newHoldToken, req.user.id);
  }

  @Post(':id/serve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BARBER, UserRole.RECEPTIONIST, UserRole.COMPANY_ADMIN)
  async markAsServed(@Param('id') id: string) {
    return this.bookingsService.markAsServed(id);
  }
}
