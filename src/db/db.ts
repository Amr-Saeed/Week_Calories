import Dexie, { type Table } from 'dexie';
import type { DailyLog, TargetVersion, TrackingSettings, UserProfile } from '@/types';

/**
 * IndexedDB schema (via Dexie).
 * - `logs.date` is a unique index → a second record for the same date is rejected by the database.
 * - `targetVersions` keeps every calorie target the user has had, so history never shifts.
 */
export class CalWeekDB extends Dexie {
  profile!: Table<UserProfile, string>;
  settings!: Table<TrackingSettings, string>;
  targetVersions!: Table<TargetVersion, string>;
  logs!: Table<DailyLog, string>;

  constructor(name = 'calweek') {
    super(name);
    this.version(1).stores({
      profile: 'id',
      settings: 'id',
      targetVersions: 'id, effectiveFrom',
      logs: 'id, &date',
    });
  }
}

export const db = new CalWeekDB();
