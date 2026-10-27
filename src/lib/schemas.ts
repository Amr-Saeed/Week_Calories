import { z } from 'zod';
import { isValidISODate } from './dates';
import { MANUAL_TARGET_MAX, MANUAL_TARGET_MIN } from './calories';

const isoDate = z.string().refine(isValidISODate, 'Enter a valid date');

export const sexSchema = z.enum(['male', 'female']);
export const activityLevelSchema = z.enum(['sedentary', 'light', 'moderate', 'very', 'extra']);
export const weightGoalSchema = z.enum(['maintain', 'mild', 'moderate', 'aggressive']);
export const targetModeSchema = z.enum(['auto', 'manual']);

/** Fields entered in the profile form (everything the user types or picks). */
export const profileInputSchema = z
  .object({
    age: z.number({ error: 'Enter your age' }).int('Age must be a whole number').min(15, 'This app is for ages 15 and up').max(100, 'Enter an age of 100 or less'),
    sex: sexSchema,
    heightCm: z.number({ error: 'Enter your height' }).min(100, 'Height must be at least 100 cm').max(250, 'Height must be 250 cm or less'),
    weightKg: z.number({ error: 'Enter your weight' }).min(30, 'Weight must be at least 30 kg').max(300, 'Weight must be 300 kg or less'),
    activityLevel: activityLevelSchema,
    workoutsPerWeek: z.number({ error: 'Enter workouts per week' }).int('Use a whole number').min(0, 'Cannot be negative').max(14, 'Enter 14 or fewer'),
    workoutType: z.string().trim().max(60, 'Keep it under 60 characters').optional(),
    goalWeightKg: z.number().min(30, 'Goal weight must be at least 30 kg').max(300, 'Goal weight must be 300 kg or less').optional(),
    calorieTargetMode: targetModeSchema,
    weightGoal: weightGoalSchema,
    customDailyCalorieTarget: z
      .number({ error: 'Enter a daily calorie target' })
      .int('Use a whole number')
      .min(MANUAL_TARGET_MIN, `Target must be at least ${MANUAL_TARGET_MIN} kcal`)
      .max(MANUAL_TARGET_MAX, `Target must be ${MANUAL_TARGET_MAX} kcal or less`)
      .optional(),
  })
  .refine((v) => v.calorieTargetMode !== 'manual' || v.customDailyCalorieTarget !== undefined, {
    message: 'Enter a daily calorie target',
    path: ['customDailyCalorieTarget'],
  });

export type ProfileInput = z.infer<typeof profileInputSchema>;

export const mealBreakdownSchema = z.object({
  breakfast: z.number().min(0).max(20000).optional(),
  lunch: z.number().min(0).max(20000).optional(),
  dinner: z.number().min(0).max(20000).optional(),
  snacks: z.number().min(0).max(20000).optional(),
});

export const MAX_DAILY_CALORIES = 20000;

export const dailyLogInputSchema = z.object({
  date: isoDate,
  totalCalories: z
    .number({ error: 'Enter the calories for this day' })
    .int('Use a whole number')
    .min(0, 'Calories cannot be negative')
    .max(MAX_DAILY_CALORIES, `Enter ${MAX_DAILY_CALORIES.toLocaleString('en-US')} kcal or less`),
  meals: mealBreakdownSchema.optional(),
  notes: z.string().trim().max(500, 'Notes can be up to 500 characters').optional(),
});

export type DailyLogInput = z.infer<typeof dailyLogInputSchema>;

export const trackingSettingsInputSchema = z.object({
  weekStartDay: z.number().int().min(0).max(6),
  firstTrackingDate: isoDate,
  preferredUnits: z.enum(['metric', 'imperial']),
  theme: z.enum(['light', 'dark', 'system']),
});

export type TrackingSettingsInput = z.infer<typeof trackingSettingsInputSchema>;

/** Turn a zod error into a `{ field: message }` map (first message per field). */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_form';
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
