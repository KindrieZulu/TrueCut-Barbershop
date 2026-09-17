import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllActive() {
    const branches = await this.prisma.branch.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    const now = new Date();
    const harareTimeStr = now.toLocaleTimeString('en-US', { timeZone: 'Africa/Harare', hour12: false });
    const currentHourMin = harareTimeStr.substring(0, 5);

    return branches.map((b) => {
      // openTime <= closeTime: normal same-day hours (e.g. 08:00-18:00).
      // openTime > closeTime: overnight hours (e.g. 20:00-02:00) - open if
      // current time is after opening OR before closing, not both at once.
      const isOpenNow = b.openTime <= b.closeTime
        ? currentHourMin >= b.openTime && currentHourMin <= b.closeTime
        : currentHourMin >= b.openTime || currentHourMin <= b.closeTime;
      return {
        ...b,
        isOpenNow,
        currentHarareTime: harareTimeStr,
      };
    });
  }

  async findOne(id: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      include: {
        staff: {
          include: {
            user: { select: { id: true, name: true, phone: true, role: true } },
          },
        },
      },
    });
    if (!branch) {
      throw new NotFoundException(`Branch with ID ${id} not found`);
    }
    return branch;
  }

  async create(data: { name: string; code: string; address: string; city?: string; phone: string; openTime?: string; closeTime?: string }) {
    return this.prisma.branch.create({
      data: {
        name: data.name,
        code: data.code,
        address: data.address,
        city: data.city || 'Harare',
        phone: data.phone,
        openTime: data.openTime || '08:00',
        closeTime: data.closeTime || '18:00',
      },
    });
  }

  async update(id: string, data: Partial<{ name: string; address: string; phone: string; isActive: boolean; openTime: string; closeTime: string }>) {
    await this.findOne(id);
    return this.prisma.branch.update({
      where: { id },
      data,
    });
  }
}
