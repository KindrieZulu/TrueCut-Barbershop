import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UserRole } from '@prisma/client';

export interface LogAuditDto {
  userId?: string;
  userRole?: UserRole;
  branchId?: string;
  action: string;
  entityName: string;
  entityId?: string;
  beforeState?: any;
  afterState?: any;
  ipAddress?: string;
  correlationId?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async logAction(dto: LogAuditDto) {
    return this.prisma.auditLog.create({
      data: {
        userId: dto.userId || null,
        userRole: dto.userRole || null,
        branchId: dto.branchId || null,
        action: dto.action,
        entityName: dto.entityName,
        entityId: dto.entityId || null,
        beforeState: dto.beforeState ? JSON.parse(JSON.stringify(dto.beforeState)) : undefined,
        afterState: dto.afterState ? JSON.parse(JSON.stringify(dto.afterState)) : undefined,
        ipAddress: dto.ipAddress || null,
        correlationId: dto.correlationId || null,
      },
    });
  }

  async getLogs(branchId?: string, action?: string) {
    const where: any = {};
    if (branchId) where.branchId = branchId;
    if (action) where.action = action;

    return this.prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
