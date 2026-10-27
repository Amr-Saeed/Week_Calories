import type { CaloriePlan, Units } from '@/types';
import { ACTIVITY_MULTIPLIERS, KCAL_PER_KG } from '@/lib/calories';
import { formatKcal, formatNumber, formatWeightChange } from '@/lib/format';
import { goalLabel } from '@/lib/labels';
import type { ProfileInput } from '@/lib/schemas';
import { Alert, Card, SectionTitle, Stat, WarningList } from './ui';

export function GoalSummary({ plan, units, input }: { plan: CaloriePlan; units: Units; input: ProfileInput }) {
  const goalText = plan.mode === 'manual' ? 'Custom target' : goalLabel(plan.weightGoal);
  const base = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age;
  return (
    <Card role="region" aria-label="Goal summary">
      <SectionTitle>Your goal summary</SectionTitle>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3">
        <Stat label="Maintenance" value={formatKcal(plan.maintenanceKcal)} sub="Estimated per day" />
        <Stat label="Daily target" value={formatKcal(plan.dailyTarget)} sub={plan.mode === 'manual' ? 'Entered by you' : 'Calculated'} />
        <Stat label="Weekly budget" value={formatKcal(plan.weeklyBudget)} sub={`${formatNumber(plan.dailyTarget)} × 7`} />
        <Stat label="Weight goal" value={<span className="text-lg">{goalText}</span>} />
        <Stat
          label="Expected change"
          value={`≈ ${formatWeightChange(plan.expectedWeeklyChangeKg, units)}`}
          sub="per week, if intake matches the target"
        />
      </dl>

      {plan.warnings.length > 0 && (
        <div className="mt-4">
          <WarningList warnings={plan.warnings} />
        </div>
      )}

      <details className="mt-4 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
        <summary className="cursor-pointer font-medium">How these numbers are calculated</summary>
        <ol className="mt-3 list-decimal space-y-2 pl-5 leading-relaxed text-slate-700 dark:text-slate-300">
          <li>
            <strong>BMR</strong> (Mifflin–St Jeor): 10 × {input.weightKg} kg + 6.25 × {input.heightCm} cm − 5 × {input.age} {input.sex === 'male' ? '+ 5' : '− 161'} ={' '}
            <strong>{formatNumber(base + (input.sex === 'male' ? 5 : -161))} kcal</strong>
          </li>
          <li>
            <strong>Maintenance</strong> = BMR × {ACTIVITY_MULTIPLIERS[input.activityLevel]} (activity) = <strong>{formatKcal(plan.maintenanceKcal)}</strong>
          </li>
          <li>
            <strong>Target</strong>: {plan.mode === 'manual' ? 'the number you entered, used as is' : `maintenance minus the daily deficit for your goal (${formatNumber(KCAL_PER_KG)} kcal ≈ 1 kg of body weight)`} ={' '}
            <strong>{formatKcal(plan.dailyTarget)}</strong>
          </li>
          <li>
            <strong>Weekly budget</strong> = {formatNumber(plan.dailyTarget)} × 7 = <strong>{formatKcal(plan.weeklyBudget)}</strong>
          </li>
        </ol>
      </details>

      <div className="mt-4">
        <Alert tone="info">
          These are estimates, not exact predictions. Metabolism, water retention and tracking accuracy vary, so real weight changes will differ. This app does not give medical advice.
        </Alert>
      </div>
    </Card>
  );
}
