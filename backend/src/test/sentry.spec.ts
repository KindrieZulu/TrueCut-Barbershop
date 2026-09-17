import { initSentry } from '../sentry';

describe('Sentry initialization', () => {
  const originalDsn = process.env.SENTRY_DSN;

  afterEach(() => {
    if (originalDsn === undefined) {
      delete process.env.SENTRY_DSN;
    } else {
      process.env.SENTRY_DSN = originalDsn;
    }
  });

  it('returns true when a backend DSN is configured', () => {
    process.env.SENTRY_DSN = 'https://examplePublicKey@o0.ingest.sentry.io/0';

    expect(initSentry()).toBe(true);
  });

  it('returns false when no backend DSN is configured', () => {
    delete process.env.SENTRY_DSN;

    expect(initSentry()).toBe(false);
  });
});
