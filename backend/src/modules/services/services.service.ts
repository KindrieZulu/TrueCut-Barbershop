import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllActive() {
    return this.prisma.service.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findAll() {
    return this.prisma.service.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const service = await this.prisma.service.findUnique({ where: { id } });
    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }
    return service;
  }

  async create(data: { name: string; description: string; price: number; durationMinutes: number }) {
    return this.prisma.service.create({
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        durationMinutes: data.durationMinutes,
      },
    });
  }

  async update(id: string, data: Partial<{ name: string; description: string; price: number; durationMinutes: number; isActive: boolean }>) {
    await this.findOne(id);
    return this.prisma.service.update({
      where: { id },
      data,
    });
  }
}
