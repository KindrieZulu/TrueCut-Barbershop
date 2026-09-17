import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { parseCookies } from './cookies';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_COOKIE_NAME = 'truecut_csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';

// Double-submit-cookie CSRF defense. truecut_access/truecut_refresh are set
// httpOnly with sameSite=none in production (required for a cross-site SPA
// deployment), which means the browser will attach them to a request from
// any origin - sameSite alone is not the defense. This cookie is
// deliberately NOT httpOnly so the frontend can read it and echo it back as
// a header; a cross-site attacker can trigger the cookie to be sent, but
// cannot read it or forge the matching header.
@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (SAFE_METHODS.has(req.method.toUpperCase())) {
      return next();
    }

    // Server-to-server payment provider callback: no browser session to protect.
    if (req.path.endsWith('/payments/webhook')) {
      return next();
    }

    const cookies = parseCookies(req.headers.cookie);
    const hasSessionCookie = Boolean(cookies['truecut_access'] || cookies['truecut_refresh']);

    // Nothing to protect yet - login/otp/refresh establish the session cookies
    // in the first place, so there is no pre-existing auth to ride on.
    if (!hasSessionCookie) {
      return next();
    }

    const cookieToken = cookies[CSRF_COOKIE_NAME];
    const headerToken = req.headers[CSRF_HEADER_NAME];

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      throw new ForbiddenException('Missing or invalid CSRF token');
    }

    next();
  }
}

export { CSRF_COOKIE_NAME, CSRF_HEADER_NAME };
