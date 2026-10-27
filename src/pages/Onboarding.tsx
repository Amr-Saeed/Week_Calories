import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import type { Units, WeekdayIndex } from '@/types';
import { repo, ValidationError } from '@/db/repo';
import { useToday } from '@/hooks/useToday';
import { BodyFields, TargetFields } from '@/components/ProfileFields';
import { GoalSummary } from '@/components/GoalSummary';
import { Alert, Button, Card, Segmented, SelectField, TextField } from '@/components/ui';
import { bodyInputs, convertDraftUnits, emptyDraft, validateDraft, type ProfileDraft } from '@/lib/draft';
import { buildPlan } from '@/lib/calories';
import { formatFull, formatRange, isValidISODate, WEEKDAY_NAMES, weekdayOf, addDays } from '@/lib/dates';
import { resolveFirstAnchor } from '@/lib/week';
import { applyTheme } from '@/hooks/useTheme';

const STEPS = ['About you', 'Calorie goal', 'Tracking week'];

export default function Onboarding() {
  const today = useToday();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [units, setUnits] = useState<Units>('metric');
  const [draft, setDraft] = useState<ProfileDraft>(emptyDraft);
  const [showErrors, setShowErrors] = useState(false);
  const [weekStartDay, setWeekStartDay] = useState<WeekdayIndex>(() => weekdayOf(today));
  const [firstDate, setFirstDate] = useState(today);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const patch = (p: Partial<ProfileDraft>) => setDraft((d) => ({ ...d, ...p }));
  const changeUnits = (next: Units) => {
    setDraft((d) => convertDraftUnits(d, units, next));
    setUnits(next);
  };

  const full = useMemo(() => validateDraft(draft, units), [draft, units]);
  const bodyOnly = useMemo(() => validateDraft({ ...draft, calorieTargetMode: 'auto' }, units), [draft, units]);
  const body = useMemo(() => bodyInputs(draft, units), [draft, units]);
  const plan = full.input ? buildPlan(full.input) : null;

  const errors = showErrors ? (step === 0 ? bodyOnly.errors : full.errors) : {};

  const next = () => {
    if (step === 0) {
      if (!bodyOnly.input) return setShowErrors(true);
    } else if (step === 1) {
      if (!full.input) return setShowErrors(true);
    }
    setShowErrors(false);
    setStep((s) => s + 1);
  };

  const dateOk = isValidISODate(firstDate);
  const anchor = dateOk ? resolveFirstAnchor(firstDate, weekStartDay) : null;

  const finish = async () => {
    if (!full.input || !anchor) return;
    setSaving(true);
    setSubmitError(null);
    try {
      await repo.completeOnboarding({ profile: full.input, weekStartDay, firstTrackingDate: firstDate, preferredUnits: units, theme: 'dark', today });
      applyTheme('dark');
      navigate('/', { replace: true });
    } catch (e) {
      setSubmitError(e instanceof ValidationError ? e.message : 'Something went wrong while saving. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-8 sm:px-6">
      <header className="mb-6 text-center">
        <img src="/favicon.svg" alt="" className="mx-auto h-14 w-14" />
        <h1 className="mt-3 text-2xl font-bold tracking-tight">Welcome to CalWeek</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">A calorie tracker built around your week, not just your day. Everything stays on this device.</p>
      </header>

      <ol className="mb-6 flex items-center justify-center gap-2" aria-label="Progress">
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-2" aria-current={i === step ? 'step' : undefined}>
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                i < step ? 'bg-brand-600 text-white' : i === step ? 'bg-brand-100 text-brand-800 ring-2 ring-brand-500 dark:bg-brand-500/20 dark:text-brand-200' : 'bg-slate-200 text-slate-500 dark:bg-slate-800'
              }`}
            >
              {i < step ? <Check className="h-4 w-4" aria-hidden="true" /> : i + 1}
            </span>
            <span className={`hidden text-sm sm:inline ${i === step ? 'font-semibold' : 'text-slate-500'}`}>{label}</span>
            {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-slate-300 dark:bg-slate-700" aria-hidden="true" />}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <Card>
          <h2 className="mb-1 text-lg font-semibold">Tell us about you</h2>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">We use this to estimate how many calories your body uses each day.</p>
          <div className="mb-4 max-w-xs">
            <Segmented label="Units" value={units} onChange={changeUnits} options={[{ value: 'metric', label: 'kg · cm' }, { value: 'imperial', label: 'lb · ft/in' }]} />
          </div>
          <BodyFields draft={draft} units={units} errors={errors} onChange={patch} />
        </Card>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <Card>
            <h2 className="mb-1 text-lg font-semibold">Choose your calorie target</h2>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">Let the app calculate a target from your goal, or use your own number.</p>
            <TargetFields draft={draft} errors={errors} body={body} onChange={patch} />
          </Card>
          {plan && full.input && <GoalSummary plan={plan} units={units} input={full.input} />}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <Card>
            <h2 className="mb-1 text-lg font-semibold">Set up your tracking week</h2>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">Pick the day your week starts and the day you want to begin tracking.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField label="Week starts on" value={weekStartDay} onChange={(e) => setWeekStartDay(Number(e.target.value) as WeekdayIndex)}>
                {WEEKDAY_NAMES.map((name, i) => (
                  <option key={name} value={i}>{name}</option>
                ))}
              </SelectField>
              <TextField
                label="First tracking week begins"
                type="date"
                value={firstDate}
                onChange={(e) => setFirstDate(e.target.value)}
                error={dateOk ? undefined : 'Choose a valid date'}
              />
            </div>
            {anchor && (
              <div className="mt-4 space-y-2">
                <Alert tone="success">
                  Week 1 runs <strong>{formatRange(anchor, addDays(anchor, 6))}</strong>, then every {WEEKDAY_NAMES[weekStartDay]} starts a new 7-day week.
                </Alert>
                {anchor !== firstDate && (
                  <Alert tone="info">
                    {formatFull(firstDate)} isn't a {WEEKDAY_NAMES[weekStartDay]}, so tracking begins on the next one: {formatFull(anchor)}.
                  </Alert>
                )}
              </div>
            )}
          </Card>
          {plan && full.input && <GoalSummary plan={plan} units={units} input={full.input} />}
          {submitError && <Alert tone="error">{submitError}</Alert>}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => { setShowErrors(false); setStep((s) => s - 1); }} disabled={step === 0}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
        </Button>
        {step < 2 ? (
          <Button onClick={next}>
            Continue <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button onClick={finish} disabled={saving || !anchor || !full.input}>
            {saving ? 'Saving…' : 'Start tracking'}
          </Button>
        )}
      </div>
    </div>
  );
}
