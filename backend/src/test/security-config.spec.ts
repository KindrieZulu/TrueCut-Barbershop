import { getAllowedOrigins, isOriginAllowed } from '../common/security';

describe('Security configuration', () => {
  const originalEnv = process.env.CORS_ORIGINS;
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.CORS_ORIGINS;
    } else {
      process.env.CORS_ORIGINS = originalEnv;
    }
    process.env.NODE_ENV = originalNodeEnv;
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

  describe('isOriginAllowed', () => {
    const allowed = ['http://localhost:5173'];

    it('allows an exact match from the configured list', () => {
      expect(isOriginAllowed('http://localhost:5173', allowed)).toBe(true);
    });

    it('rejects an origin not in the list outside the dev-tunnel exception', () => {
      expect(isOriginAllowed('https://evil.example.com', allowed)).toBe(false);
    });

    it('allows a *.trycloudflare.com origin outside production (dev tunnel testing)', () => {
      process.env.NODE_ENV = 'development';
      expect(isOriginAllowed('https://random-words.trycloudflare.com', allowed)).toBe(true);
    });

    it('rejects a *.trycloudflare.com origin in production', () => {
      process.env.NODE_ENV = 'production';
      expect(isOriginAllowed('https://random-words.trycloudflare.com', allowed)).toBe(false);
    });
  });
});
