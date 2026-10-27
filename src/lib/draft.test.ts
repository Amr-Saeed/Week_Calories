import { describe, expect, it } from 'vitest';
import { convertDraftUnits, emptyDraft, validateDraft } from './draft';

const metric = { ...emptyDraft(), age: '30', height: '180', weight: '80' };

describe('profile form validation', () => {
  it('accepts a complete metric profile', () => {
    const r = validateDraft(metric, 'metric');
    expect(r.input?.heightCm).toBe(180);
    expect(r.input?.weightKg).toBe(80);
    expect(r.errors).toEqual({});
  });

  it('reports missing and invalid fields next to the right inputs', () => {
    const r = validateDraft({ ...emptyDraft(), age: '-5', weight: '900' }, 'metric');
    expect(r.input).toBeNull();
    expect(Object.keys(r.errors)).toEqual(expect.arrayContaining(['age', 'height', 'weight']));
  });

  it('requires a target when manual mode is chosen', () => {
    const r = validateDraft({ ...metric, calorieTargetMode: 'manual', customTarget: '' }, 'metric');
    expect(r.errors.customTarget).toBeTruthy();
    const ok = validateDraft({ ...metric, calorieTargetMode: 'manual', customTarget: '2100' }, 'metric');
    expect(ok.input?.customDailyCalorieTarget).toBe(2100);
  });

  it('rejects an absurd manual target', () => {
    expect(validateDraft({ ...metric, calorieTargetMode: 'manual', customTarget: '200' }, 'metric').errors.customTarget).toBeTruthy();
  });

  it('converts imperial entries to metric', () => {
    const imperial = { ...emptyDraft(), age: '30', heightFt: '5', heightIn: '11', weight: '176' };
    const r = validateDraft(imperial, 'imperial');
    expect(r.input?.heightCm).toBeCloseTo(180.3, 1);
    expect(r.input?.weightKg).toBeCloseTo(79.8, 1);
  });

  it('keeps typed values when switching units', () => {
    const toImperial = convertDraftUnits(metric, 'metric', 'imperial');
    expect(toImperial.heightFt).toBe('5');
    expect(toImperial.heightIn).toBe('11');
    expect(Number(toImperial.weight)).toBeCloseTo(176.4, 1);
    const back = convertDraftUnits(toImperial, 'imperial', 'metric');
    expect(Number(back.height)).toBeGreaterThan(179);
  });
});
