import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateStaffDirectoryEntryDto } from './dto/create-staff-directory-entry.dto';

@Injectable()
export class StaffDirectoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateStaffDirectoryEntryDto, registeredBy: string) {
    return this.prisma.staffDirectoryEntry.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        roleLabel: dto.roleLabel,
        branchId: dto.branchId,
        registeredBy,
      },
    });
  }

  async findAll(branchId?: string) {
    return this.prisma.staffDirectoryEntry.findMany({
      where: branchId ? { branchId } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }
}
