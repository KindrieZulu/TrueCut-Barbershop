import { Controller, Get, Post, Query, Param, Body, UseGuards, Req } from '@nestjs/common';
import { BarbersService } from './barbers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('barbers')
export class BarbersController {
  constructor(private readonly barbersService: BarbersService) {}

  @Get()
  async getEligibleBarbers(
    @Query('branchId') branchId: string,
    @Query('serviceId') serviceId?: string,
  ) {
    return this.barbersService.findEligibleBarbers(branchId, serviceId);
  }

  @Get(':id/schedule')
  async getBarberSchedule(
    @Param('id') barberId: string,
    @Query('branchId') branchId: string,
  ) {
    return this.barbersService.getBarberSchedule(barberId, branchId);
  }

  @Post(':id/block-out')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BARBER, UserRole.COMPANY_ADMIN, UserRole.SYSTEM_ADMIN)
  async addBlockOut(
    @Param('id') barberId: string,
    @Body('branchId') branchId: string,
    @Body('startTime') startTimeStr: string,
    @Body('endTime') endTimeStr: string,
    @Body('reason') reason: string,
  ) {
    return this.barbersService.addBlockOut(
      barberId,
      branchId,
      new Date(startTimeStr),
      new Date(endTimeStr),
      reason,
    );
  }

  @Get('me/appointments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BARBER)
  async getMyTodayAppointments(@Req() req: any) {
    return this.barbersService.getBarberAppointmentsForToday(req.user.id);
  }
}
