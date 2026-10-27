import { describe, expect, it } from 'vitest';
import {
  ACTIVITY_MULTIPLIERS,
  buildPlan,
  calcBmr,
  calcTdee,
  dailyEnergyChange,
  planFromGoal,
  planFromManual,
  suggestActivityLevel,
} from './calories';
import type { CalculationInputs } from '@/types';

const man: CalculationInputs = { age: 30, sex: 'male', heightCm: 180, weightKg: 80, activityLevel: 'moderate', workoutsPerWeek: 3 };
const woman: CalculationInputs = { age: 30, sex: 'female', heightCm: 165, weightKg: 60, activityLevel: 'light', workoutsPerWeek: 2 };

describe('BMR and TDEE (Mifflin–St Jeor)', () => {
  it('computes BMR for a man', () => {
    // 10*80 + 6.25*180 - 5*30 + 5 = 800 + 1125 - 150 + 5 = 1780
    expect(calcBmr(man)).toBe(1780);
  });

  it('computes BMR for a woman', () => {
    // 10*60 + 6.25*165 - 5*30 - 161 = 600 + 1031.25 - 150 - 161 = 1320.25
    expect(calcBmr(woman)).toBe(1320);
  });

  it('applies each activity multiplier', () => {
    expect(calcTdee(1800, 'sedentary')).toBe(2160);
    expect(calcTdee(1800, 'light')).toBe(2475);
    expect(calcTdee(1800, 'moderate')).toBe(2790);
    expect(calcTdee(1800, 'very')).toBe(3105);
    expect(calcTdee(1800, 'extra')).toBe(3420);
    expect(Object.keys(ACTIVITY_MULTIPLIERS)).toHaveLength(5);
  });
});

describe('calorie targets per goal', () => {
  it('converts a weekly rate to a daily energy change using 7,700 kcal/kg', () => {
    expect(dailyEnergyChange(0)).toBe(0);
    expect(dailyEnergyChange(0.25)).toBe(275);
    expect(dailyEnergyChange(0.5)).toBe(550);
    expect(dailyEnergyChange(1)).toBe(1100);
  });

  it('builds a target for every goal', () => {
    const maintenance = calcTdee(calcBmr(man), 'moderate'); // 1780 * 1.55 = 2759
    expect(maintenance).toBe(2759);
    expect(planFromGoal(man, 'maintain').dailyTarget).toBe(2759);
    expect(planFromGoal(man, 'mild').dailyTarget).toBe(2759 - 275);
    expect(planFromGoal(man, 'moderate').dailyTarget).toBe(2759 - 550);
    expect(planFromGoal(man, 'aggressive').dailyTarget).toBe(2759 - 1100);
  });

  it('reports weekly budget and expected change', () => {
    const plan = planFromGoal(man, 'moderate');
    expect(plan.weeklyBudget).toBe(plan.dailyTarget * 7);
    expect(plan.expectedWeeklyChangeKg).toBeCloseTo(-0.5, 2);
  });

  it('flags the aggressive goal', () => {
    expect(planFromGoal(man, 'aggressive').warnings.map((w) => w.code)).toContain('aggressive-goal');
    expect(planFromGoal(man, 'mild').warnings).toHaveLength(0);
  });

  it('never recommends a target below the safety floor', () => {
    const small: CalculationInputs = { age: 60, sex: 'female', heightCm: 150, weightKg: 50, activityLevel: 'sedentary', workoutsPerWeek: 0 };
    const plan = planFromGoal(small, 'aggressive');
    expect(plan.dailyTarget).toBe(1200);
    expect(plan.floorApplied).toBe(true);
    expect(plan.warnings.map((w) => w.code)).toContain('floor-applied');
    // the floor makes real loss slower than the 1 kg/week requested
    expect(plan.expectedWeeklyChangeKg).toBeGreaterThan(-1);
  });

  it('warns when a weight-loss goal is chosen while underweight', () => {
    const light: CalculationInputs = { ...woman, weightKg: 45 }; // BMI ≈ 16.5
    expect(planFromGoal(light, 'mild').warnings.map((w) => w.code)).toContain('underweight-loss');
  });
});

describe('manual target', () => {
  it('uses the number exactly as entered', () => {
    const plan = planFromManual(man, 2000);
    expect(plan.mode).toBe('manual');
    expect(plan.dailyTarget).toBe(2000);
    expect(plan.weeklyBudget).toBe(14000);
  });

  it('derives expected change from maintenance and warns when very low', () => {
    const plan = planFromManual(man, 1300);
    expect(plan.warnings.map((w) => w.code)).toContain('below-minimum');
    expect(plan.expectedWeeklyChangeKg).toBeLessThan(0);
  });

  it('buildPlan respects the saved mode', () => {
    const base = { ...man, calorieTargetMode: 'manual' as const, weightGoal: 'mild' as const, customDailyCalorieTarget: 2100 };
    expect(buildPlan(base).dailyTarget).toBe(2100);
    expect(buildPlan({ ...base, calorieTargetMode: 'auto' }).dailyTarget).toBe(2759 - 275);
  });
});

describe('activity suggestion', () => {
  it('maps workouts per week to a suggested level', () => {
    expect(suggestActivityLevel(0)).toBe('sedentary');
    expect(suggestActivityLevel(2)).toBe('light');
    expect(suggestActivityLevel(4)).toBe('moderate');
    expect(suggestActivityLevel(6)).toBe('very');
    expect(suggestActivityLevel(7)).toBe('extra');
  });
});
