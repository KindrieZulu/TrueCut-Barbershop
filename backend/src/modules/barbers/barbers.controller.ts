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

  @Get('occupancy')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RECEPTIONIST, UserRole.COMPANY_ADMIN, UserRole.SYSTEM_ADMIN)
  async getBranchOccupancy(@Query('branchId') branchId: string) {
    return this.barbersService.getBranchOccupancy(branchId);
  }

  @Get(':id/schedule')
  @UseGuards(JwtAuthGuard)
  async getBarberSchedule(
    @Param('id') barberId: string,
    @Query('branchId') branchId: string,
  ) {
    return this.barbersService.getBarberSchedule(barberId, branchId);
  }

  // Registered before ':id/block-out' so 'me' is matched literally rather
  // than falling through to the :id param route (which is what was
  // happening before - the frontend always calls this literal path).
  @Post('me/block-out')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BARBER)
  async addOwnBlockOut(
    @Req() req: any,
    @Body('branchId') branchId: string,
    @Body('startTime') startTimeStr: string,
    @Body('endTime') endTimeStr: string,
    @Body('reason') reason: string,
  ) {
    return this.barbersService.addBlockOut(
      req.user.id,
      branchId,
      new Date(startTimeStr),
      new Date(endTimeStr),
      reason,
      req.user,
    );
  }

  @Post(':id/block-out')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BARBER, UserRole.COMPANY_ADMIN, UserRole.SYSTEM_ADMIN)
  async addBlockOut(
    @Req() req: any,
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
      req.user,
    );
  }

  @Get('me/appointments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BARBER)
  async getMyTodayAppointments(@Req() req: any) {
    return this.barbersService.getBarberAppointmentsForToday(req.user.id);
  }
}
