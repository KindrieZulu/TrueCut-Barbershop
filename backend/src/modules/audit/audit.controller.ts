import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { UserRole } from '@prisma/client';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';

@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  // System/technical audit logs are a developer/infra concern, not a
  // business-operations one - Company Admin gets revenue/activity reports
  // instead (see ReportsController), this stays System Admin only.
  @Roles(UserRole.SYSTEM_ADMIN)
  async getAuditLogs(@Query() query: AuditLogQueryDto) {
    return this.auditService.getLogs(query.branchId, query.action, query.page, query.limit);
  }
}
