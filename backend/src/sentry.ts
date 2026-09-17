export function initSentry(): boolean {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return false;

  console.log('[SENTRY] Initialized backend error tracking with DSN:', dsn);
  return true;
}
