import { describe, expect, it } from 'vitest';
import { makeTargetResolver, resolveVersion } from './targets';
import type { TargetVersion } from '@/types';

const v = (effectiveFrom: string, dailyTarget: number): TargetVersion => ({
  id: `tv-${effectiveFrom}`,
  effectiveFrom,
  dailyTarget,
  maintenanceKcal: 2500,
  bmr: 1700,
  mode: 'auto',
  weightGoal: 'moderate',
  expectedWeeklyChangeKg: -0.5,
  inputs: { age: 30, sex: 'male', heightCm: 180, weightKg: 80, activityLevel: 'moderate', workoutsPerWeek: 3 },
  createdAt: '',
});

describe('target versions', () => {
  const versions = [v('2026-11-20', 1800), v('2026-11-07', 2000)]; // deliberately unsorted

  it('picks the version in force on a date', () => {
    expect(resolveVersion(versions, '2026-11-07')!.dailyTarget).toBe(2000);
    expect(resolveVersion(versions, '2026-11-19')!.dailyTarget).toBe(2000);
    expect(resolveVersion(versions, '2026-11-20')!.dailyTarget).toBe(1800);
    expect(resolveVersion(versions, '2027-03-01')!.dailyTarget).toBe(1800);
  });

  it('falls back to the first version for earlier dates', () => {
    expect(resolveVersion(versions, '2026-10-01')!.dailyTarget).toBe(2000);
  });

  it('returns a resolver usable by the weekly summary', () => {
    const r = makeTargetResolver(versions);
    expect(r('2026-11-25')).toEqual({ dailyTarget: 1800, maintenanceKcal: 2500 });
  });
});
