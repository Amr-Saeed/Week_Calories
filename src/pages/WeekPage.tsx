import { Link } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import { useAppData, useWeekSummary } from '@/hooks/useData';
import { useSelectedWeek } from '@/hooks/useSelectedWeek';
import { useToday } from '@/hooks/useToday';
import { DayCard } from '@/components/DayCard';
import { WeekNav } from '@/components/WeekNav';
import { Alert, Button, PageHeader, Spinner } from '@/components/ui';
import { formatKcal } from '@/lib/format';

export default function WeekPage() {
  const { settings } = useAppData();
  const today = useToday();
  if (!settings) return <Spinner />;
  return <WeekInner anchors={settings.weekAnchors} today={today} />;
}

function WeekInner({ anchors, today }: { anchors: string[]; today: string }) {
  const sel = useSelectedWeek(anchors, today, 'week');
  const summary = useWeekSummary(sel.period, today);

  return (
    <div>
      <PageHeader
        title="Weekly calendar"
        subtitle={summary ? `${formatKcal(summary.weeklyConsumed)} of ${formatKcal(summary.weeklyBudget)} · ${summary.loggedDays}/${summary.totalDays} days logged` : undefined}
      />
      <WeekNav
        period={sel.period}
        weekNumber={sel.weekNumber}
        state={summary?.state}
        canGoBack={sel.canGoBack}
        isCurrent={sel.isCurrent}
        onPrev={sel.goPrev}
        onNext={sel.goNext}
        onToday={sel.goCurrent}
      />
      {!summary ? (
        <Spinner />
      ) : (
        <>
          {summary.targetChangedDuringWeek && (
            <div className="mb-3">
              <Alert tone="info">Your calorie target changed during this week. Each day is compared with the target that applied to it.</Alert>
            </div>
          )}
          <ul className="space-y-3">
            {summary.days.map((d) => (
              <li key={d.date}>
                <DayCard day={d} />
              </li>
            ))}
          </ul>
          <div className="mt-5">
            <Link to={`/report/${sel.period.start}`}>
              <Button variant="secondary" className="w-full sm:w-auto"><BarChart3 className="h-4 w-4" aria-hidden="true" />Weekly report</Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
