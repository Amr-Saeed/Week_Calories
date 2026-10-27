import type { ActivityLevel, DayStatus, WeightGoal } from '@/types';
import { ACTIVITY_MULTIPLIERS } from '@/lib/calories';

export const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; hint: string; multiplier: number }[] = [
  { value: 'sedentary', label: 'Sedentary', hint: 'Desk job, little or no exercise', multiplier: ACTIVITY_MULTIPLIERS.sedentary },
  { value: 'light', label: 'Lightly active', hint: 'Light exercise or sport 1–3 days/week', multiplier: ACTIVITY_MULTIPLIERS.light },
  { value: 'moderate', label: 'Moderately active', hint: 'Moderate exercise 3–5 days/week', multiplier: ACTIVITY_MULTIPLIERS.moderate },
  { value: 'very', label: 'Very active', hint: 'Hard exercise 6–7 days/week', multiplier: ACTIVITY_MULTIPLIERS.very },
  { value: 'extra', label: 'Extra active', hint: 'Very hard daily training, or a physical job such as construction, often plus exercise', multiplier: ACTIVITY_MULTIPLIERS.extra },
];

export const GOAL_OPTIONS: { value: WeightGoal; label: string; rate: string }[] = [
  { value: 'maintain', label: 'Maintain weight', rate: 'Stay about the same' },
  { value: 'mild', label: 'Mild weight loss', rate: '≈ 0.25 kg / week' },
  { value: 'moderate', label: 'Weight loss', rate: '≈ 0.5 kg / week' },
  { value: 'aggressive', label: 'Aggressive weight loss', rate: '≈ 1 kg / week' },
];

export const goalLabel = (g: WeightGoal) => GOAL_OPTIONS.find((o) => o.value === g)!.label;
export const activityLabel = (a: ActivityLevel) => ACTIVITY_OPTIONS.find((o) => o.value === a)!.label;

export const STATUS_LABEL: Record<DayStatus, string> = {
  under: 'Under target',
  on: 'On target',
  over: 'Over target',
  'not-logged': 'Not logged yet',
};

export const STATUS_CHART_COLOR: Record<DayStatus, string> = {
  under: '#0ea5e9',
  on: '#10b981',
  over: '#f43f5e',
  'not-logged': '#94a3b8',
};
