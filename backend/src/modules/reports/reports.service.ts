import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { startOfDay, endOfDay } from 'date-fns';

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
