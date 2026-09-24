// Every date decision in the app goes through this module, so tests and CI can pin "now".
// Set DM_NOW (any ISO timestamp) to freeze the clock for a whole process, or call setClock in tests.

export const APP_TIME_ZONE = 'America/Tijuana';

let clock: () => Date = () => (process.env.DM_NOW ? new Date(process.env.DM_NOW) : new Date());

export function setClock(fn: () => Date): void {
  clock = fn;
}

export function now(): Date {
  return clock();
}

/** Calendar date (YYYY-MM-DD) of an instant in the app time zone. */
export function localDate(instant: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}

export function today(): string {
  return localDate(now());
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatLongDate(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function localPart(instant: Date, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: APP_TIME_ZONE, ...options }).format(instant);
}

/** Hour of day (0–23) in the app time zone. */
export function localHour(instant: Date): number {
  return Number(localPart(instant, { hour: 'numeric', hourCycle: 'h23' }));
}

/** Clock-face time in the app time zone, e.g. "9:41". */
export function localTime(instant: Date): string {
  return localPart(instant, { hour: 'numeric', minute: '2-digit', hour12: true }).replace(/\s?[AP]M$/, '');
}

export function weekday(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
}
