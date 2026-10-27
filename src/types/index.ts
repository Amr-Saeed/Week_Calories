/** Calendar date without time or timezone, formatted `YYYY-MM-DD`. */
export type ISODate = string;
/** 0 = Sunday … 6 = Saturday (same as `Date#getDay`). */
export type WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very' | 'extra';
export type WeightGoal = 'maintain' | 'mild' | 'moderate' | 'aggressive';
export type CalorieTargetMode = 'auto' | 'manual';
export type Units = 'metric' | 'imperial';
export type ThemePreference = 'light' | 'dark' | 'system';

export interface UserProfile {
  id: 'me';
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  workoutsPerWeek: number;
  workoutType?: string;
  goalWeightKg?: number;
  calorieTargetMode: CalorieTargetMode;
  weightGoal: WeightGoal;
  customDailyCalorieTarget?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TrackingSettings {
  id: 'main';
  /** The week-start day the user currently wants (applies to the newest schedule entry). */
  weekStartDay: WeekdayIndex;
  /** The date the user picked for the very first tracking week. */
  firstTrackingDate: ISODate;
  /**
   * Week schedule: each entry is the start date of a "week anchor". Weeks repeat every 7 days
   * from an anchor until the next anchor begins. Changing the week-start day later appends a
   * new future anchor, so past periods never move.
   */
  weekAnchors: ISODate[];
  preferredUnits: Units;
  theme: ThemePreference;
}

/** The profile inputs that matter for calorie maths, frozen with every target version. */
export interface CalculationInputs {
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  workoutsPerWeek: number;
}

/** A calorie target that applies from `effectiveFrom` until the next version begins. */
export interface TargetVersion {
  id: string;
  effectiveFrom: ISODate;
  dailyTarget: number;
  maintenanceKcal: number;
  bmr: number;
  mode: CalorieTargetMode;
  weightGoal: WeightGoal;
  expectedWeeklyChangeKg: number;
  inputs: CalculationInputs;
  createdAt: string;
}

/** Copy of the applicable target stored on each daily log so history never shifts. */
export interface TargetSnapshot {
  versionId: string;
  dailyTarget: number;
  maintenanceKcal: number;
  expectedWeeklyChangeKg: number;
  mode: CalorieTargetMode;
  weightGoal: WeightGoal;
}

export interface MealBreakdown {
  breakfast?: number;
  lunch?: number;
  dinner?: number;
  snacks?: number;
}

export interface DailyLog {
  /** Always `log-${date}`, which (with the unique `date` index) prevents duplicates. */
  id: string;
  date: ISODate;
  totalCalories: number;
  meals?: MealBreakdown;
  notes?: string;
  snapshot: TargetSnapshot;
  createdAt: string;
  updatedAt: string;
}

export type DayStatus = 'not-logged' | 'under' | 'on' | 'over';

export type PlanWarningCode =
  | 'aggressive-goal'
  | 'large-deficit'
  | 'floor-applied'
  | 'below-minimum'
  | 'underweight-loss'
  | 'goal-weight-mismatch';

export interface PlanWarning {
  code: PlanWarningCode;
  severity: 'info' | 'warning';
  message: string;
}

export interface CaloriePlan {
  mode: CalorieTargetMode;
  weightGoal: WeightGoal;
  bmr: number;
  maintenanceKcal: number;
  dailyTarget: number;
  weeklyBudget: number;
  /** Signed: negative = expected loss, positive = expected gain. */
  expectedWeeklyChangeKg: number;
  /** The rate the chosen goal asked for (kg/week, positive number for loss). */
  requestedRateKgPerWeek: number;
  minimumSafeKcal: number;
  /** True when the safety floor replaced a lower calculated target. */
  floorApplied: boolean;
  warnings: PlanWarning[];
}

export interface WeekPeriod {
  /** First day (inclusive). Also used as the period's stable id. */
  start: ISODate;
  /** Last day (inclusive). Normally start + 6, shorter only for a week-start transition. */
  end: ISODate;
  days: ISODate[];
}
