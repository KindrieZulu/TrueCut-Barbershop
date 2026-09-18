import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from '../modules/reports/reports.service';
import { PrismaService } from '../database/prisma.service';
import { startOfDay, endOfDay, subDays } from 'date-fns';

describe('ReportsService.generateWeeklyReport', () => {
  let service: ReportsService;
  let prismaMock: any;

  beforeEach(async () => {
    prismaMock = {
      paymentLedger: { findMany: jest.fn() },
      booking: { findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ReportsService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    service = module.get(ReportsService);
  });

  it('covers a 7-day window ending on the given date (inclusive)', async () => {
    prismaMock.paymentLedger.findMany.mockResolvedValue([]);
    prismaMock.booking.findMany.mockResolvedValue([]);

    const weekEndDate = new Date('2026-09-18T12:00:00.000Z');
    await service.generateWeeklyReport('branch-1', weekEndDate);

    const ledgerCall = prismaMock.paymentLedger.findMany.mock.calls[0][0];
    const gte: Date = ledgerCall.where.createdAt.gte;
    const lte: Date = ledgerCall.where.createdAt.lte;

    // Computed the same way the service does (startOfDay/endOfDay run in the
    // server's local timezone, same as the existing daily report), so this
    // stays correct regardless of which timezone the test runs in.
    expect(gte.getTime()).toBe(startOfDay(subDays(weekEndDate, 6)).getTime());
    expect(lte.getTime()).toBe(endOfDay(weekEndDate).getTime());
    // 7-day window, inclusive of both ends.
    expect(Math.round((lte.getTime() - gte.getTime()) / (1000 * 60 * 60 * 24))).toBe(7);
  });

  it('sums revenue and splits it per barber from ledger entries', async () => {
    prismaMock.paymentLedger.findMany.mockResolvedValue([
      {
        totalNet: 17, serviceAmount: 15, bookingFee: 2, emergencyFee: 0, squeezeInFee: 0,
        houseCallFee: 0, penaltyAmount: 0,
        booking: { barber: { id: 'b1', name: 'Tinashe' } },
      },
      {
        totalNet: 25, serviceAmount: 22, bookingFee: 3, emergencyFee: 0, squeezeInFee: 0,
        houseCallFee: 0, penaltyAmount: 0,
        booking: { barber: { id: 'b2', name: 'Farai' } },
      },
      {
        // A refund: negative net, should count toward refundsIssued.
        totalNet: -10, serviceAmount: -10, bookingFee: 0, emergencyFee: 0, squeezeInFee: 0,
        houseCallFee: 0, penaltyAmount: 0,
        booking: { barber: { id: 'b1', name: 'Tinashe' } },
      },
    ]);
    prismaMock.booking.findMany.mockResolvedValue([]);

    const result = await service.generateWeeklyReport();

    expect(result.totalNetRevenue).toBe(32);
    expect(result.breakdown.refundsIssued).toBe(10);
    expect(result.revenuePerBarber['b1']).toEqual({ name: 'Tinashe', total: 7 });
    expect(result.revenuePerBarber['b2']).toEqual({ name: 'Farai', total: 25 });
  });

  it('classifies barber activity by booking status', async () => {
    prismaMock.paymentLedger.findMany.mockResolvedValue([]);
    prismaMock.booking.findMany.mockResolvedValue([
      { barberId: 'b1', status: 'SERVED', barber: { name: 'Tinashe' } },
      { barberId: 'b1', status: 'SERVED', barber: { name: 'Tinashe' } },
      { barberId: 'b1', status: 'CANCELLED', barber: { name: 'Tinashe' } },
      { barberId: 'b1', status: 'NO_SHOW', barber: { name: 'Tinashe' } },
      { barberId: 'b1', status: 'CONFIRMED', barber: { name: 'Tinashe' } },
      { barberId: 'b2', status: 'SERVED', barber: { name: 'Farai' } },
    ]);

    const result = await service.generateWeeklyReport();

    expect(result.activityPerBarber['b1']).toEqual({
      name: 'Tinashe', served: 2, cancelled: 1, noShow: 1, confirmedUpcoming: 1,
    });
    expect(result.activityPerBarber['b2']).toEqual({
      name: 'Farai', served: 1, cancelled: 0, noShow: 0, confirmedUpcoming: 0,
    });
    expect(result.totalBookingsCount).toBe(6);
  });
});
