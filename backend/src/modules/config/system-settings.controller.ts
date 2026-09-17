import { Controller, Get, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { SystemSettingsService } from './system-settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('config')
export class SystemSettingsController {
  constructor(private readonly settingsService: SystemSettingsService) {}

  @Get()
  async getAllSettings() {
    return this.settingsService.getAll();
  }

  @Patch(':key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY_ADMIN, UserRole.SYSTEM_ADMIN)
  async updateSetting(@Param('key') key: string, @Body('value') value: string) {
    return this.settingsService.updateSetting(key, String(value));
  }
}
