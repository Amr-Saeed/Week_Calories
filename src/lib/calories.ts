import type {
  ActivityLevel,
  CalculationInputs,
  CaloriePlan,
  PlanWarning,
  Sex,
  UserProfile,
  WeightGoal,
} from '@/types';

/** Approximate energy equivalent of 1 kg of body-weight change. A rough rule of thumb only. */
export const KCAL_PER_KG = 7700;

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
  extra: 1.9,
};

/** Target loss rate (kg/week) for each goal. */
export const GOAL_RATES: Record<WeightGoal, number> = {
  maintain: 0,
  mild: 0.25,
  moderate: 0.5,
  aggressive: 1,
};

/** Commonly used lower limits for unsupervised dieting. */
export const MINIMUM_SAFE_KCAL: Record<Sex, number> = { male: 1500, female: 1200 };

/** A manual target outside this range is rejected as a probable typo. */
export const MANUAL_TARGET_MIN = 800;
export const MANUAL_TARGET_MAX = 6000;

/** A deficit larger than this share of maintenance is flagged. */
const LARGE_DEFICIT_RATIO = 0.25;

export const roundKcal = (n: number) => Math.round(n);

/** Mifflin–St Jeor: 10·kg + 6.25·cm − 5·age + (5 male | −161 female). */
export function calcBmr({ sex, weightKg, heightCm, age }: Pick<CalculationInputs, 'sex' | 'weightKg' | 'heightCm' | 'age'>): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return roundKcal(base + (sex === 'male' ? 5 : -161));
}

