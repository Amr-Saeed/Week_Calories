import type { ISODate, WeekdayIndex } from '@/types';

/**
 * All tracking dates are plain calendar dates (`YYYY-MM-DD`), never timestamps.
 * Arithmetic is done on UTC-midnight values so daylight-saving shifts, month ends,
 * leap years and year boundaries can never move a date by a day.
 */

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

export function isValidISODate(value: string): boolean {
  const m = ISO_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

function toUtcMs(iso: ISODate): number {
  if (!isValidISODate(iso)) throw new RangeError(`Invalid ISO date: "${iso}"`);
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtcMs(ms: number): ISODate {
  const dt = new Date(ms);
  const y = String(dt.getUTCFullYear()).padStart(4, '0');
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(iso: ISODate, days: number): ISODate {
  return fromUtcMs(toUtcMs(iso) + days * MS_PER_DAY);
}

/** Whole days from `a` to `b` (positive when b is later). */
export function diffInDays(a: ISODate, b: ISODate): number {
  return Math.round((toUtcMs(b) - toUtcMs(a)) / MS_PER_DAY);
}

export function weekdayOf(iso: ISODate): WeekdayIndex {
  return new Date(toUtcMs(iso)).getUTCDay() as WeekdayIndex;
}

/** Convert a JS Date to the calendar date the *user* is currently living in (local time). */
export function dateToISO(date: Date): ISODate {
  const y = String(date.getFullYear()).padStart(4, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayISO(now: Date = new Date()): ISODate {
  return dateToISO(now);
}

/** Inclusive list of dates from `start` to `end`. Empty if end < start. */
export function dateRange(start: ISODate, end: ISODate): ISODate[] {
  const n = diffInDays(start, end);
  if (n < 0) return [];
  return Array.from({ length: n + 1 }, (_, i) => addDays(start, i));
}

export function compareDates(a: ISODate, b: ISODate): number {
  return a < b ? -1 : a > b ? 1 : 0; // ISO strings sort chronologically
}

/** First date on or after `iso` that falls on `weekday`. */
export function nextWeekdayOnOrAfter(iso: ISODate, weekday: WeekdayIndex): ISODate {
  const delta = (weekday - weekdayOf(iso) + 7) % 7;
  return addDays(iso, delta);
}

/* ---------- Formatting (display only) ---------- */

const LOCALE = 'en-US';

function fmt(iso: ISODate, opts: Intl.DateTimeFormatOptions, locale = LOCALE): string {
  return new Intl.DateTimeFormat(locale, { ...opts, timeZone: 'UTC' }).format(new Date(toUtcMs(iso)));
}

export const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export function weekdayName(day: WeekdayIndex, short = false): string {
  const name = WEEKDAY_NAMES[day];
  return short ? name.slice(0, 3) : name;
}

export const formatWeekdayShort = (iso: ISODate) => fmt(iso, { weekday: 'short' });
export const formatWeekdayLong = (iso: ISODate) => fmt(iso, { weekday: 'long' });
export const formatDayMonth = (iso: ISODate) => fmt(iso, { day: 'numeric', month: 'short' });
export const formatFull = (iso: ISODate) => fmt(iso, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
export const formatMedium = (iso: ISODate) => fmt(iso, { day: 'numeric', month: 'short', year: 'numeric' });

/** e.g. "Nov 7 – Nov 13, 2026" or "Dec 28, 2026 – Jan 3, 2027". */
export function formatRange(start: ISODate, end: ISODate): string {
  const sameYear = start.slice(0, 4) === end.slice(0, 4);
  const left = sameYear
    ? fmt(start, { month: 'short', day: 'numeric' })
    : fmt(start, { month: 'short', day: 'numeric', year: 'numeric' });
  const right = fmt(end, { month: 'short', day: 'numeric', year: 'numeric' });
  return `${left} – ${right}`;
}
