import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PaynowEcoCashAdapter } from './adapters/paynow-ecocash.adapter';
import { LedgerService } from '../ledger/ledger.service';
import { BookingStatus, LedgerEntryType, PaymentStatus, PaymentType } from '@prisma/client';

import { EventsService } from '../events/events.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paynowAdapter: PaynowEcoCashAdapter,
    private readonly ledgerService: LedgerService,
    private readonly eventsService: EventsService,
  ) {}

  async initiatePayment(
    bookingId: string,
    phone: string,
    paymentType: PaymentType,
    idempotencyKey: string,
  ) {
    // Check idempotency
    const existingPayment = await this.prisma.payment.findUnique({
      where: { idempotencyKey },
    });

    if (existingPayment) {
      this.logger.log(`[PAYMENT IDEMPOTENT] Returning existing payment record ${existingPayment.id}`);
      return existingPayment;
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { client: true },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${bookingId} not found`);
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Cannot initiate payment for a cancelled booking');
    }

    const amount = Number(booking.totalAmount);

    // Handle Cash Payments (Receptionist Walk-in)
    if (paymentType === PaymentType.CASH) {
      const payment = await this.prisma.payment.create({
        data: {
          bookingId,
          amount,
          paymentType: PaymentType.CASH,
          status: PaymentStatus.PAID,
          idempotencyKey,
          providerReference: `CASH-${Date.now()}`,
        },
      });

      // Confirm Booking
      await this.confirmBookingAndRecordLedger(booking, payment);
      return payment;
    }

    // Initiate via Paynow / EcoCash Adapter
    const initResult = await this.paynowAdapter.initiatePayment(
      amount,
      phone || booking.client.phone,
      idempotencyKey,
      booking.bookingCode,
    );

    const payment = await this.prisma.payment.create({
      data: {
        bookingId,
        amount,
        paymentType,
        status: PaymentStatus.PENDING,
        providerReference: initResult.providerReference,
        idempotencyKey,
      },
    });

    return {
      payment,
      instructions: initResult.instructions,
    };
  }

  /**
   * Confirms payment (from Webhook or Receptionist confirmation) and transitions booking to CONFIRMED
   */
  async confirmPayment(paymentId: string, providerRef?: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { booking: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment record not found');
    }

    if (payment.status === PaymentStatus.PAID) {
      return payment; // Duplicate webhook / call protection
    }

    const updatedPayment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.PAID,
        providerReference: providerRef || payment.providerReference,
      },
    });

    await this.confirmBookingAndRecordLedger(payment.booking, updatedPayment);
    return updatedPayment;
  }

  /**
   * Webhook Handler with idempotency & duplicate protection
   */
  async handleWebhook(payload: any) {
    const signature = payload?.signature || payload?.headers?.['x-signature'] || payload?.headers?.['X-Signature'];

    if (!signature) {
      throw new BadRequestException('Missing payment provider signature');
    }

    const rawBody = (payload as any)?.rawBody;
    const isValidSignature = this.paynowAdapter.verifyWebhookSignature(payload, signature, rawBody ?? JSON.stringify(payload));

    if (!isValidSignature) {
      throw new BadRequestException('Invalid payment provider signature');
    }

    const { providerReference, status, bookingCode } = payload;
    this.logger.log(`[PAYMENT WEBHOOK] ProviderRef: ${providerReference} | Status: ${status} | Code: ${bookingCode}`);

    const payment = await this.prisma.payment.findFirst({
      where: { providerReference },
      include: { booking: true },
    });

    if (!payment) {
      this.logger.warn(`[WEBHOOK WARNING] Payment with ref ${providerReference} not found`);
      return { received: true, status: 'NOT_FOUND' };
    }

    if (payment.status === PaymentStatus.PAID) {
      return { received: true, status: 'ALREADY_PROCESSED' };
    }

    if (status === 'PAID' || status === 'SUCCESS') {
      await this.confirmPayment(payment.id, providerReference);
    } else if (status === 'FAILED') {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      });
    }

    return { received: true, status: 'PROCESSED' };
  }

  private async confirmBookingAndRecordLedger(booking: any, payment: any) {
    // Create a confirmed slot record and transition booking to CONFIRMED atomically.
    try {
      await this.prisma.$transaction(async (tx) => {
        // Reserve the confirmed slot - this has a unique constraint on (barberId, startTime)
        await tx.bookingSlot.create({
          data: {
            bookingId: booking.id,
            barberId: booking.barberId,
            startTime: booking.startTime,
          },
        });

        // Transition booking to CONFIRMED
        await tx.booking.update({
          where: { id: booking.id },
          data: { status: BookingStatus.CONFIRMED },
        });

        // Append ledger entry in the same transaction to keep financial trail consistent
        await tx.paymentLedger.create({
          data: {
            paymentId: payment.id,
            bookingId: booking.id,
            branchId: booking.branchId,
            entryType: LedgerEntryType.PAYMENT_COLLECTED,
            serviceAmount: Number(booking.serviceFee),
            bookingFee: Number(booking.bookingFee),
            emergencyFee: Number(booking.emergencyFee),
            squeezeInFee: Number(booking.squeezeInFee),
            houseCallFee: Number(booking.houseCallFee),
            penaltyAmount: 0,
            totalNet: Number(booking.totalAmount),
            providerRef: payment.providerReference,
          },
        });
      });

      this.logger.log(`[BOOKING CONFIRMED] Code: ${booking.bookingCode} via Payment ${payment.id}`);

      this.eventsService.emit('BOOKING_CONFIRMED', {
        bookingCode: booking.bookingCode,
        barberId: booking.barberId,
        totalAmount: Number(booking.totalAmount),
        startTime: booking.startTime,
      });
    } catch (err: any) {
      // Handle unique constraint violation on booking slot (double-book attempt)
      const isUniqueError = err && (err.code === 'P2002' || /unique constraint/i.test(err.message || ''));
      if (isUniqueError) {
        this.logger.warn(`[BOOKING CONFLICT] Slot already taken for barber ${booking.barberId} at ${booking.startTime}`);
        throw new ConflictException('Selected time slot was just taken. Please choose another slot.');
      }

      this.logger.error('Error confirming booking and recording ledger', err);
      throw err;
    }
  }

  async processRefund(bookingId: string, penaltyDeduction: number = 0, reason: string = 'Cancellation') {
    const payment = await this.prisma.payment.findFirst({
      where: { bookingId, status: PaymentStatus.PAID },
      include: { booking: true },
    });

    if (!payment) {
      throw new NotFoundException('Paid payment record not found for this booking');
    }

    const serviceFee = Number(payment.booking.serviceFee);
    const refundAmount = Math.max(0, serviceFee - penaltyDeduction);

    if (payment.providerReference && refundAmount > 0) {
      await this.paynowAdapter.processRefund(payment.providerReference, refundAmount, reason);
    }

    const updatedPayment = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.REFUNDED,
        refundAmount,
        penaltyDeduction,
      },
    });

    // Record refund entry in ledger
    await this.ledgerService.recordEntry({
      paymentId: payment.id,
      bookingId: payment.bookingId,
      branchId: payment.booking.branchId,
      entryType: LedgerEntryType.REFUND_ISSUED,
      serviceAmount: -refundAmount,
      bookingFee: 0,
      emergencyFee: 0,
      squeezeInFee: 0,
      houseCallFee: 0,
      penaltyAmount: penaltyDeduction,
      totalNet: -refundAmount,
      providerRef: payment.providerReference,
    });

    return updatedPayment;
  }
}
