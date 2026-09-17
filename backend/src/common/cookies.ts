// Cookie parsing is duplicated here rather than added as a `cookie-parser`
// dependency: the app already reads raw Cookie headers by hand in a couple
// of places, so this just gives that logic one shared implementation.
export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;

  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const name = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    result[name] = decodeURIComponent(value);
  }

  return result;
}
