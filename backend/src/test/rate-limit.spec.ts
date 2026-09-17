import { RateLimitMiddleware } from '../common/rate-limit.middleware';

describe('RateLimitMiddleware', () => {
  it('blocks requests after the configured limit is exceeded', () => {
    const middleware = new RateLimitMiddleware({ windowMs: 60000, max: 2 });
    const requests = Array.from({ length: 3 }, () => ({
      ip: '203.0.113.7',
      headers: {},
    }));

    const response: any = {
      statusCode: 200,
      status: jest.fn(function (code: number) {
        this.statusCode = code;
        return this;
      }),
      json: jest.fn(),
      setHeader: jest.fn(),
    };

    const next = jest.fn();

    for (const req of requests) {
      middleware.use(req as any, response, next);
    }

    expect(next).toHaveBeenCalledTimes(2);
    expect(response.status).toHaveBeenCalledWith(429);
  });
});
