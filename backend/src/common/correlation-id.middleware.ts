import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

// A client-supplied id is only trusted if it looks like a reasonable
// identifier - otherwise a client could push arbitrary long or
// control-character-laden values into logs and the audit trail
// (AuditLog.correlationId has no format constraint of its own).
const SAFE_CORRELATION_ID = /^[A-Za-z0-9_-]{1,100}$/;

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const supplied = req.headers[CORRELATION_ID_HEADER] as string | undefined;
    const correlationId = supplied && SAFE_CORRELATION_ID.test(supplied) ? supplied : uuidv4();
    req.headers[CORRELATION_ID_HEADER] = correlationId;
    res.setHeader(CORRELATION_ID_HEADER, correlationId);
    next();
  }
}
