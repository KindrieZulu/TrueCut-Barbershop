import { ConfigService } from '@nestjs/config';
import { PaynowEcoCashAdapter } from '../modules/payments/adapters/paynow-ecocash.adapter';

describe('Paynow webhook signature validation', () => {
  it('accepts a valid HMAC signature for the raw payload', () => {
    const adapter = new PaynowEcoCashAdapter(new ConfigService({
      PAYNOW_WEBHOOK_SECRET: 'super-secret-key',
    }));

    const payload = { providerReference: 'PAYNOW-123', status: 'PAID', bookingCode: 'TC-ABC123' };
    const rawBody = JSON.stringify(payload);
    const signature = 'sha256=' + require('crypto')
      .createHmac('sha256', 'super-secret-key')
      .update(rawBody, 'utf8')
      .digest('hex');

    expect(adapter.verifyWebhookSignature(payload, signature, rawBody)).toBe(true);
  });

  it('rejects a tampered payload even when the header is present', () => {
    const adapter = new PaynowEcoCashAdapter(new ConfigService({
      PAYNOW_WEBHOOK_SECRET: 'super-secret-key',
    }));

    const payload = { providerReference: 'PAYNOW-123', status: 'PAID', bookingCode: 'TC-ABC123' };
    const rawBody = JSON.stringify(payload);
    const signature = 'sha256=' + require('crypto')
      .createHmac('sha256', 'super-secret-key')
      .update(JSON.stringify({ ...payload, status: 'FAILED' }), 'utf8')
      .digest('hex');

    expect(adapter.verifyWebhookSignature(payload, signature, rawBody)).toBe(false);
  });
});
