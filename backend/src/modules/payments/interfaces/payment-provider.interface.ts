export interface InitiatePaymentResult {
  success: boolean;
  providerReference: string;
  redirectUrl?: string;
  instructions?: string;
  status: 'PENDING' | 'PAID' | 'FAILED';
}

export interface PaymentStatusResult {
  providerReference: string;
  status: 'PENDING' | 'PAID' | 'FAILED';
  amount: number;
}

export interface RefundResult {
  success: boolean;
  refundReference: string;
  amountRefunded: number;
}

export interface PaymentProvider {
  initiatePayment(
    amount: number,
    phone: string,
    idempotencyKey: string,
    bookingCode: string,
  ): Promise<InitiatePaymentResult>;

  verifyPayment(providerReference: string): Promise<PaymentStatusResult>;

  processRefund(
    providerReference: string,
    amount: number,
    reason: string,
  ): Promise<RefundResult>;
}
