import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ReceptionistService } from './receptionist.service';
import { WalkInRegisterDto } from './dto/walk-in-register.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('receptionist')
export class ReceptionistController {
  constructor(private readonly receptionistService: ReceptionistService) {}

  @Post('walk-in')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RECEPTIONIST, UserRole.COMPANY_ADMIN, UserRole.SYSTEM_ADMIN)
  async processWalkIn(@Req() req: any, @Body() body: WalkInRegisterDto) {
    return this.receptionistService.processWalkInBooking(req.user.id, body);
  }
}
