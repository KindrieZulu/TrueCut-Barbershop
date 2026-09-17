import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsProvider, SmsResult } from '../interfaces/sms-provider.interface';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SmsAdapter implements SmsProvider {
  private readonly logger = new Logger(SmsAdapter.name);

  constructor(private readonly configService: ConfigService) {}

  async sendSms(recipientPhone: string, message: string): Promise<SmsResult> {
    const configuredProvider = this.configService.get<string>('SMS_PROVIDER');
    const provider = (configuredProvider || (process.env.NODE_ENV === 'production' ? 'TWILIO' : 'MOCK')).toUpperCase();

    if (provider === 'GATEWAYAPI') {
      const token = this.configService.get<string>('GATEWAYAPI_TOKEN');
      const sender = this.configService.get<string>('GATEWAYAPI_SENDER');
      if (!token || !sender) {
        return this.configurationError('GatewayAPI token and sender are required');
      }

      try {
        const response = await fetch('https://messaging.gatewayapi.com/mobile/single', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            Authorization: `Token ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sender,
            recipient: Number(recipientPhone.replace(/^\+/, '')),
            message,
          }),
        });

        const data: any = await response.json();
        if (!response.ok) {
          return this.configurationError(data?.message || 'GatewayAPI SMS dispatch error');
        }

        const providerRef = data?.msg_id || `GATEWAYAPI-${uuidv4().substring(0, 8)}`;
        this.logger.log(`[GATEWAYAPI SMS SENT] To: ${recipientPhone} | Message ID: ${providerRef}`);
        return { success: true, providerRef };
      } catch (err: any) {
        const errorMessage = err?.body?.message || err?.message || 'GatewayAPI SMS dispatch error';
        this.logger.error(`[GATEWAYAPI SMS FAILED] To: ${recipientPhone} | Error: ${errorMessage}`);
        return { success: false, providerRef: '', error: errorMessage };
      }
    }

    // 1. TWILIO GATEWAY INTEGRATION
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    const fromNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER');

    if (provider === 'TWILIO') {
      if (!accountSid || !authToken || !fromNumber || accountSid === 'sample_sid' || authToken === 'sample_token') {
        return this.configurationError('Twilio credentials are missing or still using sample values');
      }

      try {
        const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
        const params = new URLSearchParams();
        params.append('To', recipientPhone);
        params.append('From', fromNumber);
        params.append('Body', message);

        const authHeader = `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`;

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        });

        const data: any = await response.json();

        if (response.ok) {
          const providerRef = data.sid || `TWILIO-${uuidv4().substring(0, 8)}`;
          this.logger.log(`[TWILIO REAL-WORLD SMS SENT] To: ${recipientPhone} | SID: ${providerRef}`);
          return { success: true, providerRef };
        } else {
          const errorMsg = data.message || 'Twilio SMS dispatch error';
          this.logger.error(`[TWILIO REAL-WORLD SMS FAILED] To: ${recipientPhone} | Error: ${errorMsg}`);
          return { success: false, providerRef: '', error: errorMsg };
        }
      } catch (err: any) {
        this.logger.error(`[TWILIO REAL-WORLD SMS EXCEPTION] To: ${recipientPhone} | Error: ${err.message}`);
        return { success: false, providerRef: '', error: err.message };
      }
    }

    // 2. AFRICA'S TALKING GATEWAY INTEGRATION (Local African / Zimbabwean SMS Gateway)
    const atUsername = this.configService.get<string>('AFRICASTALKING_USERNAME');
    const atApiKey = this.configService.get<string>('AFRICASTALKING_API_KEY');

    if (provider === 'AFRICASTALKING') {
      if (!atUsername || !atApiKey || atApiKey === 'sample_key') {
        return this.configurationError('Africa\'s Talking credentials are missing or still using sample values');
      }

      try {
        const url = 'https://api.africastalking.com/version1/messaging';
        const params = new URLSearchParams();
        params.append('username', atUsername);
        params.append('to', recipientPhone);
        params.append('message', message);

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'apiKey': atApiKey,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
          },
          body: params.toString(),
        });

        const data: any = await response.json();
        const recipients = data.SMSMessageData?.Recipients || [];

        if (response.ok && recipients.length > 0 && recipients[0].status === 'Success') {
          const providerRef = recipients[0].messageId || `AT-${uuidv4().substring(0, 8)}`;
          this.logger.log(`[AFRICA'S TALKING SMS SENT] To: ${recipientPhone} | MessageId: ${providerRef}`);
          return { success: true, providerRef };
        } else {
          const errorMsg = recipients[0]?.status || 'Africa\'s Talking dispatch error';
          this.logger.error(`[AFRICA'S TALKING SMS FAILED] To: ${recipientPhone} | Error: ${errorMsg}`);
          return { success: false, providerRef: '', error: errorMsg };
        }
      } catch (err: any) {
        this.logger.error(`[AFRICA'S TALKING SMS EXCEPTION] To: ${recipientPhone} | Error: ${err.message}`);
        return { success: false, providerRef: '', error: err.message };
      }
    }

    if (provider === 'MOCK') {
      const providerRef = `SMS-${uuidv4().substring(0, 8).toUpperCase()}`;
      this.logger.log(`[SIMULATED SMS DISPATCHED] To: ${recipientPhone} | Msg: "${message}" | Ref: ${providerRef}`);
      return { success: true, providerRef };
    }

    return this.configurationError(`Unsupported SMS_PROVIDER: ${provider}`);
  }

  private configurationError(error: string): SmsResult {
    this.logger.error(`[SMS CONFIGURATION ERROR] ${error}`);
    return { success: false, providerRef: '', error };
  }
}
