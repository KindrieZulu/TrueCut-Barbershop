import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UserRole, BookingStatus } from '@prisma/client';
import { addHours } from 'date-fns';

const OCCUPANCY_LOOKAHEAD_HOURS = 2;

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

    // This listing is deliberately public (used during the pre-login booking
    // wizard to let a visitor pick a barber before creating an account), so
    // it must not include contact PII the frontend never even displays.
    const barbers = await this.prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
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

  async addBlockOut(
    barberId: string,
    branchId: string,
    startTime: Date,
    endTime: Date,
    reason: string,
    requestingUser: { id: string; role: string },
  ) {
    // A barber may only block out their own schedule; admins may act on any barber.
    if (requestingUser.role === UserRole.BARBER && requestingUser.id !== barberId) {
      throw new ForbiddenException('Cannot modify the schedule of another barber');
    }

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

  /**
   * For every active barber at a branch: who they are currently serving
   * (a CONFIRMED booking spanning right now) and who is booked in the next
   * two hours. One query covering both windows (startTime < lookahead AND
   * endTime > now already captures "in progress" bookings too), split into
   * current/upcoming in memory afterward rather than querying per barber.
   */
  async getBranchOccupancy(branchId: string) {
    const now = new Date();
    const lookaheadEnd = addHours(now, OCCUPANCY_LOOKAHEAD_HOURS);

    const barbers = await this.prisma.user.findMany({
      where: {
        role: UserRole.BARBER,
        isActive: true,
        staffBranches: { some: { branchId } },
      },
      select: {
        id: true,
        name: true,
        barberBookings: {
          where: {
            status: BookingStatus.CONFIRMED,
            branchId,
            startTime: { lt: lookaheadEnd },
            endTime: { gt: now },
          },
          select: {
            id: true,
            bookingCode: true,
            startTime: true,
            endTime: true,
            client: { select: { name: true, phone: true } },
            service: { select: { name: true } },
          },
          orderBy: { startTime: 'asc' },
        },
      },
    });

    return barbers.map((b) => {
      const current = b.barberBookings.find((bk) => bk.startTime <= now && bk.endTime > now) || null;
      const upcoming = b.barberBookings.filter((bk) => bk.startTime > now);

      return {
        barberId: b.id,
        name: b.name,
        status: current ? 'WITH_CLIENT' : 'FREE',
        currentBooking: current,
        upcomingBookings: upcoming,
      };
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

  // Companion to getBarberAppointmentsForToday - that view is an action
  // list (CONFIRMED/HELD only), so a booking a barber never marked served
  // simply vanishes once the no-show sweep (see JobsService) flips it to
  // NO_SHOW - there was previously no way for the barber to see what
  // happened to it. This surfaces today's terminal-status bookings instead.
  async getBarberHistoryForToday(barberId: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    return this.prisma.booking.findMany({
      where: {
        barberId,
        startTime: { gte: todayStart, lte: todayEnd },
        status: { in: ['SERVED', 'NO_SHOW', 'CANCELLED'] },
      },
      include: {
        client: { select: { id: true, name: true, phone: true } },
        service: true,
        branch: { select: { id: true, name: true, address: true } },
      },
      orderBy: { startTime: 'desc' },
    });
  }
}
