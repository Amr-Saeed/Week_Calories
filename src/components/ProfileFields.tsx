import { AlertTriangle } from 'lucide-react';
import type { Units, WeightGoal } from '@/types';
import type { ProfileDraft } from '@/lib/draft';
import { ACTIVITY_OPTIONS, GOAL_OPTIONS } from '@/lib/labels';
import { MANUAL_TARGET_MAX, MANUAL_TARGET_MIN, planFromGoal, suggestActivityLevel } from '@/lib/calories';
import { formatNumber } from '@/lib/format';
import type { ProfileInput } from '@/lib/schemas';
import { cx, Segmented, SelectField, TextField } from './ui';

type Patch = (p: Partial<ProfileDraft>) => void;

interface BodyProps { draft: ProfileDraft; units: Units; errors: Record<string, string>; onChange: Patch }

export function BodyFields({ draft, units, errors, onChange }: BodyProps) {
  const imperial = units === 'imperial';
  const workouts = Number(draft.workoutsPerWeek);
  const suggestion = Number.isFinite(workouts) && draft.workoutsPerWeek !== '' ? suggestActivityLevel(workouts) : null;
  const suggestionLabel = suggestion ? ACTIVITY_OPTIONS.find((o) => o.value === suggestion)!.label : null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField label="Age" type="number" inputMode="numeric" value={draft.age} onChange={(e) => onChange({ age: e.target.value })} error={errors.age} suffix="years" autoComplete="off" />
      <div>
        <span id="sex-label" className="mb-1.5 block text-sm font-medium">Sex</span>
        <Segmented
          label="Sex"
          value={draft.sex}
          onChange={(sex) => onChange({ sex })}
          options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]}
        />
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Used only by the metabolic formula (Mifflin–St Jeor).</p>
      </div>

      {imperial ? (
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Height" type="number" inputMode="numeric" value={draft.heightFt} onChange={(e) => onChange({ heightFt: e.target.value })} suffix="ft" error={errors.height} />
          <TextField label="&nbsp;" aria-label="Height, inches" type="number" inputMode="numeric" value={draft.heightIn} onChange={(e) => onChange({ heightIn: e.target.value })} suffix="in" />
        </div>
      ) : (
        <TextField label="Height" type="number" inputMode="decimal" value={draft.height} onChange={(e) => onChange({ height: e.target.value })} suffix="cm" error={errors.height} />
      )}
      <TextField
        label="Current weight"
        type="number"
        inputMode="decimal"
        step="0.1"
        value={draft.weight}
        onChange={(e) => onChange({ weight: e.target.value })}
        suffix={imperial ? 'lb' : 'kg'}
        error={errors.weight}
      />

      <SelectField
        label="Activity level"
        value={draft.activityLevel}
        onChange={(e) => onChange({ activityLevel: e.target.value as ProfileDraft['activityLevel'] })}
        hint={ACTIVITY_OPTIONS.find((o) => o.value === draft.activityLevel)?.hint}
      >
        {ACTIVITY_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label} ({o.hint})</option>
        ))}
      </SelectField>
      <TextField
        label="Workouts per week"
        type="number"
        inputMode="numeric"
        value={draft.workoutsPerWeek}
        onChange={(e) => onChange({ workoutsPerWeek: e.target.value })}
        error={errors.workoutsPerWeek}
        hint={
          suggestion && suggestion !== draft.activityLevel
            ? `That many workouts usually fits "${suggestionLabel}". Your activity level above is what the calculation uses.`
            : undefined
        }
      />
      <TextField label="Workout type (optional)" value={draft.workoutType} onChange={(e) => onChange({ workoutType: e.target.value })} placeholder="e.g. strength, running" maxLength={60} error={errors.workoutType} />
      <TextField
        label="Goal weight (optional)"
        type="number"
        inputMode="decimal"
        step="0.1"
        value={draft.goalWeight}
        onChange={(e) => onChange({ goalWeight: e.target.value })}
        suffix={imperial ? 'lb' : 'kg'}
        error={errors.goalWeight}
      />
    </div>
  );
}

interface TargetProps {
  draft: ProfileDraft;
  errors: Record<string, string>;
  body: ProfileInput | null;
  onChange: Patch;
}

export function TargetFields({ draft, errors, body, onChange }: TargetProps) {
  return (
    <div className="space-y-4">
      <Segmented
        label="How should your daily calorie target be set?"
        value={draft.calorieTargetMode}
        onChange={(calorieTargetMode) => onChange({ calorieTargetMode })}
        options={[{ value: 'auto', label: 'Calculate for me' }, { value: 'manual', label: 'I\'ll enter my own' }]}
      />

      {draft.calorieTargetMode === 'auto' ? (
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Weight goal</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {GOAL_OPTIONS.map((o) => {
              const active = draft.weightGoal === o.value;
              const plan = body ? planFromGoal(body, o.value) : null;
              return (
                <label
                  key={o.value}
                  className={cx(
                    'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors focus-within:ring-2 focus-within:ring-brand-500',
                    active ? 'border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-500/10' : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600',
                  )}
                >
                  <input type="radio" name="weightGoal" className="mt-1 accent-emerald-600" checked={active} onChange={() => onChange({ weightGoal: o.value as WeightGoal })} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-sm font-semibold">
                      {o.label}
                      {o.value === 'aggressive' && <AlertTriangle className="h-4 w-4 text-amber-600" aria-label="May be unsuitable for some people" />}
                    </span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">{o.rate}</span>
                    {plan && (
                      <span className="mt-1 block text-sm tabular-nums">
                        {formatNumber(plan.dailyTarget)} kcal/day{plan.floorApplied && <span className="text-amber-700 dark:text-amber-400"> (minimum applied)</span>}
                      </span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : (
        <div className="space-y-3">
          <TextField
            label="Daily calorie target"
            type="number"
            inputMode="numeric"
            value={draft.customTarget}
            onChange={(e) => onChange({ customTarget: e.target.value })}
            suffix="kcal"
            error={errors.customTarget}
            hint={`Between ${formatNumber(MANUAL_TARGET_MIN)} and ${formatNumber(MANUAL_TARGET_MAX)}. This number is used exactly as entered and never overwritten.`}
          />
        </div>
      )}
    </div>
  );
}
