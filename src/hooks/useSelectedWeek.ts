import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { isValidISODate } from '@/lib/dates';
import { getCurrentPeriod, getNextPeriod, getPeriodForDate, getPreviousPeriod, getWeekNumber } from '@/lib/week';
import type { ISODate, WeekPeriod } from '@/types';

/** Week chosen through the URL (`/<base>/:start`), defaulting to the current week. */
export function useSelectedWeek(anchors: readonly ISODate[], today: ISODate, base: 'week' | 'report') {
  const { start } = useParams();
  const navigate = useNavigate();

  return useMemo(() => {
    const current = getCurrentPeriod(anchors, today);
    const requested = start && isValidISODate(start) ? getPeriodForDate(anchors, start) : null;
    const period: WeekPeriod = requested ?? current;
    const prev = getPreviousPeriod(anchors, period);
    const go = (p: WeekPeriod | null) => p && navigate(`/${base}/${p.start}`);
    return {
      period,
      weekNumber: getWeekNumber(anchors, period),
      isCurrent: period.start === current.start,
      canGoBack: prev !== null,
      goPrev: () => go(prev),
      goNext: () => go(getNextPeriod(anchors, period)),
      goCurrent: () => navigate(`/${base}`),
    };
  }, [anchors, today, start, base, navigate]);
}
