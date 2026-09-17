import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class BarbersService {
  constructor(private readonly prisma: PrismaService) {}

  async findEligibleBarbers(branchId: string, serviceId?: string) {
    const whereClause: any = {
      role: UserRole.BARBER,
      isActive: true,
      staffBranches: {
        some: { branchId },
      },
    };

    if (serviceId) {
      whereClause.barberServices = {
        some: { serviceId },
      };
    }

    const barbers = await this.prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        barberServices: {
          select: {
            service: { select: { id: true, name: true, durationMinutes: true, price: true } },
          },
        },
        barberSchedules: {
          where: { branchId },
        },
      },
    });

    return barbers;
  }

  async getBarberSchedule(barberId: string, branchId: string) {
    const schedules = await this.prisma.barberSchedule.findMany({
      where: { barberId, branchId },
    });

    const blockOuts = await this.prisma.barberBlockOut.findMany({
      where: {
        barberId,
        branchId,
        endTime: { gte: new Date() },
      },
      orderBy: { startTime: 'asc' },
    });

    return { schedules, blockOuts };
  }

  async addBlockOut(barberId: string, branchId: string, startTime: Date, endTime: Date, reason: string) {
    return this.prisma.barberBlockOut.create({
      data: {
        barberId,
        branchId,
        startTime,
        endTime,
        reason,
      },
    });
  }

  async getBarberAppointmentsForToday(barberId: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    return this.prisma.booking.findMany({
      where: {
        barberId,
        startTime: { gte: todayStart, lte: todayEnd },
        status: { in: ['CONFIRMED', 'HELD'] },
      },
      include: {
        client: { select: { id: true, name: true, phone: true } },
        service: true,
        branch: { select: { id: true, name: true, address: true } },
      },
      orderBy: { startTime: 'asc' },
    });
  }
}
