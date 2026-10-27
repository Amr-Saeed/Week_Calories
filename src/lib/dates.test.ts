import { describe, expect, it } from 'vitest';
import {
  addDays,
  dateRange,
  dateToISO,
  diffInDays,
  formatRange,
  isValidISODate,
  nextWeekdayOnOrAfter,
  weekdayOf,
} from './dates';

describe('date utilities', () => {
  it('validates real calendar dates only', () => {
    expect(isValidISODate('2026-11-07')).toBe(true);
    expect(isValidISODate('2026-02-29')).toBe(false); // 2026 is not a leap year
    expect(isValidISODate('2028-02-29')).toBe(true);
    expect(isValidISODate('2026-13-01')).toBe(false);
    expect(isValidISODate('7/11/2026')).toBe(false);
  });

  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02');
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDays('2027-01-02', -3)).toBe('2026-12-30');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('is unaffected by daylight-saving changes', () => {
    // US DST ends 2026-11-01 and starts 2026-03-08; day counts must stay exact.
    expect(diffInDays('2026-10-31', '2026-11-02')).toBe(2);
    expect(diffInDays('2026-03-07', '2026-03-09')).toBe(2);
    expect(addDays('2026-11-01', 1)).toBe('2026-11-02');
  });

  it('finds the weekday', () => {
    expect(weekdayOf('2026-11-07')).toBe(6); // Saturday
    expect(weekdayOf('2026-11-13')).toBe(5); // Friday
  });

  it('builds inclusive ranges', () => {
    expect(dateRange('2026-11-07', '2026-11-13')).toHaveLength(7);
    expect(dateRange('2026-11-13', '2026-11-07')).toEqual([]);
  });

  it('finds the next matching weekday', () => {
    expect(nextWeekdayOnOrAfter('2026-11-07', 6)).toBe('2026-11-07'); // already Saturday
    expect(nextWeekdayOnOrAfter('2026-11-08', 6)).toBe('2026-11-14');
    expect(nextWeekdayOnOrAfter('2026-12-30', 1)).toBe('2027-01-04'); // Monday in next year
  });

  it('uses the local calendar date, not UTC', () => {
    // 23:30 local on Dec 31 must stay Dec 31 even if UTC is already Jan 1.
    expect(dateToISO(new Date(2026, 11, 31, 23, 30))).toBe('2026-12-31');
    expect(dateToISO(new Date(2027, 0, 1, 0, 5))).toBe('2027-01-01');
  });

  it('formats ranges, adding the year only when it changes', () => {
    expect(formatRange('2026-11-07', '2026-11-13')).toBe('Nov 7 – Nov 13, 2026');
    expect(formatRange('2026-12-28', '2027-01-03')).toBe('Dec 28, 2026 – Jan 3, 2027');
  });
});
