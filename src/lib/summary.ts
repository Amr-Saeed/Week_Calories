import type { DailyLog, DayStatus, ISODate, WeekPeriod } from '@/types';
import { KCAL_PER_KG } from './calories';
import { compareDates, weekdayOf } from './dates';

/** A day counts as "on target" within ±5% of its target. */
export const ON_TARGET_TOLERANCE = 0.05;
/** Estimated vs planned change within this many kg is described as "in line with the plan". */
export const GOAL_COMPARISON_TOLERANCE_KG = 0.15;

/** The calorie numbers that apply to a date that has no log of its own. */
export interface DayTargets {
  dailyTarget: number;
  maintenanceKcal: number;
}

export type TargetResolver = (date: ISODate) => DayTargets;

export function dayStatus(calories: number | null, target: number): DayStatus {
  if (calories === null) return 'not-logged';
  if (calories < target * (1 - ON_TARGET_TOLERANCE)) return 'under';
  if (calories > target * (1 + ON_TARGET_TOLERANCE)) return 'over';
  return 'on';
}

export interface DayInfo {
  date: ISODate;
  weekday: number;
  logged: boolean;
  /** `null` when not logged — never 0. */
  calories: number | null;
  target: number;
  maintenance: number;
  /** calories − target (positive = over). `null` when not logged. */
  difference: number | null;
  /** calories / target, `null` when not logged. May exceed 1. */
  progress: number | null;
  status: DayStatus;
  isToday: boolean;
  isFuture: boolean;
}

export type WeekState = 'upcoming' | 'in-progress' | 'complete' | 'incomplete';

export type GoalComparison = 'lower-than-plan' | 'on-plan' | 'higher-than-plan';

export interface WeekSummary {
  period: WeekPeriod;
  state: WeekState;
  days: DayInfo[];
  totalDays: number;
  loggedDays: number;
  missingDays: number;
  /** True only when every day in the period has a log. */
  isComplete: boolean;

  weeklyBudget: number;
  weeklyConsumed: number;
  /** consumed − budget (negative = under budget). Meaningful for complete weeks. */
  weeklyDifference: number;
  /** budget − consumed (negative = over budget). */
  budgetRemaining: number;
  /** consumed − budget of the logged days only; fair comparison for incomplete weeks. */
  differenceVsLoggedDaysBudget: number;
  budgetUsagePercentage: number | null;
  averageDailyIntake: number | null;

  underDays: number;
  onDays: number;
  overDays: number;

  weeklyMaintenance: number;
  /** consumed − maintenance, only for complete weeks (otherwise `null`). */
  caloriesVsMaintenance: number | null;
  /** Rough estimate; `null` unless the week is complete. */
  estimatedWeightChangeKg: number | null;
  /** Change planned by the targets for the whole period (target − maintenance). */
  plannedWeightChangeKg: number;
  goalComparison: GoalComparison | null;
  /** Estimate from logged days only, shown (clearly labelled) for incomplete weeks. */
  loggedDaysEstimate: { days: number; weightChangeKg: number } | null;
  /** True if more than one daily target applied inside this period. */
  targetChangedDuringWeek: boolean;
}

export function estimatedWeightChange(consumed: number, maintenance: number): number {
  return (consumed - maintenance) / KCAL_PER_KG;
}

export function buildWeekSummary(args: {
  period: WeekPeriod;
  logs: readonly DailyLog[];
  resolveTargets: TargetResolver;
  today: ISODate;
}): WeekSummary {
  const { period, logs, resolveTargets, today } = args;
  const byDate = new Map(logs.map((l) => [l.date, l]));

  const days: DayInfo[] = period.days.map((date) => {
    const log = byDate.get(date);
    // A logged day keeps the target it was logged against; unlogged days use the target in force.
    const t = log
      ? { dailyTarget: log.snapshot.dailyTarget, maintenanceKcal: log.snapshot.maintenanceKcal }
      : resolveTargets(date);
    const calories = log ? log.totalCalories : null;
    return {
      date,
      weekday: weekdayOf(date),
      logged: log !== undefined,
      calories,
      target: t.dailyTarget,
      maintenance: t.maintenanceKcal,
      difference: calories === null ? null : calories - t.dailyTarget,
      progress: calories === null || t.dailyTarget <= 0 ? null : calories / t.dailyTarget,
      status: dayStatus(calories, t.dailyTarget),
      isToday: date === today,
      isFuture: compareDates(date, today) > 0,
    };
  });

  const logged = days.filter((d) => d.logged);
  const totalDays = days.length;
  const loggedDays = logged.length;
  const isComplete = loggedDays === totalDays && totalDays > 0;

  const weeklyBudget = days.reduce((s, d) => s + d.target, 0);
  const weeklyConsumed = logged.reduce((s, d) => s + (d.calories ?? 0), 0);
  const loggedBudget = logged.reduce((s, d) => s + d.target, 0);
  const weeklyMaintenance = days.reduce((s, d) => s + d.maintenance, 0);
  const loggedMaintenance = logged.reduce((s, d) => s + d.maintenance, 0);

  const plannedWeightChangeKg = estimatedWeightChange(weeklyBudget, weeklyMaintenance);
  const estimatedWeightChangeKg = isComplete ? estimatedWeightChange(weeklyConsumed, weeklyMaintenance) : null;

  let goalComparison: GoalComparison | null = null;
  if (estimatedWeightChangeKg !== null) {
    const delta = estimatedWeightChangeKg - plannedWeightChangeKg;
    goalComparison =
      Math.abs(delta) <= GOAL_COMPARISON_TOLERANCE_KG ? 'on-plan' : delta < 0 ? 'lower-than-plan' : 'higher-than-plan';
  }

  let state: WeekState;
  if (isComplete) state = 'complete';
  else if (compareDates(period.start, today) > 0) state = 'upcoming';
  else if (compareDates(period.end, today) >= 0) state = 'in-progress';
  else state = 'incomplete';

  return {
    period,
    state,
    days,
    totalDays,
    loggedDays,
    missingDays: totalDays - loggedDays,
    isComplete,
    weeklyBudget,
    weeklyConsumed,
    weeklyDifference: weeklyConsumed - weeklyBudget,
    budgetRemaining: weeklyBudget - weeklyConsumed,
    differenceVsLoggedDaysBudget: weeklyConsumed - loggedBudget,
    budgetUsagePercentage: weeklyBudget > 0 ? (weeklyConsumed / weeklyBudget) * 100 : null,
    averageDailyIntake: loggedDays > 0 ? weeklyConsumed / loggedDays : null,
    underDays: logged.filter((d) => d.status === 'under').length,
    onDays: logged.filter((d) => d.status === 'on').length,
    overDays: logged.filter((d) => d.status === 'over').length,
    weeklyMaintenance,
    caloriesVsMaintenance: isComplete ? weeklyConsumed - weeklyMaintenance : null,
    estimatedWeightChangeKg,
    plannedWeightChangeKg,
    goalComparison,
    loggedDaysEstimate:
      loggedDays > 0 && !isComplete
        ? { days: loggedDays, weightChangeKg: estimatedWeightChange(weeklyConsumed, loggedMaintenance) }
        : null,
    targetChangedDuringWeek: new Set(days.map((d) => d.target)).size > 1,
  };
}
