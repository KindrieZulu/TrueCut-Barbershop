export interface SmsResult {
  success: boolean;
  providerRef: string;
  error?: string;
}

export interface SmsProvider {
  sendSms(recipientPhone: string, message: string): Promise<SmsResult>;
}
