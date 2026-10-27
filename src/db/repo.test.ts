import { beforeEach, describe, expect, it } from 'vitest';
import { CalWeekDB } from './db';
import { createRepo, mealsTotal, ValidationError } from './repo';
import type { ProfileInput } from '@/lib/schemas';

const profile: ProfileInput = {
  age: 30,
  sex: 'male',
  heightCm: 180,
  weightKg: 80,
  activityLevel: 'moderate',
  workoutsPerWeek: 3,
  calorieTargetMode: 'manual',
  weightGoal: 'moderate',
  customDailyCalorieTarget: 2000,
};

let db: CalWeekDB;
let repo: ReturnType<typeof createRepo>;

beforeEach(async () => {
  db = new CalWeekDB(`test-${Math.random()}`);
  repo = createRepo(db);
  await repo.completeOnboarding({
    profile,
    weekStartDay: 6,
    firstTrackingDate: '2026-11-07',
    preferredUnits: 'metric',
    theme: 'system',
    today: '2026-11-07',
  });
});

describe('onboarding', () => {
  it('stores profile, settings and a first target version', async () => {
    expect((await db.profile.get('me'))?.customDailyCalorieTarget).toBe(2000);
    expect((await db.settings.get('main'))?.weekAnchors).toEqual(['2026-11-07']);
    const versions = await repo.getVersions();
    expect(versions).toHaveLength(1);
    expect(versions[0].dailyTarget).toBe(2000);
  });

  it('rejects invalid profile data', async () => {
    await expect(
      repo.completeOnboarding({ profile: { ...profile, age: -5 }, weekStartDay: 6, firstTrackingDate: '2026-11-07', preferredUnits: 'metric', theme: 'system', today: '2026-11-07' }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('daily logs', () => {
  it('saves and edits a day without creating duplicates', async () => {
    await repo.saveLog({ date: '2026-11-09', totalCalories: 1800 }, '2026-11-10');
    await repo.saveLog({ date: '2026-11-09', totalCalories: 2100 }, '2026-11-10');
    const all = await db.logs.toArray();
    expect(all).toHaveLength(1);
    expect(all[0].totalCalories).toBe(2100);
  });

  it('keeps createdAt when editing', async () => {
    const first = await repo.saveLog({ date: '2026-11-09', totalCalories: 1800 }, '2026-11-10');
    const second = await repo.saveLog({ date: '2026-11-09', totalCalories: 1900 }, '2026-11-10');
    expect(second.createdAt).toBe(first.createdAt);
  });

  it('rejects negative, non-integer and absurd values', async () => {
    await expect(repo.saveLog({ date: '2026-11-09', totalCalories: -1 }, '2026-11-10')).rejects.toBeInstanceOf(ValidationError);
    await expect(repo.saveLog({ date: '2026-11-09', totalCalories: 1800.5 }, '2026-11-10')).rejects.toBeInstanceOf(ValidationError);
    await expect(repo.saveLog({ date: '2026-11-09', totalCalories: 99999 }, '2026-11-10')).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects future dates and dates before tracking began', async () => {
    await expect(repo.saveLog({ date: '2026-11-12', totalCalories: 1800 }, '2026-11-10')).rejects.toThrow(/future/);
    await expect(repo.saveLog({ date: '2026-11-01', totalCalories: 1800 }, '2026-11-10')).rejects.toThrow(/before your first/);
  });

  it('accepts zero calories as a real entry, and clearing returns to not logged', async () => {
    await repo.saveLog({ date: '2026-11-09', totalCalories: 0 }, '2026-11-10');
    expect((await db.logs.get('log-2026-11-09'))?.totalCalories).toBe(0);
    await repo.clearLog('2026-11-09');
    expect(await db.logs.get('log-2026-11-09')).toBeUndefined();
  });

  it('calculates the total from a meal breakdown', async () => {
    const log = await repo.saveLog(
      { date: '2026-11-09', totalCalories: 1, meals: { breakfast: 400, lunch: 700, dinner: 600, snacks: 100 } },
      '2026-11-10',
    );
    expect(log.totalCalories).toBe(1800);
    expect(mealsTotal({ breakfast: 400 })).toBe(400);
    expect(mealsTotal({})).toBeNull();
  });

  it('enforces one record per date at the database level', async () => {
    await repo.saveLog({ date: '2026-11-09', totalCalories: 1800 }, '2026-11-10');
    const dup = { ...(await db.logs.get('log-2026-11-09'))!, id: 'log-other' };
    await expect(db.logs.add(dup)).rejects.toThrow();
  });
});

describe('historical target snapshots', () => {
  it('does not rewrite earlier days when the target changes later', async () => {
    await repo.saveLog({ date: '2026-11-08', totalCalories: 1900 }, '2026-11-10');
    await repo.saveProfile({ ...profile, customDailyCalorieTarget: 1700 }, '2026-11-10');

    const old = await db.logs.get('log-2026-11-08');
    expect(old?.snapshot.dailyTarget).toBe(2000);

    await repo.saveLog({ date: '2026-11-10', totalCalories: 1650 }, '2026-11-10');
    expect((await db.logs.get('log-2026-11-10'))?.snapshot.dailyTarget).toBe(1700);
  });

  it('keeps the original snapshot when an old day is edited after a target change', async () => {
    await repo.saveLog({ date: '2026-11-08', totalCalories: 1900 }, '2026-11-10');
    await repo.saveProfile({ ...profile, customDailyCalorieTarget: 1700 }, '2026-11-10');
    await repo.saveLog({ date: '2026-11-08', totalCalories: 2000 }, '2026-11-10');
    expect((await db.logs.get('log-2026-11-08'))?.snapshot.dailyTarget).toBe(2000);
  });

  it('back-fills a missed past day with the target that was in force that day', async () => {
    await repo.saveProfile({ ...profile, customDailyCalorieTarget: 1700 }, '2026-11-10');
    await repo.saveLog({ date: '2026-11-08', totalCalories: 1900 }, '2026-11-11');
    expect((await db.logs.get('log-2026-11-08'))?.snapshot.dailyTarget).toBe(2000);
  });

  it('applies a same-day target change to the logs already saved today', async () => {
    await repo.saveLog({ date: '2026-11-10', totalCalories: 1650 }, '2026-11-10');
    await repo.saveProfile({ ...profile, customDailyCalorieTarget: 1700 }, '2026-11-10');
    expect((await db.logs.get('log-2026-11-10'))?.snapshot.dailyTarget).toBe(1700);
  });

  it('records the profile used for each version', async () => {
    await repo.saveProfile({ ...profile, weightKg: 78, customDailyCalorieTarget: 1900 }, '2026-11-14');
    const versions = await repo.getVersions();
    expect(versions.map((v) => v.inputs.weightKg)).toEqual([80, 78]);
  });
});

describe('week settings', () => {
  it('changing the week-start day only affects future weeks', async () => {
    await repo.updateSettings({ weekStartDay: 1 }, '2026-11-11');
    expect((await db.settings.get('main'))?.weekAnchors).toEqual(['2026-11-07', '2026-11-16']);
  });

  it('changing the first tracking date reorganises everything', async () => {
    await repo.updateSettings({ firstTrackingDate: '2026-11-14' }, '2026-11-11');
    expect((await db.settings.get('main'))?.weekAnchors).toEqual(['2026-11-14']);
  });

  it('can reorganise when the user explicitly asks', async () => {
    await repo.updateSettings({ weekStartDay: 1 }, '2026-11-11', { reorganize: true });
    expect((await db.settings.get('main'))?.weekAnchors).toEqual(['2026-11-09']);
  });
});

describe('reset', () => {
  it('clears all data', async () => {
    await repo.saveLog({ date: '2026-11-09', totalCalories: 1800 }, '2026-11-10');
    await repo.resetAll();
    expect(await db.profile.count()).toBe(0);
    expect(await db.logs.count()).toBe(0);
  });
});
