import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { repo, ValidationError, mealsTotal } from '@/db/repo';
import { useAppData, useLog } from '@/hooks/useData';
import { useToday } from '@/hooks/useToday';
import { Alert, Button, Card, ProgressBar, Segmented, Spinner, StatusBadge, TextField } from '@/components/ui';
import { addDays, compareDates, formatFull, isValidISODate } from '@/lib/dates';
import { dayStatus } from '@/lib/summary';
import { formatKcal, formatNumber } from '@/lib/format';
import { resolveVersion } from '@/lib/targets';
import { MAX_DAILY_CALORIES } from '@/lib/schemas';
import type { MealBreakdown } from '@/types';

type Mode = 'total' | 'meals';
const MEALS = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snacks', label: 'Snacks' },
] as const;

export default function DayPage() {
  const { date } = useParams();
  const { settings, versions } = useAppData();
  const today = useToday();
  if (!date || !isValidISODate(date)) return <Navigate to="/" replace />;
  if (!settings) return <Spinner />;
  return <DayForm key={date} date={date} today={today} firstDay={settings.weekAnchors[0]} versions={versions} />;
}

function DayForm({ date, today, firstDay, versions }: { date: string; today: string; firstDay: string; versions: ReturnType<typeof useAppData>['versions'] }) {
  const navigate = useNavigate();
  const log = useLog(date);
  const [mode, setMode] = useState<Mode>('total');
  const [total, setTotal] = useState('');
  const [meals, setMeals] = useState<Record<string, string>>({ breakfast: '', lunch: '', dinner: '', snacks: '' });
  const [notes, setNotes] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Fill the form once from any saved entry.
  useEffect(() => {
    if (loaded || log === undefined) return;
    if (log) {
      setTotal(String(log.totalCalories));
      setNotes(log.notes ?? '');
      if (log.meals && mealsTotal(log.meals) !== null) {
        setMode('meals');
        setMeals({
          breakfast: log.meals.breakfast?.toString() ?? '',
          lunch: log.meals.lunch?.toString() ?? '',
          dinner: log.meals.dinner?.toString() ?? '',
          snacks: log.meals.snacks?.toString() ?? '',
        });
      }
    }
    setLoaded(true);
  }, [log, loaded]);

  const future = compareDates(date, today) > 0;
  const beforeStart = compareDates(date, firstDay) < 0;
  const locked = future || beforeStart;

  const target = log ? log.snapshot.dailyTarget : (resolveVersion(versions, date)?.dailyTarget ?? 0);

  const parsedMeals = useMemo<MealBreakdown>(() => {
    const out: MealBreakdown = {};
    for (const { key } of MEALS) {
      const v = meals[key].trim();
      if (v !== '') out[key] = Number(v);
    }
    return out;
  }, [meals]);

  const entered = mode === 'meals' ? mealsTotal(parsedMeals) : total.trim() === '' ? null : Number(total);
  const valid = entered !== null && Number.isFinite(entered);
  const status = dayStatus(valid ? entered : null, target);
  const diff = valid ? entered - target : null;

  const goBack = () => {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate('/');
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (entered === null) return setError(mode === 'meals' ? 'Enter calories for at least one meal' : 'Enter the calories for this day');
    if (Number.isNaN(entered)) return setError('Enter a number');
    setBusy(true);
    try {
      await repo.saveLog(
        { date, totalCalories: entered, meals: mode === 'meals' ? parsedMeals : undefined, notes: notes.trim() || undefined },
        today,
      );
      goBack();
    } catch (err) {
      setError(err instanceof ValidationError ? err.message : 'Could not save. Please try again.');
      setBusy(false);
    }
  };

  const clear = async () => {
    if (!window.confirm('Remove this day\'s entry? It will go back to "not logged" (it will not count as 0 calories).')) return;
    await repo.clearLog(date);
    goBack();
  };

  const prev = compareDates(addDays(date, -1), firstDay) >= 0 ? addDays(date, -1) : null;
  const next = compareDates(addDays(date, 1), today) <= 0 ? addDays(date, 1) : null;

  if (log === undefined) return <Spinner />;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={goBack}><ArrowLeft className="h-4 w-4" aria-hidden="true" />Back</Button>
        <div className="flex gap-1">
          {prev ? <Link to={`/day/${prev}`} replace aria-label="Previous day"><Button variant="secondary" size="sm" className="!px-2.5" tabIndex={-1}><ChevronLeft className="h-4 w-4" /></Button></Link> : null}
          {next ? <Link to={`/day/${next}`} replace aria-label="Next day"><Button variant="secondary" size="sm" className="!px-2.5" tabIndex={-1}><ChevronRight className="h-4 w-4" /></Button></Link> : null}
        </div>
      </div>

      <h1 className="text-2xl font-bold tracking-tight">{formatFull(date)}</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Daily target: {formatKcal(target)}</p>

      {locked && (
        <div className="mt-4">
          <Alert tone="info">
            {future ? "You can't log calories for a future date. Come back on the day." : 'This date is before your first tracking week, so it is not tracked.'}
          </Alert>
        </div>
      )}

      <form onSubmit={save} className="mt-5 space-y-4" noValidate>
        <Card>
          <div className="mb-4 max-w-xs">
            <Segmented label="Entry type" value={mode} onChange={setMode} options={[{ value: 'total', label: 'Daily total' }, { value: 'meals', label: 'By meal' }]} />
          </div>

          {mode === 'total' ? (
            <TextField
              label="Total calories eaten"
              type="number"
              inputMode="numeric"
              min={0}
              max={MAX_DAILY_CALORIES}
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              suffix="kcal"
              disabled={locked}
              autoFocus={!locked}
              hint="Leave a day unlogged if you don't know — it won't count as 0."
            />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {MEALS.map(({ key, label }) => (
                <TextField
                  key={key}
                  label={label}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={meals[key]}
                  onChange={(e) => setMeals((m) => ({ ...m, [key]: e.target.value }))}
                  suffix="kcal"
                  disabled={locked}
                />
              ))}
              <p className="col-span-2 text-sm text-slate-600 dark:text-slate-300">
                Total: <strong className="tabular-nums">{entered === null ? '—' : formatKcal(entered)}</strong>
              </p>
            </div>
          )}

          {valid && !locked && (
            <div className="mt-5" aria-live="polite">
              <div className="mb-2 flex items-center justify-between">
                <StatusBadge status={status} />
                <span className="text-sm font-medium tabular-nums">
                  {diff! > 0 ? `${formatNumber(diff!)} kcal over` : `${formatNumber(-diff!)} kcal remaining`}
                </span>
              </div>
              <ProgressBar value={target > 0 ? entered! / target : 0} status={status} label="Progress toward today's target" />
            </div>
          )}
        </Card>

        <Card>
          <TextField label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} disabled={locked} placeholder="e.g. birthday dinner" />
        </Card>

        {error && <Alert tone="error">{error}</Alert>}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={busy || locked} className="min-w-[120px]">{log ? 'Save changes' : 'Save'}</Button>
          <Button type="button" variant="secondary" onClick={goBack}>Cancel</Button>
          {log && (
            <Button type="button" variant="ghost" onClick={clear} className="ml-auto text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10">
              <Trash2 className="h-4 w-4" aria-hidden="true" />Clear entry
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
