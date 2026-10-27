import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, Plus, Pencil } from 'lucide-react';
import { useAppData, useWeekSummary } from '@/hooks/useData';
import { useToday } from '@/hooks/useToday';
import { Alert, Button, Card, ProgressBar, SectionTitle, Spinner, Stat, StatusBadge } from '@/components/ui';
import { formatFull, formatDayMonth, formatRange, formatWeekdayShort } from '@/lib/dates';
import { formatKcal, formatNumber, greetingFor, pct } from '@/lib/format';
import { getCurrentPeriod, getWeekNumber } from '@/lib/week';
import { compareDates } from '@/lib/dates';
import { cx } from '@/components/ui';
import type { TrackingSettings } from '@/types';

export default function Dashboard() {
  const { settings, profile } = useAppData();
  const today = useToday();
  if (!settings || !profile) return <Spinner />;
  return <DashboardInner settings={settings} today={today} />;
}

function DashboardInner({ settings, today }: { settings: TrackingSettings; today: string }) {
  const period = getCurrentPeriod(settings.weekAnchors, today);
  const summary = useWeekSummary(period, today);
  if (!summary) return <Spinner />;

  const notStarted = compareDates(today, settings.weekAnchors[0]) < 0;
  const todayInfo = summary.days.find((d) => d.isToday);
  const over = summary.weeklyConsumed > summary.weeklyBudget;
  const progress = summary.weeklyBudget > 0 ? summary.weeklyConsumed / summary.weeklyBudget : 0;

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm text-slate-500 dark:text-slate-400">{formatFull(today)}</p>
        <h1 className="text-2xl font-bold tracking-tight">{greetingFor(new Date())}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Week {getWeekNumber(settings.weekAnchors, period)} · {formatRange(period.start, period.end)}
        </p>
      </header>

      {notStarted && (
        <Alert tone="info" title="Tracking hasn't started yet">
          Your first tracking week begins on {formatFull(settings.weekAnchors[0])}. You can look around until then.
        </Alert>
      )}

      {/* Today */}
      {!notStarted && todayInfo && (
        <Card>
          <div className="flex items-start justify-between gap-3">
            <SectionTitle>Today</SectionTitle>
            <StatusBadge status={todayInfo.status} />
          </div>
          <div className="flex items-end justify-between gap-4">
            <p className="text-4xl font-bold tabular-nums tracking-tight">
              {todayInfo.calories === null ? '—' : formatNumber(todayInfo.calories)}
              <span className="ml-1.5 text-base font-normal text-slate-500 dark:text-slate-400">/ {formatKcal(todayInfo.target)}</span>
            </p>
            {todayInfo.difference !== null && (
              <p className={cx('text-sm font-medium tabular-nums', todayInfo.difference > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-300')}>
                {todayInfo.difference > 0 ? `${formatNumber(todayInfo.difference)} over` : `${formatNumber(-todayInfo.difference)} left`}
              </p>
            )}
          </div>
          <ProgressBar className="mt-3" value={todayInfo.progress ?? 0} status={todayInfo.status} label="Today's progress" />
          <Link to={`/day/${today}`} className="mt-4 block">
            <Button className="w-full">
              {todayInfo.logged ? <Pencil className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
              {todayInfo.logged ? "Edit today's calories" : "Log today's calories"}
            </Button>
          </Link>
        </Card>
      )}

      {/* Weekly budget */}
      <Card>
        <SectionTitle>This week's budget</SectionTitle>
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Budget" value={formatNumber(summary.weeklyBudget)} sub="kcal" />
          <Stat label="Consumed" value={formatNumber(summary.weeklyConsumed)} sub={`kcal · ${summary.loggedDays}/${summary.totalDays} days`} />
          <Stat
            label={over ? 'Over' : 'Remaining'}
            value={formatNumber(Math.abs(summary.budgetRemaining))}
            sub="kcal"
            tone={over ? 'bad' : undefined}
          />
        </div>
        <ProgressBar className="mt-4" value={progress} status={over ? 'over' : 'on'} label="Weekly budget used" />
        <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>{summary.budgetUsagePercentage === null ? '' : `${pct(summary.budgetUsagePercentage)} of budget`}</span>
          {summary.missingDays > 0 && summary.state !== 'upcoming' && <span>{summary.missingDays} day{summary.missingDays === 1 ? '' : 's'} not logged</span>}
        </div>
      </Card>

      {/* Seven-day overview */}
      <Card>
        <SectionTitle hint="Tap a day to log or edit it.">Your week</SectionTitle>
        <ul className="grid gap-2" style={{ gridTemplateColumns: `repeat(${summary.days.length}, minmax(0, 1fr))` }}>
          {summary.days.map((d) => (
            <li key={d.date}>
              <Link
                to={`/day/${d.date}`}
                aria-label={`${formatWeekdayShort(d.date)} ${formatDayMonth(d.date)}: ${d.calories === null ? 'not logged' : `${formatNumber(d.calories)} kcal`}`}
                className={cx(
                  'flex min-h-[88px] flex-col items-center justify-between rounded-xl border px-1 py-2 text-center transition-colors hover:border-brand-400',
                  d.isToday ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'border-slate-200 dark:border-slate-800',
                )}
              >
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{formatWeekdayShort(d.date)}</span>
                <span className="text-sm font-semibold tabular-nums">{d.date.slice(8)}</span>
                <span className={cx('h-2.5 w-2.5 rounded-full', { under: 'bg-sky-500', on: 'bg-emerald-500', over: 'bg-rose-500', 'not-logged': 'bg-slate-300 dark:bg-slate-600' }[d.status])} aria-hidden="true" />
                <span className="text-[11px] tabular-nums text-slate-500 dark:text-slate-400">{d.calories === null ? '—' : formatNumber(d.calories)}</span>
              </Link>
            </li>
          ))}
        </ul>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400" aria-label="Legend">
          <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-sky-500" aria-hidden="true" />Under</li>
          <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />On target</li>
          <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-500" aria-hidden="true" />Over</li>
          <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600" aria-hidden="true" />Not logged</li>
        </ul>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link to={`/report/${period.start}`}>
          <Button variant="secondary" className="w-full"><BarChart3 className="h-4 w-4" aria-hidden="true" />View weekly report</Button>
        </Link>
        <Link to={`/week/${period.start}`}>
          <Button variant="secondary" className="w-full">Open weekly calendar <ArrowRight className="h-4 w-4" aria-hidden="true" /></Button>
        </Link>
      </div>
    </div>
  );
}
