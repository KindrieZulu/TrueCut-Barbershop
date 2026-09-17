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
