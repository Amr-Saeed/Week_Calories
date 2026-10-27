import type { CalWeekDB } from './db';
import { db as defaultDb } from './db';
import type {
  DailyLog,
  ISODate,
  MealBreakdown,
  TargetVersion,
  TrackingSettings,
  UserProfile,
  WeekdayIndex,
} from '@/types';
import { buildPlan } from '@/lib/calories';
import {
  dailyLogInputSchema,
  profileInputSchema,
  trackingSettingsInputSchema,
  type DailyLogInput,
  type ProfileInput,
} from '@/lib/schemas';
import { compareDates } from '@/lib/dates';
import { resolveVersion, snapshotOf, versionFromPlan } from '@/lib/targets';
import { scheduleFromScratch, scheduleWithNewWeekStart } from '@/lib/week';

export class ValidationError extends Error {
  constructor(message: string, public readonly field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

const nowISO = () => new Date().toISOString();

export function mealsTotal(meals: MealBreakdown | undefined): number | null {
  if (!meals) return null;
  const values = Object.values(meals).filter((v): v is number => typeof v === 'number');
  return values.length === 0 ? null : values.reduce((a, b) => a + b, 0);
}

function parseProfile(input: ProfileInput): ProfileInput {
  const parsed = profileInputSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message, String(parsed.error.issues[0].path[0] ?? ''));
  return parsed.data;
}

function profileToInputs(p: ProfileInput) {
  return {
    age: p.age,
    sex: p.sex,
    heightCm: p.heightCm,
    weightKg: p.weightKg,
    activityLevel: p.activityLevel,
    workoutsPerWeek: p.workoutsPerWeek,
  };
}

export function createRepo(db: CalWeekDB = defaultDb) {
  /** Write a new target version starting `effectiveFrom`, and re-snapshot logs on/after that date. */
  async function applyTargetVersion(profile: UserProfile, effectiveFrom: ISODate) {
    const plan = buildPlan(profile);
    const version = versionFromPlan({ plan, inputs: profileToInputs(profile), effectiveFrom, now: nowISO() });
    await db.targetVersions.put(version);
    // Days from `effectiveFrom` onward belong to the new target; earlier days are never touched.
    const affected = await db.logs.where('date').aboveOrEqual(effectiveFrom).toArray();
    for (const log of affected) {
      await db.logs.put({ ...log, snapshot: snapshotOf(version) });
    }
    return version;
  }

  return {
    /** First-run setup: profile + tracking settings + first target version in one transaction. */
    async completeOnboarding(args: {
      profile: ProfileInput;
      weekStartDay: WeekdayIndex;
      firstTrackingDate: ISODate;
      preferredUnits: 'metric' | 'imperial';
      theme: 'light' | 'dark' | 'system';
      today: ISODate;
    }) {
      const profileInput = parseProfile(args.profile);
      const s = trackingSettingsInputSchema.safeParse({
        weekStartDay: args.weekStartDay,
        firstTrackingDate: args.firstTrackingDate,
        preferredUnits: args.preferredUnits,
        theme: args.theme,
      });
      if (!s.success) throw new ValidationError(s.error.issues[0].message, String(s.error.issues[0].path[0] ?? ''));

      const now = nowISO();
      const profile: UserProfile = { ...profileInput, id: 'me', createdAt: now, updatedAt: now };
      const settings: TrackingSettings = {
        id: 'main',
        weekStartDay: args.weekStartDay,
        firstTrackingDate: args.firstTrackingDate,
        weekAnchors: scheduleFromScratch(args.firstTrackingDate, args.weekStartDay),
        preferredUnits: args.preferredUnits,
        theme: args.theme,
      };
      await db.transaction('rw', [db.profile, db.settings, db.targetVersions, db.logs], async () => {
        await db.profile.put(profile);
        await db.settings.put(settings);
        // First version starts on whichever is earlier: today or the first tracked day.
        const from = compareDates(args.today, settings.weekAnchors[0]) < 0 ? args.today : settings.weekAnchors[0];
        await applyTargetVersion(profile, from);
      });
    },

    /**
     * Save profile/target edits. The new calorie target applies from `today` onward;
     * earlier days keep the target they were logged against.
     */
    async saveProfile(input: ProfileInput, today: ISODate) {
      const data = parseProfile(input);
      await db.transaction('rw', [db.profile, db.targetVersions, db.logs], async () => {
        const existing = await db.profile.get('me');
        const now = nowISO();
        const profile: UserProfile = { ...data, id: 'me', createdAt: existing?.createdAt ?? now, updatedAt: now };
        await db.profile.put(profile);
        await applyTargetVersion(profile, today);
      });
    },

    async updateSettings(
      patch: Partial<Pick<TrackingSettings, 'weekStartDay' | 'firstTrackingDate' | 'preferredUnits' | 'theme'>>,
      today: ISODate,
      options: { reorganize?: boolean } = {},
    ) {
      await db.transaction('rw', db.settings, async () => {
        const current = await db.settings.get('main');
        if (!current) throw new ValidationError('Tracking is not set up yet');
        const next: TrackingSettings = { ...current, ...patch };
        const parsed = trackingSettingsInputSchema.safeParse(next);
        if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message, String(parsed.error.issues[0].path[0] ?? ''));

        const firstChanged = patch.firstTrackingDate !== undefined && patch.firstTrackingDate !== current.firstTrackingDate;
        const dayChanged = patch.weekStartDay !== undefined && patch.weekStartDay !== current.weekStartDay;
        if (firstChanged || (dayChanged && options.reorganize)) {
          // Explicit reorganisation: all periods are rebuilt from the new first date / day.
          next.weekAnchors = scheduleFromScratch(next.firstTrackingDate, next.weekStartDay);
        } else if (dayChanged) {
          // Default: only future weeks change; past and current weeks stay as they are.
          next.weekAnchors = scheduleWithNewWeekStart(current.weekAnchors, next.weekStartDay, today, next.firstTrackingDate);
        }
        await db.settings.put(next);
      });
    },

    /** Create or edit the log for one day. Editing keeps the original target snapshot. */
    async saveLog(input: DailyLogInput, today: ISODate): Promise<DailyLog> {
      const withTotal: DailyLogInput = { ...input };
      const mt = mealsTotal(input.meals);
      if (mt !== null) withTotal.totalCalories = mt;
      const parsed = dailyLogInputSchema.safeParse(withTotal);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message, String(parsed.error.issues[0].path[0] ?? ''));
      const data = parsed.data;
      if (compareDates(data.date, today) > 0) throw new ValidationError("You can't log calories for a future date", 'date');

      return db.transaction('rw', [db.settings, db.targetVersions, db.logs], async () => {
        const settings = await db.settings.get('main');
        if (!settings) throw new ValidationError('Tracking is not set up yet');
        if (compareDates(data.date, settings.weekAnchors[0]) < 0) {
          throw new ValidationError('This date is before your first tracking week', 'date');
        }
        const id = `log-${data.date}`;
        const existing = await db.logs.get(id);
        const now = nowISO();
        let snapshot = existing?.snapshot;
        if (!snapshot) {
          const versions = await db.targetVersions.toArray();
          const v = resolveVersion(versions, data.date);
          if (!v) throw new ValidationError('No calorie target is set up yet');
          snapshot = snapshotOf(v);
        }
        const log: DailyLog = {
          id,
          date: data.date,
          totalCalories: data.totalCalories,
          meals: mt !== null ? data.meals : undefined,
          notes: data.notes ? data.notes : undefined,
          snapshot,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        };
        await db.logs.put(log);
        return log;
      });
    },

    /** Remove a day's entry so it goes back to "not logged" (never stored as 0). */
    async clearLog(date: ISODate) {
      await db.logs.delete(`log-${date}`);
    },

    async resetAll() {
      await db.transaction('rw', [db.profile, db.settings, db.targetVersions, db.logs], async () => {
        await Promise.all([db.profile.clear(), db.settings.clear(), db.targetVersions.clear(), db.logs.clear()]);
      });
    },

    async exportAll() {
      const [profile, settings, targetVersions, logs] = await Promise.all([
        db.profile.toArray(),
        db.settings.toArray(),
        db.targetVersions.toArray(),
        db.logs.orderBy('date').toArray(),
      ]);
      return { app: 'weekly-calorie-tracker', exportedAt: nowISO(), profile, settings, targetVersions, logs };
    },

    async getVersions(): Promise<TargetVersion[]> {
      return db.targetVersions.orderBy('effectiveFrom').toArray();
    },
  };
}

export const repo = createRepo();
