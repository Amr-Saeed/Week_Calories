import type { CaloriePlan, CalculationInputs, ISODate, TargetSnapshot, TargetVersion } from '@/types';
import type { TargetResolver } from './summary';

/**
 * Which target version applies to a date: the latest one that started on or before it.
 * Dates before the first version fall back to that first version.
 */
export function resolveVersion(versions: readonly TargetVersion[], date: ISODate): TargetVersion | undefined {
  if (versions.length === 0) return undefined;
  const sorted = [...versions].sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? -1 : 1));
  let found = sorted[0];
  for (const v of sorted) {
    if (v.effectiveFrom <= date) found = v;
    else break;
  }
  return found;
}

export function makeTargetResolver(versions: readonly TargetVersion[]): TargetResolver {
  return (date) => {
    const v = resolveVersion(versions, date);
    return v ? { dailyTarget: v.dailyTarget, maintenanceKcal: v.maintenanceKcal } : { dailyTarget: 0, maintenanceKcal: 0 };
  };
}

export function snapshotOf(v: TargetVersion): TargetSnapshot {
  return {
    versionId: v.id,
    dailyTarget: v.dailyTarget,
    maintenanceKcal: v.maintenanceKcal,
    expectedWeeklyChangeKg: v.expectedWeeklyChangeKg,
    mode: v.mode,
    weightGoal: v.weightGoal,
  };
}

export function versionFromPlan(args: {
  plan: CaloriePlan;
  inputs: CalculationInputs;
  effectiveFrom: ISODate;
  now: string;
}): TargetVersion {
  const { plan, inputs, effectiveFrom, now } = args;
  return {
    id: `tv-${effectiveFrom}`,
    effectiveFrom,
    dailyTarget: plan.dailyTarget,
    maintenanceKcal: plan.maintenanceKcal,
    bmr: plan.bmr,
    mode: plan.mode,
    weightGoal: plan.weightGoal,
    expectedWeeklyChangeKg: plan.expectedWeeklyChangeKg,
    inputs: { ...inputs },
    createdAt: now,
  };
}