export function calcTdee(bmr: number, activityLevel: ActivityLevel): number {
  return roundKcal(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
}

/** Daily calorie change needed for a weekly weight change of `kgPerWeek`. */
export function dailyEnergyChange(kgPerWeek: number): number {
  return roundKcal((kgPerWeek * KCAL_PER_KG) / 7);
}

export function weeklyBudget(dailyTarget: number, days = 7): number {
  return dailyTarget * days;
}

/** Weight change (kg) implied by eating `dailyTarget` while maintaining at `maintenance`, per week. */
export function expectedWeeklyChangeKg(dailyTarget: number, maintenance: number): number {
  return ((dailyTarget - maintenance) * 7) / KCAL_PER_KG;
}

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

/** Rough suggestion for an activity level from workouts/week — shown as a hint, never applied silently. */
export function suggestActivityLevel(workoutsPerWeek: number): ActivityLevel {
  if (workoutsPerWeek <= 0) return 'sedentary';
  if (workoutsPerWeek <= 2) return 'light';
  if (workoutsPerWeek <= 4) return 'moderate';
  if (workoutsPerWeek <= 6) return 'very';
  return 'extra';
}

type PlanInputs = CalculationInputs & { goalWeightKg?: number };

function sharedWarnings(inputs: PlanInputs, goal: WeightGoal, out: PlanWarning[]) {
  if (inputs.goalWeightKg !== undefined) {
    const losing = GOAL_RATES[goal] > 0;
    if (losing && inputs.goalWeightKg >= inputs.weightKg) {
      out.push({
        code: 'goal-weight-mismatch',
        severity: 'info',
        message: 'Your goal weight is not below your current weight, but a weight-loss goal is selected.',
      });
    }
  }
  if (GOAL_RATES[goal] > 0 && bmi(inputs.weightKg, inputs.heightCm) < 18.5) {
    out.push({
      code: 'underweight-loss',
      severity: 'warning',
      message:
        'Your BMI is below 18.5, which is in the underweight range. Losing weight is generally not advised — please speak with a doctor or registered dietitian.',
    });
  }
}

/** Automatic mode: maintenance minus the deficit for the chosen goal, with a safety floor. */
export function planFromGoal(inputs: PlanInputs, goal: WeightGoal): CaloriePlan {
  const bmr = calcBmr(inputs);
  const maintenanceKcal = calcTdee(bmr, inputs.activityLevel);
  const rate = GOAL_RATES[goal];
  const deficit = dailyEnergyChange(rate);
  const calculated = maintenanceKcal - deficit;
  const minimumSafeKcal = MINIMUM_SAFE_KCAL[inputs.sex];
  const floorApplied = rate > 0 && calculated < minimumSafeKcal;
  const dailyTarget = floorApplied ? minimumSafeKcal : calculated;

  const warnings: PlanWarning[] = [];
  if (goal === 'aggressive') {
    warnings.push({
      code: 'aggressive-goal',
      severity: 'warning',
      message:
        'Losing about 1 kg per week is aggressive and may not be suitable for everyone. Consider a gentler goal, and talk to a doctor or registered dietitian before starting.',
    });
  } else if (rate > 0 && deficit / maintenanceKcal > LARGE_DEFICIT_RATIO) {
    warnings.push({
      code: 'large-deficit',
      severity: 'warning',
      message: 'This goal needs a large daily deficit relative to your maintenance calories. Consider a gentler goal or professional guidance.',
    });
  }
  if (floorApplied) {
    warnings.push({
      code: 'floor-applied',
      severity: 'warning',
      message: `The calculated target (${calculated.toLocaleString('en-US')} kcal) is below the commonly recommended minimum, so ${minimumSafeKcal.toLocaleString('en-US')} kcal/day is used instead. Your actual loss will be slower than the goal. Please seek professional guidance.`,
    });
  }
  sharedWarnings(inputs, goal, warnings);

  return {
    mode: 'auto',
    weightGoal: goal,
    bmr,
    maintenanceKcal,
    dailyTarget,
    weeklyBudget: weeklyBudget(dailyTarget),
    expectedWeeklyChangeKg: expectedWeeklyChangeKg(dailyTarget, maintenanceKcal),
    requestedRateKgPerWeek: rate,
    minimumSafeKcal,
    floorApplied,
    warnings,
  };
}

/** Manual mode: the user's number is used exactly as entered — it is never overwritten. */
export function planFromManual(inputs: PlanInputs, customDailyTarget: number, goal: WeightGoal = 'maintain'): CaloriePlan {
  const bmr = calcBmr(inputs);
  const maintenanceKcal = calcTdee(bmr, inputs.activityLevel);
  const minimumSafeKcal = MINIMUM_SAFE_KCAL[inputs.sex];
  const warnings: PlanWarning[] = [];
  if (customDailyTarget < minimumSafeKcal) {
    warnings.push({
      code: 'below-minimum',
      severity: 'warning',
      message: `${customDailyTarget.toLocaleString('en-US')} kcal/day is below the commonly recommended minimum (${minimumSafeKcal.toLocaleString('en-US')} kcal). Please talk to a doctor or registered dietitian before eating this little.`,
    });
  }
  return {
    mode: 'manual',
    weightGoal: goal,
    bmr,
    maintenanceKcal,
    dailyTarget: customDailyTarget,
    weeklyBudget: weeklyBudget(customDailyTarget),
    expectedWeeklyChangeKg: expectedWeeklyChangeKg(customDailyTarget, maintenanceKcal),
    requestedRateKgPerWeek: Math.max(0, -expectedWeeklyChangeKg(customDailyTarget, maintenanceKcal)),
    minimumSafeKcal,
    floorApplied: false,
    warnings,
  };
}

/** Plan for a saved profile, respecting its mode. */
export function buildPlan(profile: Pick<UserProfile, 'age' | 'sex' | 'heightCm' | 'weightKg' | 'activityLevel' | 'workoutsPerWeek' | 'goalWeightKg' | 'calorieTargetMode' | 'weightGoal' | 'customDailyCalorieTarget'>): CaloriePlan {
  if (profile.calorieTargetMode === 'manual' && profile.customDailyCalorieTarget !== undefined) {
    return planFromManual(profile, profile.customDailyCalorieTarget, profile.weightGoal);
  }
  return planFromGoal(profile, profile.weightGoal);
}
