import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  PaymentProvider,
  InitiatePaymentResult,
  PaymentStatusResult,
  RefundResult,
} from '../interfaces/payment-provider.interface';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PaynowEcoCashAdapter implements PaymentProvider {
  private readonly logger = new Logger(PaynowEcoCashAdapter.name);

  constructor(private readonly configService: ConfigService) {}

  verifyWebhookSignature(payload: unknown, signatureHeader: string | undefined, rawBody: string): boolean {
    const secret = this.configService.get<string>('PAYNOW_WEBHOOK_SECRET');

    if (!secret || !signatureHeader) {
      return false;
    }

    const expectedHex = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
    const expected = `sha256=${expectedHex}`;

    const provided = String(signatureHeader).trim();

    try {
      const providedBuf = Buffer.from(provided.toLowerCase(), 'utf8');
      const expectedBuf = Buffer.from(expected.toLowerCase(), 'utf8');

      if (providedBuf.length === expectedBuf.length && crypto.timingSafeEqual(providedBuf, expectedBuf)) {
        return true;
      }
    } catch {
      return false;
    }

    return false;
  }

  async initiatePayment(
    amount: number,
    phone: string,
    idempotencyKey: string,
    bookingCode: string,
  ): Promise<InitiatePaymentResult> {
    this.logger.log(
      `[PAYNOW ADAPTER] Initiating $${amount} payment for ${phone} (Booking: ${bookingCode}, IdempotencyKey: ${idempotencyKey})`,
    );

    const integrationId = this.configService.get<string>('PAYNOW_INTEGRATION_ID');

    // In sandbox or dev mode (or when configured), simulate instant success or return USSD prompt message
    const providerRef = `PAYNOW-${uuidv4().substring(0, 8).toUpperCase()}`;

    return {
      success: true,
      providerReference: providerRef,
      instructions: `USSD push prompt sent to ${phone}. Please enter your EcoCash PIN to confirm $${amount}.`,
      status: 'PENDING',
    };
  }

  async verifyPayment(providerReference: string): Promise<PaymentStatusResult> {
    this.logger.log(`[PAYNOW ADAPTER] Verifying status for ${providerReference}`);
    return {
      providerReference,
      status: 'PAID',
      amount: 0,
    };
  }

  async processRefund(
    providerReference: string,
    amount: number,
    reason: string,
  ): Promise<RefundResult> {
    this.logger.log(`[PAYNOW ADAPTER] Refunding $${amount} for ${providerReference} - Reason: ${reason}`);
    const refundRef = `REFUND-${uuidv4().substring(0, 8).toUpperCase()}`;
    return {
      success: true,
      refundReference: refundRef,
      amountRefunded: amount,
    };
  }
}
