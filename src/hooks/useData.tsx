import { createContext, useContext, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { DailyLog, ISODate, TargetVersion, TrackingSettings, UserProfile, WeekPeriod } from '@/types';
import { buildWeekSummary, type WeekSummary } from '@/lib/summary';
import { makeTargetResolver } from '@/lib/targets';

interface AppData {
  /** false until IndexedDB has answered the first time */
  ready: boolean;
  profile: UserProfile | null;
  settings: TrackingSettings | null;
  versions: TargetVersion[];
}

const Ctx = createContext<AppData | null>(null);

/** Live view of profile/settings/targets: any write to IndexedDB re-renders consumers automatically. */
export function DataProvider({ children }: { children: ReactNode }) {
  const profile = useLiveQuery(async () => (await db.profile.get('me')) ?? null, []);
  const settings = useLiveQuery(async () => (await db.settings.get('main')) ?? null, []);
  const versions = useLiveQuery(() => db.targetVersions.orderBy('effectiveFrom').toArray(), []);
  const ready = profile !== undefined && settings !== undefined && versions !== undefined;
  return (
    <Ctx.Provider value={{ ready, profile: profile ?? null, settings: settings ?? null, versions: versions ?? [] }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAppData(): AppData {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAppData must be used inside <DataProvider>');
  return v;
}

export function useLogs(start: ISODate, end: ISODate): DailyLog[] | undefined {
  return useLiveQuery(() => db.logs.where('date').between(start, end, true, true).toArray(), [start, end]);
}

export function useLog(date: ISODate): DailyLog | null | undefined {
  return useLiveQuery(async () => (await db.logs.get(`log-${date}`)) ?? null, [date]);
}

/** Summary for one period, recalculated whenever logs or targets change. */
export function useWeekSummary(period: WeekPeriod, today: ISODate): WeekSummary | null {
  const { versions } = useAppData();
  const logs = useLogs(period.start, period.end);
  if (!logs) return null;
  return buildWeekSummary({ period, logs, resolveTargets: makeTargetResolver(versions), today });
}
