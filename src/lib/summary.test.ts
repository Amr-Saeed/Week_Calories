import { describe, expect, it } from 'vitest';
import { buildWeekSummary, dayStatus, estimatedWeightChange } from './summary';
import { getPeriodForDate } from './week';
import type { DailyLog, ISODate } from '@/types';

const anchors = ['2026-11-07']; // Saturday
const period = getPeriodForDate(anchors, '2026-11-07')!;

function log(date: ISODate, totalCalories: number, dailyTarget = 2000, maintenanceKcal = 2500): DailyLog {
  return {
    id: `log-${date}`,
    date,
    totalCalories,
    snapshot: { versionId: 'v1', dailyTarget, maintenanceKcal, expectedWeeklyChangeKg: 0, mode: 'auto', weightGoal: 'moderate' },
    createdAt: '',
    updatedAt: '',
  };
}

const resolve = () => ({ dailyTarget: 2000, maintenanceKcal: 2500 });

describe('daily status', () => {
  it('classifies under / on / over with a ±5% band and treats null as not logged', () => {
    expect(dayStatus(null, 2000)).toBe('not-logged');
    expect(dayStatus(1899, 2000)).toBe('under');
    expect(dayStatus(1900, 2000)).toBe('on');
    expect(dayStatus(2100, 2000)).toBe('on');
    expect(dayStatus(2101, 2000)).toBe('over');
  });

  it('treats a logged 0 differently from not logged', () => {
    expect(dayStatus(0, 2000)).toBe('under');
  });
});

describe('weekly report — the spec example (target 2,000; maintenance 2,500/day)', () => {
  const days = period.days;
  // 6 × 1,900 + 1,800 = 13,200
  const logs = days.map((d, i) => log(d, i === 6 ? 1800 : 1900));
  const s = buildWeekSummary({ period, logs, resolveTargets: resolve, today: '2026-11-14' });

  it('computes budget, total, difference and percentage', () => {
    expect(s.weeklyBudget).toBe(14000);
    expect(s.weeklyConsumed).toBe(13200);
    expect(s.weeklyDifference).toBe(-800);
    expect(s.budgetRemaining).toBe(800);
    expect(s.budgetUsagePercentage).toBeCloseTo(94.2857, 3);
  });

  it('averages over logged days', () => {
    expect(s.loggedDays).toBe(7);
    expect(s.averageDailyIntake).toBeCloseTo(13200 / 7, 5);
    expect(s.isComplete).toBe(true);
    expect(s.state).toBe('complete');
  });

  it('counts under / on / over days', () => {
    expect(s.underDays + s.onDays + s.overDays).toBe(7);
    expect(s.onDays).toBe(6); // 1,900 is within 5% of 2,000
    expect(s.underDays).toBe(1); // 1,800 is more than 5% below
    expect(s.overDays).toBe(0);
  });

  it('estimates weight change relative to maintenance, not to the target', () => {
    expect(s.weeklyMaintenance).toBe(17500);
    expect(s.caloriesVsMaintenance).toBe(-4300);
    expect(s.estimatedWeightChangeKg).toBeCloseTo(-4300 / 7700, 5); // ≈ -0.56 kg
    expect(s.plannedWeightChangeKg).toBeCloseTo(-3500 / 7700, 5); // eating the whole budget ≈ -0.45 kg
  });

  it('compares the estimate with the plan', () => {
    expect(s.goalComparison).toBe('on-plan'); // -0.56 vs -0.45 is within 0.15 kg
  });
});

describe('estimatedWeightChange', () => {
  it('is negative below maintenance and positive above it', () => {
    expect(estimatedWeightChange(17500 - 7700, 17500)).toBeCloseTo(-1, 5);
    expect(estimatedWeightChange(17500 + 3850, 17500)).toBeCloseTo(0.5, 5);
  });
});

describe('missing days', () => {
  it('never treats unlogged days as zero and marks the week incomplete', () => {
    const logs = [log('2026-11-07', 2000), log('2026-11-08', 1900), log('2026-11-09', 2200)];
    const s = buildWeekSummary({ period, logs, resolveTargets: resolve, today: '2026-11-20' });
    expect(s.loggedDays).toBe(3);
    expect(s.missingDays).toBe(4);
    expect(s.state).toBe('incomplete');
    expect(s.isComplete).toBe(false);
    expect(s.weeklyConsumed).toBe(6100);
    expect(s.averageDailyIntake).toBeCloseTo(6100 / 3, 5); // not 6100 / 7
    expect(s.estimatedWeightChangeKg).toBeNull();
    expect(s.caloriesVsMaintenance).toBeNull();
    expect(s.goalComparison).toBeNull();
    expect(s.loggedDaysEstimate?.days).toBe(3);
    expect(s.differenceVsLoggedDaysBudget).toBe(6100 - 6000);
    expect(s.days.filter((d) => d.calories === null)).toHaveLength(4);
  });

  it('has no average and no estimate when nothing is logged', () => {
    const s = buildWeekSummary({ period, logs: [], resolveTargets: resolve, today: '2026-11-10' });
    expect(s.loggedDays).toBe(0);
    expect(s.averageDailyIntake).toBeNull();
    expect(s.weeklyConsumed).toBe(0);
    expect(s.loggedDaysEstimate).toBeNull();
    expect(s.state).toBe('in-progress');
  });

  it('marks a week that has not started as upcoming and the running week as in progress', () => {
    expect(buildWeekSummary({ period, logs: [], resolveTargets: resolve, today: '2026-11-01' }).state).toBe('upcoming');
    expect(buildWeekSummary({ period, logs: [log('2026-11-07', 2000)], resolveTargets: resolve, today: '2026-11-09' }).state).toBe('in-progress');
  });

  it('flags today and future days', () => {
    const s = buildWeekSummary({ period, logs: [], resolveTargets: resolve, today: '2026-11-09' });
    expect(s.days.find((d) => d.isToday)?.date).toBe('2026-11-09');
    expect(s.days.filter((d) => d.isFuture)).toHaveLength(4);
  });
});

describe('historical target snapshots', () => {
  it('keeps old logs on their original target after the current target changes', () => {
    const old = [log('2026-11-07', 2000, 2000, 2500), log('2026-11-08', 2000, 2000, 2500)];
    const newResolve = () => ({ dailyTarget: 1700, maintenanceKcal: 2400 });
    const s = buildWeekSummary({ period, logs: old, resolveTargets: newResolve, today: '2026-11-09' });
    expect(s.days[0].target).toBe(2000);
    expect(s.days[1].target).toBe(2000);
    expect(s.days[2].target).toBe(1700); // unlogged days use whatever target applies to them
  });

  it('uses per-day targets for the budget when the target changes mid-week', () => {
    const resolveMixed = (d: ISODate) => (d < '2026-11-10' ? { dailyTarget: 2000, maintenanceKcal: 2500 } : { dailyTarget: 1800, maintenanceKcal: 2500 });
    const s = buildWeekSummary({ period, logs: [], resolveTargets: resolveMixed, today: '2026-11-08' });
    expect(s.weeklyBudget).toBe(3 * 2000 + 4 * 1800);
    expect(s.targetChangedDuringWeek).toBe(true);
  });

  it('scales the budget for a shortened transition week', () => {
    const short = getPeriodForDate(['2026-11-07', '2026-11-16'], '2026-11-14')!; // 2 days
    const s = buildWeekSummary({ period: short, logs: [], resolveTargets: resolve, today: '2026-11-14' });
    expect(s.totalDays).toBe(2);
    expect(s.weeklyBudget).toBe(4000);
  });
});
