// The backend's DEFAULT_TIMEZONE is Africa/Harare (UTC+2), but
// `new Date().toISOString()` always gives the UTC calendar date. Any
// caller using that as "today" for a date-only field (walk-in slot
// fetching, the booking wizard's default date) silently asks for
// *yesterday's* schedule during the UTC+0..2 window - i.e. every night
// from midnight to 2am Harare time. Formatting through Intl with an
// explicit timeZone sidesteps the browser's own local timezone entirely,
// so this is correct regardless of where the browser itself is set to.
const HARARE_TZ = 'Africa/Harare';

export function getHarareDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: HARARE_TZ }).format(date);
}
