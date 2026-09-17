import { getAllowedOrigins } from '../common/security';

describe('Security configuration', () => {
  const originalEnv = process.env.CORS_ORIGINS;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.CORS_ORIGINS;
    } else {
      process.env.CORS_ORIGINS = originalEnv;
    }
  });

  it('returns the default local origins when env is not configured', () => {
    delete process.env.CORS_ORIGINS;

    expect(getAllowedOrigins()).toEqual([
      'http://localhost:5173',
      'http://localhost:4173',
      'http://127.0.0.1:5173',
    ]);
  });

  it('parses a comma-separated list of origins from the environment', () => {
    process.env.CORS_ORIGINS = 'https://app.example.com,https://admin.example.com';

    expect(getAllowedOrigins()).toEqual([
      'https://app.example.com',
      'https://admin.example.com',
    ]);
  });
});
