import { Test, TestingModule } from '@nestjs/testing';
import { BarbersService } from '../modules/barbers/barbers.service';
import { PrismaService } from '../database/prisma.service';

describe('BarbersService.getBranchOccupancy', () => {
  let service: BarbersService;
  let prismaMock: any;

  const now = new Date('2026-09-18T14:00:00.000Z');

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(now);
    prismaMock = { user: { findMany: jest.fn() } };

    const module: TestingModule = await Test.createTestingModule({
      providers: [BarbersService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    service = module.get(BarbersService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('classifies a booking spanning right now as the current client, not upcoming', async () => {
    const inProgress = {
      id: 'b1',
      bookingCode: 'TC-1',
      startTime: new Date('2026-09-18T13:45:00.000Z'),
      endTime: new Date('2026-09-18T14:15:00.000Z'),
      client: { name: 'Client A', phone: '+2631' },
      service: { name: 'Cut' },
    };
    prismaMock.user.findMany.mockResolvedValue([
      { id: 'barber-1', name: 'Tinashe', barberBookings: [inProgress] },
    ]);

    const result = await service.getBranchOccupancy('branch-1');

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('WITH_CLIENT');
    expect(result[0].currentBooking?.bookingCode).toBe('TC-1');
    expect(result[0].upcomingBookings).toHaveLength(0);
  });

  it('classifies a booking starting later (within the lookahead window) as upcoming, not current', async () => {
    const upcoming = {
      id: 'b2',
      bookingCode: 'TC-2',
      startTime: new Date('2026-09-18T15:00:00.000Z'),
      endTime: new Date('2026-09-18T15:30:00.000Z'),
      client: { name: 'Client B', phone: '+2632' },
      service: { name: 'Beard Trim' },
    };
    prismaMock.user.findMany.mockResolvedValue([
      { id: 'barber-2', name: 'Farai', barberBookings: [upcoming] },
    ]);

    const result = await service.getBranchOccupancy('branch-1');

    expect(result[0].status).toBe('FREE');
    expect(result[0].currentBooking).toBeNull();
    expect(result[0].upcomingBookings).toHaveLength(1);
    expect(result[0].upcomingBookings[0].bookingCode).toBe('TC-2');
  });

  it('reports FREE with no bookings for a barber with nothing in the window', async () => {
    prismaMock.user.findMany.mockResolvedValue([{ id: 'barber-3', name: 'Blessing', barberBookings: [] }]);

    const result = await service.getBranchOccupancy('branch-1');

    expect(result[0].status).toBe('FREE');
    expect(result[0].currentBooking).toBeNull();
    expect(result[0].upcomingBookings).toHaveLength(0);
  });

  it('queries with the correct 2-hour lookahead window and CONFIRMED-only filter', async () => {
    prismaMock.user.findMany.mockResolvedValue([]);

    await service.getBranchOccupancy('branch-1');

    const call = prismaMock.user.findMany.mock.calls[0][0];
    const bookingsFilter = call.select.barberBookings.where;
    expect(bookingsFilter.status).toBe('CONFIRMED');
    expect(bookingsFilter.branchId).toBe('branch-1');
    expect(bookingsFilter.endTime.gt.getTime()).toBe(now.getTime());
    expect(bookingsFilter.startTime.lt.getTime()).toBe(now.getTime() + 2 * 60 * 60 * 1000);
  });
});
