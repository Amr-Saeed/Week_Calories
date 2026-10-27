import type { ISODate, WeekPeriod, WeekdayIndex } from '@/types';
import { addDays, compareDates, dateRange, diffInDays, nextWeekdayOnOrAfter, weekdayOf } from './dates';

/**
 * Week schedule helpers.
 *
 * A schedule is a sorted list of "anchor" dates. Weeks repeat every 7 days from an anchor until
 * the next anchor starts; the final week before a new anchor is shortened so periods never
 * overlap. Because a new week-start day only ever adds a *future* anchor, past periods are stable.
 */

/** First date on/after the chosen date that actually falls on the chosen week-start day. */
export function resolveFirstAnchor(firstTrackingDate: ISODate, weekStartDay: WeekdayIndex): ISODate {
  return nextWeekdayOnOrAfter(firstTrackingDate, weekStartDay);
}

export function getPeriodForDate(anchors: readonly ISODate[], date: ISODate): WeekPeriod | null {
  if (anchors.length === 0 || compareDates(date, anchors[0]) < 0) return null;

  let i = anchors.length - 1;
  while (compareDates(anchors[i], date) > 0) i--;

  const anchor = anchors[i];
  const weeksSinceAnchor = Math.floor(diffInDays(anchor, date) / 7);
  const start = addDays(anchor, weeksSinceAnchor * 7);
  let end = addDays(start, 6);
  const next = anchors[i + 1];
  if (next !== undefined && compareDates(end, next) >= 0) end = addDays(next, -1);
  return { start, end, days: dateRange(start, end) };
}

/** The period containing today, or the first period if tracking has not started yet. */
export function getCurrentPeriod(anchors: readonly ISODate[], today: ISODate): WeekPeriod {
  const found = getPeriodForDate(anchors, today);
  if (found) return found;
  const first = getPeriodForDate(anchors, anchors[0]);
  if (!first) throw new Error('Week schedule has no anchors');
  return first;
}

export function getNextPeriod(anchors: readonly ISODate[], period: WeekPeriod): WeekPeriod {
  return getPeriodForDate(anchors, addDays(period.end, 1))!;
}

/** Previous period, or null when `period` is the very first tracking week. */
export function getPreviousPeriod(anchors: readonly ISODate[], period: WeekPeriod): WeekPeriod | null {
  return getPeriodForDate(anchors, addDays(period.start, -1));
}

/** 1-based number of the period counted from the first tracking week. */
export function getWeekNumber(anchors: readonly ISODate[], period: WeekPeriod): number {
  let n = 1;
  let cursor = getPeriodForDate(anchors, anchors[0])!;
  while (compareDates(cursor.start, period.start) < 0) {
    cursor = getNextPeriod(anchors, cursor);
    n++;
  }
  return n;
}

/**
 * Change the week-start day for the *future* only.
 * - Tracking not started yet (nothing to protect): rebuild the schedule from the first date.
 * - Otherwise: the current week is untouched; the new day takes effect from the first matching
 *   date after the current week ends (the week in between is shortened to fit).
 */
export function scheduleWithNewWeekStart(
  anchors: readonly ISODate[],
  newWeekStartDay: WeekdayIndex,
  today: ISODate,
  firstTrackingDate: ISODate,
): ISODate[] {
  if (anchors.length === 0 || compareDates(today, anchors[0]) < 0) {
    return scheduleFromScratch(firstTrackingDate, newWeekStartDay);
  }
  // Drop any not-yet-started pending change so repeated edits don't pile up.
  const started = anchors.filter((a) => compareDates(a, today) <= 0);
  const current = getPeriodForDate(started, today)!;
  const latest = started[started.length - 1];
  if (weekdayOf(latest) === newWeekStartDay) return [...started];
  const candidate = nextWeekdayOnOrAfter(addDays(current.end, 1), newWeekStartDay);
  return [...started, candidate];
}

/** Explicit "reorganize everything" option: rebuild the schedule from a new first date and day. */
export function scheduleFromScratch(firstTrackingDate: ISODate, weekStartDay: WeekdayIndex): ISODate[] {
  return [resolveFirstAnchor(firstTrackingDate, weekStartDay)];
}
