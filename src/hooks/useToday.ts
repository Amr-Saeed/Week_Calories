import { useEffect, useState } from 'react';
import { todayISO } from '@/lib/dates';
import type { ISODate } from '@/types';

/**
 * The user's current local calendar date. It refreshes at midnight and whenever the app
 * returns to the foreground, so a tab left open overnight never logs to yesterday.
 */
export function useToday(): ISODate {
  const [today, setToday] = useState<ISODate>(() => todayISO());

  useEffect(() => {
    let timer: number | undefined;
    const refresh = () => setToday((prev) => {
      const now = todayISO();
      return now === prev ? prev : now;
    });
    const schedule = () => {
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
      timer = window.setTimeout(() => {
        refresh();
        schedule();
      }, next.getTime() - now.getTime());
    };
    schedule();
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  return today;
}
