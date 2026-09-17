import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        staffBranches: {
          include: { branch: true },
        },
      },
    });
    if (!user) {
      throw new NotFoundException('User profile not found');
    }
    return user;
  }

  async findByPhone(phone: string) {
    return this.prisma.user.findUnique({
      where: { phone },
      select: { id: true, name: true, phone: true, email: true, role: true },
    });
  }

  async searchClients(query: string) {
    return this.prisma.user.findMany({
      where: {
        role: 'CLIENT',
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query } },
        ],
      },
      take: 10,
      select: { id: true, name: true, phone: true, email: true },
    });
  }
}
