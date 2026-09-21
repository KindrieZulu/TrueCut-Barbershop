export function getAllowedOrigins(): string[] {
  const configured = process.env.CORS_ORIGINS ?? '';

  if (!configured.trim()) {
    return [
      'http://localhost:5173',
      'http://localhost:4173',
      'http://127.0.0.1:5173',
    ];
  }

  return configured
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

// Dev-only exception: a Cloudflare "quick tunnel" (used to let testers on
// other networks reach this local dev stack) gets a random *.trycloudflare.com
// hostname each time it starts, so it can't be listed in CORS_ORIGINS by
// exact value. The browser sends an Origin header on this request even
// though the tunnel makes it look same-origin (Vite proxies /api itself),
// so without this the request gets rejected before it ever reaches the
// route handler. Suffix-matched, and only outside production.
const DEV_TUNNEL_ORIGIN_SUFFIXES = ['.trycloudflare.com'];

export function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  if (process.env.NODE_ENV === 'production') {
    return false;
  }

  return DEV_TUNNEL_ORIGIN_SUFFIXES.some((suffix) => origin.endsWith(suffix));
}
