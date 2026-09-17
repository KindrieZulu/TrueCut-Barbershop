import { ForbiddenException } from '@nestjs/common';
import { CsrfMiddleware } from '../common/csrf.middleware';

// Double-submit-cookie CSRF defense: truecut_access/truecut_refresh are set
// sameSite=none in production (required for a cross-site SPA), so sameSite
// alone is not the defense - this middleware is. Verifies both that it
// actually blocks a forged request and that it does not break legitimate
// unauthenticated or safe-method traffic.
describe('CsrfMiddleware', () => {
  const middleware = new CsrfMiddleware();

  function makeReq(overrides: Partial<{ method: string; path: string; cookie: string }>) {
    return {
      method: overrides.method ?? 'POST',
      path: overrides.path ?? '/api/v1/bookings/abc/cancel',
      headers: {
        cookie: overrides.cookie ?? '',
      },
    } as any;
  }

  function run(req: any) {
    const next = jest.fn();
    middleware.use(req, {} as any, next);
    return next;
  }

  it('allows safe methods through with no cookies at all', () => {
    const req = makeReq({ method: 'GET', cookie: '' });
    const next = run(req);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('allows an unauthenticated mutating request through (nothing to protect yet)', () => {
    const req = makeReq({ method: 'POST', path: '/api/v1/auth/login', cookie: '' });
    const next = run(req);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('allows the payment provider webhook through without a CSRF token', () => {
    const req = makeReq({ method: 'POST', path: '/api/v1/payments/webhook', cookie: 'truecut_access=sometoken' });
    const next = run(req);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('blocks an authenticated mutating request with no CSRF cookie or header at all', () => {
    const req = makeReq({ cookie: 'truecut_access=sometoken' });
    expect(() => middleware.use(req, {} as any, jest.fn())).toThrow(ForbiddenException);
  });

  it('blocks a forged request: session cookie present but CSRF header missing (this is the actual attack)', () => {
    // A cross-site form/fetch rides the browser's session cookie automatically
    // but cannot read or set a custom header for another origin.
    const req = makeReq({ cookie: 'truecut_access=sometoken; truecut_csrf=real-token' });
    expect(() => middleware.use(req, {} as any, jest.fn())).toThrow(ForbiddenException);
  });

  it('blocks when the header token does not match the cookie token', () => {
    const req = makeReq({ cookie: 'truecut_access=sometoken; truecut_csrf=real-token' });
    req.headers['x-csrf-token'] = 'wrong-token';
    expect(() => middleware.use(req, {} as any, jest.fn())).toThrow(ForbiddenException);
  });

  it('allows through when the header token matches the cookie token', () => {
    const req = makeReq({ cookie: 'truecut_access=sometoken; truecut_csrf=real-token' });
    req.headers['x-csrf-token'] = 'real-token';
    const next = run(req);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
