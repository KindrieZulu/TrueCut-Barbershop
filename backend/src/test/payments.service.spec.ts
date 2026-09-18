import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from '../modules/payments/payments.service';
import { PrismaService } from '../database/prisma.service';
import { PaynowEcoCashAdapter } from '../modules/payments/adapters/paynow-ecocash.adapter';
import { LedgerService } from '../modules/ledger/ledger.service';
import { EventsService } from '../modules/events/events.service';
import { BookingStatus, PaymentStatus, PaymentType } from '@prisma/client';

// Regression test: BookingWizard (the client-facing booking flow) used to
// call POST /payments/:id/confirm directly after initiating a Paynow/EcoCash
// payment, but that endpoint is intentionally staff-only - a client must
// never be able to mark its own payment as PAID. That made the entire
// self-service online payment flow 403 for every real client, caught only
// by manually testing the UI. The fix: since PaynowEcoCashAdapter has no
// real gateway integration and always reports success synchronously,
// initiatePayment now confirms server-side immediately for a successful
// adapter response, the same way the CASH branch already does.
describe('PaymentsService.initiatePayment (Paynow/EcoCash auto-confirm)', () => {
  let service: PaymentsService;
  let prismaMock: any;
  let paynowMock: any;

  const booking = {
    id: 'booking-1',
    bookingCode: 'TC-1',
    status: BookingStatus.HELD,
    barberId: 'barber-1',
    branchId: 'branch-1',
    startTime: new Date(),
    serviceFee: 15,
    bookingFee: 2,
    emergencyFee: 0,
    squeezeInFee: 0,
    houseCallFee: 0,
    totalAmount: 17,
    client: { phone: '+263771111111' },
  };

  beforeEach(async () => {
    prismaMock = {
      payment: {
        findUnique: jest.fn().mockResolvedValue(null), // no existing idempotent payment
        create: jest.fn(),
        update: jest.fn(),
      },
      booking: {
        findUnique: jest.fn().mockResolvedValue(booking),
        update: jest.fn().mockResolvedValue({ ...booking, status: BookingStatus.CONFIRMED }),
      },
      bookingSlot: { create: jest.fn().mockResolvedValue({}) },
      paymentLedger: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn((fn) => fn(prismaMock)),
    };

    paynowMock = {
      initiatePayment: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: PaynowEcoCashAdapter, useValue: paynowMock },
        { provide: LedgerService, useValue: {} },
        { provide: EventsService, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get(PaymentsService);
  });

  it('confirms the booking immediately when the mock adapter reports success', async () => {
    paynowMock.initiatePayment.mockResolvedValue({
      success: true,
      providerReference: 'PAYNOW-ABC123',
      instructions: 'USSD push prompt sent.',
    });

    const createdPayment = { id: 'payment-1', status: PaymentStatus.PENDING, providerReference: 'PAYNOW-ABC123' };
    prismaMock.payment.create.mockResolvedValue(createdPayment);
    prismaMock.payment.findUnique
      .mockResolvedValueOnce(null) // idempotency check
      .mockResolvedValueOnce({ ...createdPayment, booking }); // inside confirmPayment
    prismaMock.payment.update.mockResolvedValue({ ...createdPayment, status: PaymentStatus.PAID });

    const result: any = await service.initiatePayment('booking-1', '+263771111111', PaymentType.ECOCASH, 'idem-1');

    // The booking got confirmed via the same transactional path CASH uses.
    expect(prismaMock.bookingSlot.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: BookingStatus.CONFIRMED } }),
    );
    expect(prismaMock.paymentLedger.create).toHaveBeenCalledTimes(1);

    // The payment returned to the client already reflects PAID, not PENDING -
    // there is no follow-up confirm call for the frontend to make.
    expect(result.payment.status).toBe(PaymentStatus.PAID);
    expect(result.instructions).toBe('USSD push prompt sent.');
  });

  it('does not confirm the booking when the adapter reports failure', async () => {
    paynowMock.initiatePayment.mockResolvedValue({
      success: false,
      providerReference: '',
      error: 'Gateway unreachable',
    });

    const createdPayment = { id: 'payment-2', status: PaymentStatus.PENDING };
    prismaMock.payment.create.mockResolvedValue(createdPayment);

    const result: any = await service.initiatePayment('booking-1', '+263771111111', PaymentType.ECOCASH, 'idem-2');

    expect(prismaMock.bookingSlot.create).not.toHaveBeenCalled();
    expect(prismaMock.booking.update).not.toHaveBeenCalled();
    expect(result.payment.status).toBe(PaymentStatus.PENDING);
  });
});
