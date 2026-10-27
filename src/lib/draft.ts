import type { ActivityLevel, CalorieTargetMode, Sex, Units, UserProfile, WeightGoal } from '@/types';
import { profileInputSchema, fieldErrors, type ProfileInput } from './schemas';
import { cmToFtIn, inchesToCm, kgToLb, lbToKg, round1 } from './format';

/** Form state: everything is a string while the user types, in the user's chosen units. */
export interface ProfileDraft {
  age: string;
  sex: Sex;
  height: string; // cm (metric)
  heightFt: string; // imperial
  heightIn: string; // imperial
  weight: string; // kg or lb
  activityLevel: ActivityLevel;
  workoutsPerWeek: string;
  workoutType: string;
  goalWeight: string; // kg or lb
  calorieTargetMode: CalorieTargetMode;
  weightGoal: WeightGoal;
  customTarget: string;
}

export function emptyDraft(): ProfileDraft {
  return {
    age: '',
    sex: 'male',
    height: '',
    heightFt: '',
    heightIn: '',
    weight: '',
    activityLevel: 'light',
    workoutsPerWeek: '3',
    workoutType: '',
    goalWeight: '',
    calorieTargetMode: 'auto',
    weightGoal: 'mild',
    customTarget: '',
  };
}

export function draftFromProfile(p: UserProfile, units: Units): ProfileDraft {
  const imperial = units === 'imperial';
  const ftIn = cmToFtIn(p.heightCm);
  return {
    age: String(p.age),
    sex: p.sex,
    height: imperial ? '' : String(round1(p.heightCm)),
    heightFt: imperial ? String(ftIn.ft) : '',
    heightIn: imperial ? String(ftIn.inch) : '',
    weight: String(round1(imperial ? kgToLb(p.weightKg) : p.weightKg)),
    activityLevel: p.activityLevel,
    workoutsPerWeek: String(p.workoutsPerWeek),
    workoutType: p.workoutType ?? '',
    goalWeight: p.goalWeightKg === undefined ? '' : String(round1(imperial ? kgToLb(p.goalWeightKg) : p.goalWeightKg)),
    calorieTargetMode: p.calorieTargetMode,
    weightGoal: p.weightGoal,
    customTarget: p.customDailyCalorieTarget === undefined ? '' : String(p.customDailyCalorieTarget),
  };
}

const num = (s: string): number | undefined => {
  const t = s.trim();
  if (t === '') return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : Number.NaN;
};

/** Convert any numbers already typed when the user flips the units toggle. */
export function convertDraftUnits(d: ProfileDraft, from: Units, to: Units): ProfileDraft {
  if (from === to) return d;
  const next = { ...d };
  const w = num(d.weight);
  if (w !== undefined && !Number.isNaN(w)) next.weight = String(round1(to === 'imperial' ? kgToLb(w) : lbToKg(w)));
  const gw = num(d.goalWeight);
  if (gw !== undefined && !Number.isNaN(gw)) next.goalWeight = String(round1(to === 'imperial' ? kgToLb(gw) : lbToKg(gw)));
  if (to === 'imperial') {
    const cm = num(d.height);
    if (cm !== undefined && !Number.isNaN(cm)) {
      const { ft, inch } = cmToFtIn(cm);
      next.heightFt = String(ft);
      next.heightIn = String(inch);
    }
    next.height = '';
  } else {
    const ft = num(d.heightFt);
    const inch = num(d.heightIn) ?? 0;
    if (ft !== undefined && !Number.isNaN(ft) && !Number.isNaN(inch)) next.height = String(round1(inchesToCm(ft * 12 + inch)));
    next.heightFt = '';
    next.heightIn = '';
  }
  return next;
}

const FIELD_MAP: Record<string, keyof ProfileDraft | 'height'> = {
  age: 'age',
  heightCm: 'height',
  weightKg: 'weight',
  workoutsPerWeek: 'workoutsPerWeek',
  workoutType: 'workoutType',
  goalWeightKg: 'goalWeight',
  customDailyCalorieTarget: 'customTarget',
};

export function draftToRaw(d: ProfileDraft, units: Units) {
  const imperial = units === 'imperial';
  let heightCm: number | undefined;
  if (imperial) {
    const ft = num(d.heightFt);
    const inch = num(d.heightIn) ?? 0;
    heightCm = ft === undefined ? undefined : Number.isNaN(ft) || Number.isNaN(inch) ? Number.NaN : inchesToCm(ft * 12 + inch);
  } else {
    heightCm = num(d.height);
  }
  const weight = num(d.weight);
  const goal = num(d.goalWeight);
  const conv = (v: number | undefined) => (v === undefined || Number.isNaN(v) ? v : imperial ? lbToKg(v) : v);
  return {
    age: num(d.age),
    sex: d.sex,
    heightCm: heightCm === undefined || Number.isNaN(heightCm) ? heightCm : round1(heightCm),
    weightKg: (() => {
      const k = conv(weight);
      return k === undefined || Number.isNaN(k) ? k : round1(k);
    })(),
    activityLevel: d.activityLevel,
    workoutsPerWeek: num(d.workoutsPerWeek),
    workoutType: d.workoutType.trim() === '' ? undefined : d.workoutType.trim(),
    goalWeightKg: (() => {
      const k = conv(goal);
      return k === undefined || Number.isNaN(k) ? k : round1(k);
    })(),
    calorieTargetMode: d.calorieTargetMode,
    weightGoal: d.weightGoal,
    customDailyCalorieTarget: d.calorieTargetMode === 'manual' ? num(d.customTarget) : undefined,
  };
}

export interface DraftResult {
  input: ProfileInput | null;
  errors: Record<string, string>;
}

export function validateDraft(d: ProfileDraft, units: Units): DraftResult {
  const parsed = profileInputSchema.safeParse(draftToRaw(d, units));
  if (parsed.success) return { input: parsed.data, errors: {} };
  const raw = fieldErrors(parsed.error);
  const errors: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) errors[FIELD_MAP[k] ?? k] = v;
  return { input: null, errors };
}

/** Body fields valid (ignores the manual target), so goal previews can show before the user is done. */
export function bodyInputs(d: ProfileDraft, units: Units): ProfileInput | null {
  const raw = { ...draftToRaw(d, units), calorieTargetMode: 'auto' as const, customDailyCalorieTarget: undefined };
  const parsed = profileInputSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
