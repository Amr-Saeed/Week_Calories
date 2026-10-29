import { describe, expect, it } from 'vitest';
import {
  getCurrentPeriod,
  getNextPeriod,
  getPeriodForDate,
  getPreviousPeriod,
  getWeekNumber,
  resolveFirstAnchor,
  scheduleFromScratch,
  scheduleWithNewWeekStart,
} from './week';
import { weekdayOf } from './dates';

const SAT = 6;
const MON = 1;

describe('week boundaries', () => {
  const anchors = [resolveFirstAnchor('2026-11-07', SAT)];

  it('starts the first week on the chosen Saturday and ends on Friday', () => {
    const p = getPeriodForDate(anchors, '2026-11-07')!;
    expect(p.start).toBe('2026-11-07');
    expect(p.end).toBe('2026-11-13');
    expect(p.days).toHaveLength(7);
    expect(weekdayOf(p.end)).toBe(5);
  });

  it('puts any date inside the right week', () => {
    expect(getPeriodForDate(anchors, '2026-11-10')!.start).toBe('2026-11-07');
    expect(getPeriodForDate(anchors, '2026-11-13')!.start).toBe('2026-11-07');
    expect(getPeriodForDate(anchors, '2026-11-14')!.start).toBe('2026-11-14');
  });

  it('has no period before tracking begins', () => {
    expect(getPeriodForDate(anchors, '2026-11-06')).toBeNull();
  });

  it('starts on the exact date chosen by the user', () => {
    expect(resolveFirstAnchor('2026-11-09', SAT)).toBe('2026-11-09');
    expect(resolveFirstAnchor('2026-11-07', SAT)).toBe('2026-11-07');
  });

  it('handles a week crossing a month boundary', () => {
    const a = [resolveFirstAnchor('2026-10-28', 3)]; // Wednesday
    const p = getPeriodForDate(a, '2026-10-28')!;
    expect(p.days).toEqual(['2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02', '2026-11-03']);
  });

  it('handles a week crossing a year boundary', () => {
    const a = [resolveFirstAnchor('2026-12-28', MON)];
    const p = getPeriodForDate(a, '2027-01-02')!;
    expect(p.start).toBe('2026-12-28');
    expect(p.end).toBe('2027-01-03');
    expect(p.days[3]).toBe('2026-12-31');
    expect(p.days[4]).toBe('2027-01-01');
  });

  it('handles a leap-day week', () => {
    const a = [resolveFirstAnchor('2028-02-26', SAT)];
    expect(getPeriodForDate(a, '2028-02-29')!.days).toContain('2028-02-29');
  });
});

describe('date navigation', () => {
  const anchors = ['2026-12-26']; // Saturday

  it('moves forward and back by exactly one period', () => {
    const first = getPeriodForDate(anchors, '2026-12-26')!;
    const next = getNextPeriod(anchors, first);
    expect(next.start).toBe('2027-01-02');
    expect(getPreviousPeriod(anchors, next)!.start).toBe('2026-12-26');
  });

  it('cannot go back before the first tracking week', () => {
    const first = getPeriodForDate(anchors, '2026-12-26')!;
    expect(getPreviousPeriod(anchors, first)).toBeNull();
  });

  it('shows the first week as current before tracking starts', () => {
    expect(getCurrentPeriod(anchors, '2026-12-01').start).toBe('2026-12-26');
  });

  it('numbers weeks from the first tracking week', () => {
    const third = getPeriodForDate(anchors, '2027-01-10')!;
    expect(getWeekNumber(anchors, third)).toBe(3);
    expect(getWeekNumber(anchors, getPeriodForDate(anchors, '2026-12-26')!)).toBe(1);
  });
});

describe('changing the week-start day', () => {
  const sat = ['2026-11-07'];

  it('leaves the current and past weeks untouched', () => {
    // Today is Wed Nov 11 (inside the Sat Nov 7 – Fri Nov 13 week). Switch to Monday.
    const next = scheduleWithNewWeekStart(sat, MON, '2026-11-11', '2026-11-07');
    expect(next).toEqual(['2026-11-07', '2026-11-16']);
    expect(getPeriodForDate(next, '2026-11-09')).toMatchObject({ start: '2026-11-07', end: '2026-11-13' });
  });

  it('shortens only the transition week, then continues in 7-day Monday weeks', () => {
    const next = scheduleWithNewWeekStart(sat, MON, '2026-11-11', '2026-11-07');
    const transition = getPeriodForDate(next, '2026-11-14')!;
    expect(transition).toMatchObject({ start: '2026-11-14', end: '2026-11-15' });
    expect(transition.days).toHaveLength(2);
    const monday = getPeriodForDate(next, '2026-11-17')!;
    expect(monday).toMatchObject({ start: '2026-11-16', end: '2026-11-22' });
  });

  it('does nothing when the day is unchanged', () => {
    expect(scheduleWithNewWeekStart(sat, SAT, '2026-11-11', '2026-11-07')).toEqual(sat);
  });

  it('replaces a pending change instead of stacking them', () => {
    const pending = scheduleWithNewWeekStart(sat, MON, '2026-11-11', '2026-11-07');
    const again = scheduleWithNewWeekStart(pending, 0, '2026-11-12', '2026-11-07'); // Sunday
    expect(again).toEqual(['2026-11-07', '2026-11-15']);
  });

  it('rebuilds freely if tracking has not started', () => {
    expect(scheduleWithNewWeekStart(sat, MON, '2026-10-01', '2026-11-07')).toEqual(['2026-11-07']);
  });

  it('reorganizes everything only when explicitly requested', () => {
    expect(scheduleFromScratch('2026-11-07', MON)).toEqual(['2026-11-07']);
  });
});
