import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { startOfDay, endOfDay, subDays } from 'date-fns';
import { BookingStatus } from '@prisma/client';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async generateFinancialReport(branchId?: string, date: Date = new Date()) {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    const whereLedger: any = {
      createdAt: { gte: dayStart, lte: dayEnd },
    };
    if (branchId) whereLedger.branchId = branchId;

    const ledgers = await this.prisma.paymentLedger.findMany({
      where: whereLedger,
      include: {
        booking: { include: { barber: { select: { id: true, name: true } } } },
      },
    });

    let totalServiceRevenue = 0;
    let totalBookingFeeRevenue = 0;
    let totalEmergencyFeeRevenue = 0;
    let totalSqueezeInRevenue = 0;
    let totalHouseCallRevenue = 0;
    let totalRefunds = 0;
    let totalPenalties = 0;
    let totalNetRevenue = 0;

    const revenuePerBarber: Record<string, { name: string; total: number }> = {};

    for (const entry of ledgers) {
      const net = Number(entry.totalNet);
      totalNetRevenue += net;

      totalServiceRevenue += Number(entry.serviceAmount);
      totalBookingFeeRevenue += Number(entry.bookingFee);
      totalEmergencyFeeRevenue += Number(entry.emergencyFee);
      totalSqueezeInRevenue += Number(entry.squeezeInFee);
      totalHouseCallRevenue += Number(entry.houseCallFee);
      totalPenalties += Number(entry.penaltyAmount);

      if (net < 0) {
        totalRefunds += Math.abs(net);
      }

      const barberId = entry.booking?.barber?.id;
      const barberName = entry.booking?.barber?.name || 'Unknown Barber';

      if (barberId) {
        if (!revenuePerBarber[barberId]) {
          revenuePerBarber[barberId] = { name: barberName, total: 0 };
        }
        revenuePerBarber[barberId].total += net;
      }
    }

    const reportData = {
      reportDate: dayStart.toISOString(),
      branchId: branchId || 'CONSOLIDATED',
      totalNetRevenue,
      breakdown: {
        serviceRevenue: totalServiceRevenue,
        bookingFeeRevenue: totalBookingFeeRevenue,
        emergencyFeeRevenue: totalEmergencyFeeRevenue,
        squeezeInRevenue: totalSqueezeInRevenue,
        houseCallRevenue: totalHouseCallRevenue,
        penaltiesCollected: totalPenalties,
        refundsIssued: totalRefunds,
      },
      revenuePerBarber,
      totalTransactionsCount: ledgers.length,
    };

    // Store in daily_reports
    await this.prisma.dailyReport.create({
      data: {
        branchId: branchId || null,
        reportDate: dayStart,
        reportType: 'FINANCIAL',
        reportData,
      },
    });

    return reportData;
  }

  /**
   * Revenue + per-barber activity for the 7 days ending on weekEndDate
   * (inclusive) - what the user asked for as "the logs for all the revenue
   * that has been generated, all the activities that has happened to the
   * barber" at the end of the week. Distinct from AuditController's
   * technical/system audit trail, which stays System Admin only - this is
   * a business-operations report for Company Admin.
   */
  async generateWeeklyReport(branchId?: string, weekEndDate: Date = new Date()) {
    const weekEnd = endOfDay(weekEndDate);
    const weekStart = startOfDay(subDays(weekEndDate, 6));

    const whereLedger: any = { createdAt: { gte: weekStart, lte: weekEnd } };
    if (branchId) whereLedger.branchId = branchId;

    const ledgers = await this.prisma.paymentLedger.findMany({
      where: whereLedger,
      include: {
        booking: { include: { barber: { select: { id: true, name: true } } } },
      },
    });

    let totalServiceRevenue = 0;
    let totalBookingFeeRevenue = 0;
    let totalEmergencyFeeRevenue = 0;
    let totalSqueezeInRevenue = 0;
    let totalHouseCallRevenue = 0;
    let totalRefunds = 0;
    let totalPenalties = 0;
    let totalNetRevenue = 0;

    const revenuePerBarber: Record<string, { name: string; total: number }> = {};

    for (const entry of ledgers) {
      const net = Number(entry.totalNet);
      totalNetRevenue += net;

      totalServiceRevenue += Number(entry.serviceAmount);
      totalBookingFeeRevenue += Number(entry.bookingFee);
      totalEmergencyFeeRevenue += Number(entry.emergencyFee);
      totalSqueezeInRevenue += Number(entry.squeezeInFee);
      totalHouseCallRevenue += Number(entry.houseCallFee);
      totalPenalties += Number(entry.penaltyAmount);

      if (net < 0) {
        totalRefunds += Math.abs(net);
      }

      const barberId = entry.booking?.barber?.id;
      const barberName = entry.booking?.barber?.name || 'Unknown Barber';

      if (barberId) {
        if (!revenuePerBarber[barberId]) {
          revenuePerBarber[barberId] = { name: barberName, total: 0 };
        }
        revenuePerBarber[barberId].total += net;
      }
    }

    const whereBooking: any = { startTime: { gte: weekStart, lte: weekEnd } };
    if (branchId) whereBooking.branchId = branchId;

    const bookings = await this.prisma.booking.findMany({
      where: whereBooking,
      include: { barber: { select: { id: true, name: true } } },
    });

    const activityPerBarber: Record<
      string,
      { name: string; served: number; cancelled: number; noShow: number; confirmedUpcoming: number }
    > = {};

    for (const b of bookings) {
      const barberId = b.barberId;
      if (!activityPerBarber[barberId]) {
        activityPerBarber[barberId] = {
          name: b.barber.name,
          served: 0,
          cancelled: 0,
          noShow: 0,
          confirmedUpcoming: 0,
        };
      }
      if (b.status === BookingStatus.SERVED) activityPerBarber[barberId].served++;
      else if (b.status === BookingStatus.CANCELLED) activityPerBarber[barberId].cancelled++;
      else if (b.status === BookingStatus.NO_SHOW) activityPerBarber[barberId].noShow++;
      else if (b.status === BookingStatus.CONFIRMED) activityPerBarber[barberId].confirmedUpcoming++;
    }

    return {
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      branchId: branchId || 'CONSOLIDATED',
      totalNetRevenue,
      breakdown: {
        serviceRevenue: totalServiceRevenue,
        bookingFeeRevenue: totalBookingFeeRevenue,
        emergencyFeeRevenue: totalEmergencyFeeRevenue,
        squeezeInRevenue: totalSqueezeInRevenue,
        houseCallRevenue: totalHouseCallRevenue,
        penaltiesCollected: totalPenalties,
        refundsIssued: totalRefunds,
      },
      revenuePerBarber,
      activityPerBarber,
      totalTransactionsCount: ledgers.length,
      totalBookingsCount: bookings.length,
    };
  }

  async generateSystemReport(branchId?: string, date: Date = new Date()) {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    const whereBooking: any = {
      startTime: { gte: dayStart, lte: dayEnd },
    };
    if (branchId) whereBooking.branchId = branchId;

    const bookings = await this.prisma.booking.findMany({
      where: whereBooking,
    });

    const bookingsByType: Record<string, number> = {};
    const bookingsByStatus: Record<string, number> = {};
    let walkInCount = 0;
    let onlineCount = 0;
    let squeezeInCount = 0;

    for (const b of bookings) {
      bookingsByType[b.bookingType] = (bookingsByType[b.bookingType] || 0) + 1;
      bookingsByStatus[b.status] = (bookingsByStatus[b.status] || 0) + 1;

      if (b.receptionistId) {
        walkInCount++;
      } else {
        onlineCount++;
      }

      if (b.isSqueezeIn) {
        squeezeInCount++;
      }
    }

    return {
      reportDate: dayStart.toISOString(),
      branchId: branchId || 'CONSOLIDATED',
      totalBookings: bookings.length,
      walkInCount,
      onlineCount,
      squeezeInCount,
      bookingsByType,
      bookingsByStatus,
    };
  }
}
