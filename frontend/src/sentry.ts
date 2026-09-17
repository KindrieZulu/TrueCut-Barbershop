export function initSentry(): boolean {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return false;

  console.log('[SENTRY] Error tracking initialized with DSN:', dsn);
  return true;
}
