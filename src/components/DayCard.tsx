import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { DayInfo } from '@/lib/summary';
import { formatDayMonth, formatWeekdayLong } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { cx, ProgressBar, StatusBadge } from './ui';

/** One day in the week calendar. The whole card opens that day's logging page. */
export function DayCard({ day }: { day: DayInfo }) {
  const logged = day.calories !== null;
  const diff = day.difference ?? 0;
  return (
    <Link
      to={`/day/${day.date}`}
      className={cx(
        'group block rounded-2xl border bg-white p-4 shadow-card transition-colors hover:border-brand-400 dark:bg-slate-900 dark:hover:border-brand-500',
        day.isToday ? 'border-brand-500 ring-1 ring-brand-500/40' : 'border-slate-200/70 dark:border-slate-800',
        day.isFuture && 'opacity-80',
      )}
      aria-label={`${formatWeekdayLong(day.date)}, ${formatDayMonth(day.date)}. ${logged ? `${formatNumber(day.calories!)} of ${formatNumber(day.target)} kcal.` : 'Not logged yet.'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">
            {formatWeekdayLong(day.date)}
            {day.isToday && <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-800 dark:bg-brand-500/20 dark:text-brand-300">Today</span>}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{formatDayMonth(day.date)}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={day.status} />
          <ChevronRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-2xl font-semibold tabular-nums tracking-tight">
          {logged ? formatNumber(day.calories!) : '—'}
          <span className="ml-1 text-sm font-normal text-slate-500 dark:text-slate-400">/ {formatNumber(day.target)} kcal</span>
        </p>
        <p className="text-right text-sm tabular-nums text-slate-600 dark:text-slate-300">
          {logged ? (diff > 0 ? `${formatNumber(diff)} over` : `${formatNumber(-diff)} left`) : day.isFuture ? 'Upcoming' : 'Tap to log'}
        </p>
      </div>
      <ProgressBar className="mt-3" value={day.progress ?? 0} status={day.status} label={`${formatWeekdayLong(day.date)} progress`} />
    </Link>
  );
}
