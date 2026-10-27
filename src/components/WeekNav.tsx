import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { WeekPeriod } from '@/types';
import { formatRange } from '@/lib/dates';
import { Button, Pill } from './ui';
import type { WeekState } from '@/lib/summary';

const STATE_PILL: Record<WeekState, { label: string; tone: 'slate' | 'amber' | 'emerald' | 'sky' }> = {
  upcoming: { label: 'Upcoming', tone: 'slate' },
  'in-progress': { label: 'In progress', tone: 'sky' },
  complete: { label: 'Complete', tone: 'emerald' },
  incomplete: { label: 'Incomplete', tone: 'amber' },
};

interface Props {
  period: WeekPeriod;
  weekNumber: number;
  state?: WeekState;
  canGoBack: boolean;
  isCurrent: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

export function WeekNav({ period, weekNumber, state, canGoBack, isCurrent, onPrev, onNext, onToday }: Props) {
  const pill = state ? STATE_PILL[state] : null;
  return (
    <div className="mb-4 flex items-center gap-2">
      <Button variant="secondary" aria-label="Previous week" onClick={onPrev} disabled={!canGoBack} className="!px-3">
        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
      </Button>
      <div className="min-w-0 flex-1 text-center" aria-live="polite">
        <p className="truncate text-base font-semibold tracking-tight">{formatRange(period.start, period.end)}</p>
        <p className="mt-0.5 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          Week {weekNumber}
          {period.days.length < 7 && <span>· {period.days.length}-day transition week</span>}
          {pill && <Pill tone={pill.tone}>{pill.label}</Pill>}
        </p>
      </div>
      <Button variant="secondary" aria-label="Next week" onClick={onNext} className="!px-3">
        <ChevronRight className="h-5 w-5" aria-hidden="true" />
      </Button>
      {!isCurrent && (
        <Button variant="ghost" size="sm" onClick={onToday} className="hidden sm:inline-flex">
          This week
        </Button>
      )}
    </div>
  );
}
