import { useAppData, useWeekSummary } from '@/hooks/useData';
import { useSelectedWeek } from '@/hooks/useSelectedWeek';
import { useToday } from '@/hooks/useToday';
import { WeekNav } from '@/components/WeekNav';
import { BudgetDonut, DailyVsTargetChart, TrendChart } from '@/components/charts';
import { Alert, Card, PageHeader, SectionTitle, Spinner, Stat } from '@/components/ui';
import { formatKcal, formatNumber, formatSigned, formatWeightChange, pct } from '@/lib/format';
import { formatDayMonth, formatWeekdayShort } from '@/lib/dates';
import { STATUS_LABEL } from '@/lib/labels';
import type { WeekSummary } from '@/lib/summary';
import type { Units } from '@/types';

export default function ReportPage() {
  const { settings } = useAppData();
  const today = useToday();
  if (!settings) return <Spinner />;
  return <ReportInner anchors={settings.weekAnchors} units={settings.preferredUnits} today={today} />;
}

function ReportInner({ anchors, units, today }: { anchors: string[]; units: Units; today: string }) {
  const sel = useSelectedWeek(anchors, today, 'report');
  const s = useWeekSummary(sel.period, today);

  return (
    <div>
      <PageHeader title="Weekly report" />
      <WeekNav period={sel.period} weekNumber={sel.weekNumber} state={s?.state} canGoBack={sel.canGoBack} isCurrent={sel.isCurrent} onPrev={sel.goPrev} onNext={sel.goNext} onToday={sel.goCurrent} />
      {!s ? <Spinner /> : <Report s={s} units={units} />}
    </div>
  );
}

