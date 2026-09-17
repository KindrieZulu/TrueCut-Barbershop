import { ConfigService } from '@nestjs/config';
import { SmsAdapter } from '../modules/notifications/adapters/sms.adapter';

describe('SmsAdapter', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sends SMS through Twilio when configured', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ sid: 'SM123' }),
    } as Response);
    const adapter = new SmsAdapter(new ConfigService({
      SMS_PROVIDER: 'TWILIO',
      TWILIO_ACCOUNT_SID: 'AC123',
      TWILIO_AUTH_TOKEN: 'auth-token',
      TWILIO_PHONE_NUMBER: '+263771000000',
    }));

    const result = await adapter.sendSms('+263771234567', 'Your OTP is 123456');

    expect(result).toEqual({ success: true, providerRef: 'SM123' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.twilio.com/2010-04-01/Accounts/AC123/Messages.json',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('returns a configuration failure when Twilio credentials are missing', async () => {
    const fetchMock = jest.spyOn(global, 'fetch');
    const adapter = new SmsAdapter(new ConfigService({ SMS_PROVIDER: 'TWILIO' }));

    const result = await adapter.sendSms('+263771234567', 'Your OTP is 123456');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Twilio credentials');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends SMS through GatewayAPI when configured', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ msg_id: 'GW123' }),
    } as Response);
    const adapter = new SmsAdapter(new ConfigService({
      SMS_PROVIDER: 'GATEWAYAPI',
      GATEWAYAPI_TOKEN: 'gateway-token',
      GATEWAYAPI_SENDER: 'TrueCut',
    }));

    const result = await adapter.sendSms('+263771234567', 'Your OTP is 123456');

    expect(result).toEqual({ success: true, providerRef: 'GW123' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://messaging.gatewayapi.com/mobile/single',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Token gateway-token' }),
      }),
    );
  });

  it('returns a configuration failure for an unsupported provider', async () => {
    const adapter = new SmsAdapter(new ConfigService({ SMS_PROVIDER: 'UNKNOWN' }));

    const result = await adapter.sendSms('+263771234567', 'Your OTP is 123456');

    expect(result).toEqual(expect.objectContaining({
      success: false,
      error: 'Unsupported SMS_PROVIDER: UNKNOWN',
    }));
  });
});