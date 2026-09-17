import { Injectable, NestMiddleware, Optional } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

export interface RateLimitOptions {
  windowMs: number;
  max: number;
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly store = new Map<string, { count: number; resetAt: number }>();

  readonly windowMs: number;
  readonly max: number;

  constructor(@Optional() options?: RateLimitOptions) {
    this.windowMs = options?.windowMs ?? 60000;
    this.max = options?.max ?? 120;
  }

  use(req: Request, res: Response, next: NextFunction) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = this.store.get(ip);

    if (!entry || entry.resetAt <= now) {
      this.store.set(ip, { count: 1, resetAt: now + this.windowMs });
      return next();
    }

    if (entry.count >= this.max) {
      res.status(429).json({
        statusCode: 429,
        message: 'Too many requests. Please retry later.',
        retryAfterMs: Math.max(0, entry.resetAt - now),
      });
      return;
    }

    entry.count += 1;
    next();
  }
}
