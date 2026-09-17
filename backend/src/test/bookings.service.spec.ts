import { Test, TestingModule } from '@nestjs/testing';
import { BookingsService } from '../modules/bookings/bookings.service';
import { PrismaService } from '../database/prisma.service';
import { SystemSettingsService } from '../modules/config/system-settings.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { BookingStatus, BookingType } from '@prisma/client';

describe('BookingsService Unit Tests', () => {
  let bookingsService: BookingsService;
  let prismaMock: any;
  let settingsMock: any;

  beforeEach(async () => {
    prismaMock = {
      booking: {
        count: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      bookingHold: {
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn((promises) => Promise.all(promises)),
    };

    settingsMock = {
      getNumber: jest.fn((key: string, defaultValue: number) => {
        if (key === 'regular_customer_min_bookings') return 5;
        if (key === 'regular_customer_period_days') return 60;
        if (key === 'booking_fee') return 2;
        if (key === 'emergency_fee') return 10;
        if (key === 'house_call_fee') return 5;
        if (key === 'squeeze_in_fee') return 3;
        if (key === 'cancellation_cutoff_minutes') return 120;
        if (key === 'penalty_fee') return 3;
        if (key === 'no_show_grace_minutes') return 15;
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: SystemSettingsService, useValue: settingsMock },
      ],
    }).compile();

    bookingsService = module.get<BookingsService>(BookingsService);
  });

  describe('evaluateRegularCustomerEligibility', () => {
    it('should return true if completed bookings count >= 5 in last 60 days', async () => {
      prismaMock.booking.count.mockResolvedValue(5);
      const isEligible = await bookingsService.evaluateRegularCustomerEligibility('client1');
      expect(isEligible).toBe(true);
    });

    it('should return false if completed bookings count < 5', async () => {
      prismaMock.booking.count.mockResolvedValue(3);
      const isEligible = await bookingsService.evaluateRegularCustomerEligibility('client1');
      expect(isEligible).toBe(false);
    });
  });

  describe('createBookingFromHold', () => {
    it('should throw NotFoundException if hold not found', async () => {
      prismaMock.bookingHold.findUnique.mockResolvedValue(null);
      await expect(bookingsService.createBookingFromHold('invalid_token')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if hold is expired', async () => {
      prismaMock.bookingHold.findUnique.mockResolvedValue({
        id: 'hold1',
        expiresAt: new Date(Date.now() - 10000), // expired
      });
      prismaMock.bookingHold.delete.mockResolvedValue({});

      await expect(bookingsService.createBookingFromHold('expired_token')).rejects.toThrow(BadRequestException);
    });

    it('should convert hold into booking and calculate total fee correctly', async () => {
      const now = new Date();
      prismaMock.bookingHold.findUnique.mockResolvedValue({
        id: 'hold1',
        branchId: 'b1',
        clientId: 'c1',
        barberId: 'barber1',
        serviceId: 's1',
        bookingType: BookingType.GENERAL,
        startTime: now,
        endTime: new Date(now.getTime() + 1800000),
        isEmergency: false,
        isSqueezeIn: false,
        houseCallAddress: null,
        expiresAt: new Date(now.getTime() + 300000),
        service: { id: 's1', price: 20 },
      });

      prismaMock.booking.count.mockResolvedValue(2); // Regular eligibility false
      prismaMock.booking.create.mockImplementation(({ data }) => Promise.resolve({ id: 'b_created', ...data }));
      prismaMock.bookingHold.delete.mockResolvedValue({});

      const booking = await bookingsService.createBookingFromHold('valid_token');
      expect(booking.serviceFee).toBe(20);
      expect(booking.bookingFee).toBe(2);
      expect(booking.totalAmount).toBe(22); // $20 + $2 booking fee
      expect(booking.status).toBe(BookingStatus.HELD);
    });
  });

  describe('cancelBooking', () => {
    it('should throw BadRequestException if booking already cancelled', async () => {
      prismaMock.booking.findUnique.mockResolvedValue({
        id: 'b1',
        status: BookingStatus.CANCELLED,
      });

      await expect(bookingsService.cancelBooking('b1', 'user1')).rejects.toThrow(BadRequestException);
    });

    it('should calculate $0 penalty when cancelling >2h before appointment', async () => {
      const futureDate = new Date(Date.now() + 180 * 60 * 1000); // 3 hours in future
      prismaMock.booking.findUnique.mockResolvedValue({
        id: 'b1',
        status: BookingStatus.CONFIRMED,
        startTime: futureDate,
        serviceFee: 20,
        bookingFee: 2,
      });
      prismaMock.booking.update.mockResolvedValue({ id: 'b1', status: BookingStatus.CANCELLED });

      const res = await bookingsService.cancelBooking('b1', 'user1');
      expect(res.refundCalculation.penaltyApplied).toBe(0);
      expect(res.refundCalculation.eligibleRefund).toBe(20);
      expect(res.refundCalculation.bookingFee).toBe(2);
    });

    it('should apply $3 penalty when cancelling <2h before appointment', async () => {
      const nearFutureDate = new Date(Date.now() + 30 * 60 * 1000); // 30 mins in future
      prismaMock.booking.findUnique.mockResolvedValue({
        id: 'b1',
        status: BookingStatus.CONFIRMED,
        startTime: nearFutureDate,
        serviceFee: 20,
        bookingFee: 2,
      });
      prismaMock.booking.update.mockResolvedValue({ id: 'b1', status: BookingStatus.CANCELLED });

      const res = await bookingsService.cancelBooking('b1', 'user1');
      expect(res.refundCalculation.penaltyApplied).toBe(3);
      expect(res.refundCalculation.eligibleRefund).toBe(17); // $20 - $3 penalty
    });
  });

  describe('processNoShows', () => {
    it('should automatically mark past confirmed bookings as NO_SHOW in a single batch update', async () => {
      prismaMock.booking.updateMany.mockResolvedValue({ count: 2 });

      const noShowCount = await bookingsService.processNoShows();
      expect(noShowCount).toBe(2);
      expect(prismaMock.booking.updateMany).toHaveBeenCalledTimes(1);
      expect(prismaMock.booking.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: BookingStatus.CONFIRMED }),
          data: { status: BookingStatus.NO_SHOW },
        }),
      );
    });
  });
});