function Report({ s, units }: { s: WeekSummary; units: Units }) {
  if (s.state === 'upcoming') {
    return <Alert tone="info" title="This week hasn't started yet">Its report will fill in as you log each day. Budget for the week: {formatKcal(s.weeklyBudget)}.</Alert>;
  }

  return (
    <div className="space-y-5">
      {s.state === 'incomplete' && (
        <Alert tone="warning" title={`Incomplete week — ${s.loggedDays} of ${s.totalDays} days logged`}>
          The totals below only cover the days you logged. Missing days are <strong>not</strong> counted as 0 calories, so this isn't a full result, and weight change can't be estimated.
        </Alert>
      )}
      {s.state === 'in-progress' && (
        <Alert tone="info" title={`In progress — ${s.loggedDays} of ${s.totalDays} days logged`}>
          This report updates as you log. The weekly result is finalised once every day is logged.
        </Alert>
      )}
      {s.targetChangedDuringWeek && (
        <Alert tone="info">Your calorie target changed during this week, so the budget adds up each day's own target.</Alert>
      )}

      <Card>
        <SectionTitle>{s.isComplete ? 'Week at a glance' : 'So far this week'}</SectionTitle>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3">
          <Stat label="Weekly budget" value={formatNumber(s.weeklyBudget)} sub="kcal" />
          <Stat label={s.isComplete ? 'Total consumed' : 'Consumed (logged days)'} value={formatNumber(s.weeklyConsumed)} sub="kcal" />
          <Stat label="Average per logged day" value={s.averageDailyIntake === null ? '—' : formatNumber(s.averageDailyIntake)} sub={s.averageDailyIntake === null ? 'Nothing logged yet' : 'kcal'} />
          <Stat label="Days logged" value={`${s.loggedDays} / ${s.totalDays}`} />
          <Stat
            label={s.isComplete ? 'Vs weekly budget' : 'Vs budget of logged days'}
            value={formatSigned(s.isComplete ? s.weeklyDifference : s.differenceVsLoggedDaysBudget)}
            sub={`kcal ${(s.isComplete ? s.weeklyDifference : s.differenceVsLoggedDaysBudget) > 0 ? 'over' : 'under'}`}
            tone={(s.isComplete ? s.weeklyDifference : s.differenceVsLoggedDaysBudget) > 0 ? 'bad' : undefined}
          />
          <Stat label="Budget used" value={s.budgetUsagePercentage === null ? '—' : pct(s.budgetUsagePercentage)} sub={s.isComplete ? undefined : 'of the full week'} />
        </dl>
        <div className="mt-5 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-sky-100 px-3 py-1 font-medium text-sky-800 dark:bg-sky-500/15 dark:text-sky-300">{s.underDays} under</span>
          <span className="rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">{s.onDays} on target</span>
          <span className="rounded-full bg-rose-100 px-3 py-1 font-medium text-rose-800 dark:bg-rose-500/15 dark:text-rose-300">{s.overDays} over</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">{s.missingDays} not logged</span>
        </div>
      </Card>

      <Card>
        <SectionTitle hint="Eating below your target and losing weight are not the same thing — weight depends on maintenance calories.">What this means</SectionTitle>
        <ul className="space-y-3 text-sm leading-relaxed">
          <li>
            <strong>Against your budget: </strong>
            {s.loggedDays === 0
              ? 'nothing has been logged yet.'
              : s.isComplete
                ? s.weeklyDifference === 0
                  ? `you consumed exactly your ${formatKcal(s.weeklyBudget)} budget.`
                  : `you consumed ${formatKcal(Math.abs(s.weeklyDifference))} ${s.weeklyDifference < 0 ? 'below' : 'above'} your weekly target budget of ${formatKcal(s.weeklyBudget)}.`
                : `on the ${s.loggedDays} day${s.loggedDays === 1 ? '' : 's'} you logged, you were ${formatKcal(Math.abs(s.differenceVsLoggedDaysBudget))} ${s.differenceVsLoggedDaysBudget <= 0 ? 'below' : 'above'} the budget for those days.`}
          </li>
          <li>
            <strong>Against maintenance: </strong>
            {s.caloriesVsMaintenance === null
              ? 'needs every day logged. Until then this can only be a partial picture.'
              : `you consumed approximately ${formatKcal(Math.abs(s.caloriesVsMaintenance))} ${s.caloriesVsMaintenance <= 0 ? 'below' : 'above'} your estimated weekly maintenance of ${formatKcal(s.weeklyMaintenance)}.`}
          </li>
          <li>
            <strong>Estimated weight change: </strong>
            {s.estimatedWeightChangeKg === null ? (
              <>
                can't be estimated for an incomplete week.
                {s.loggedDaysEstimate && (
                  <span className="text-slate-500 dark:text-slate-400">
                    {' '}Looking only at the {s.loggedDaysEstimate.days} logged day{s.loggedDaysEstimate.days === 1 ? '' : 's'}, intake would be about {formatWeightChange(s.loggedDaysEstimate.weightChangeKg, units)} relative to maintenance — this is not a weekly result.
                  </span>
                )}
              </>
            ) : (
              <>≈ <strong>{formatWeightChange(s.estimatedWeightChangeKg, units)}</strong> (a rough estimate, not a measured change).</>
            )}
          </li>
          <li>
            <strong>Compared with your plan: </strong>
            {s.goalComparison === null || s.estimatedWeightChangeKg === null
              ? `your targets this week plan for about ${formatWeightChange(s.plannedWeightChangeKg, units)} if every day matches its target.`
              : `your targets planned for about ${formatWeightChange(s.plannedWeightChangeKg, units)}. ${
                  s.goalComparison === 'on-plan'
                    ? 'The estimate is in line with that plan.'
                    : s.goalComparison === 'lower-than-plan'
                      ? 'The estimate is lower than planned (more loss or less gain).'
                      : 'The estimate is higher than planned (less loss or more gain).'
                }`}
          </li>
        </ul>
        <div className="mt-4">
          <Alert tone="info">
            Estimates use about 7,700 kcal per kg and your estimated maintenance. Eating exactly your weekly budget doesn't guarantee a specific weight change, and actual weight will vary — water, salt, hormones and tracking error all play a part.
          </Alert>
        </div>
      </Card>

      <Card>
        <SectionTitle hint="Colour shows whether each day was under, on, or over its target.">Daily intake vs target</SectionTitle>
        <DailyVsTargetChart days={s.days} />
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <SectionTitle>Weekly budget used</SectionTitle>
          <BudgetDonut summary={s} />
        </Card>
        <Card>
          <SectionTitle hint="Days you didn't log appear as gaps.">Daily trend</SectionTitle>
          <TrendChart days={s.days} average={s.averageDailyIntake} />
        </Card>
      </div>

      <Card>
        <details>
          <summary className="cursor-pointer text-sm font-medium">View the numbers as a table</summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500 dark:text-slate-400">
                <tr><th className="py-2 pr-3">Day</th><th className="py-2 pr-3 text-right">Intake</th><th className="py-2 pr-3 text-right">Target</th><th className="py-2">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {s.days.map((d) => (
                  <tr key={d.date}>
                    <td className="py-2 pr-3">{formatWeekdayShort(d.date)} {formatDayMonth(d.date)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{d.calories === null ? '—' : formatNumber(d.calories)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{formatNumber(d.target)}</td>
                    <td className="py-2">{STATUS_LABEL[d.status]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </Card>
    </div>
  );
}
