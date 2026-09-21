import { Controller, Get, Post, Body, Query, UseGuards, Req } from '@nestjs/common';
import { StaffDirectoryService } from './staff-directory.service';
import { CreateStaffDirectoryEntryDto } from './dto/create-staff-directory-entry.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { UserRole } from '@prisma/client';

// Record-keeping only for support staff who never log into the system
// (cleaners, security, maintenance, etc.) - see StaffDirectoryEntry in
// schema.prisma. Distinct from /auth/register, which creates a real User
// account with login credentials for Company Admins, Receptionists, and
// Barbers.
@Controller('staff-directory')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.COMPANY_ADMIN, UserRole.SYSTEM_ADMIN)
export class StaffDirectoryController {
  constructor(private readonly staffDirectoryService: StaffDirectoryService) {}

  @Post()
  async create(@Req() req: any, @Body() dto: CreateStaffDirectoryEntryDto) {
    return this.staffDirectoryService.create(dto, req.user.id);
  }

  @Get()
  async findAll(@Query('branchId') branchId?: string) {
    return this.staffDirectoryService.findAll(branchId);
  }
}
