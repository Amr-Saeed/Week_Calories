import type { Units } from '@/types';

const nf = new Intl.NumberFormat('en-US');
export const formatNumber = (n: number) => nf.format(Math.round(n));
export const formatKcal = (n: number) => `${formatNumber(n)} kcal`;

/** "+120" / "−120" with a real minus sign, for differences. */
export function formatSigned(n: number): string {
  const r = Math.round(n);
  if (r === 0) return '0';
  return `${r > 0 ? '+' : '−'}${nf.format(Math.abs(r))}`;
}

export const KG_PER_LB = 0.45359237;
export const kgToLb = (kg: number) => kg / KG_PER_LB;
export const lbToKg = (lb: number) => lb * KG_PER_LB;
export const cmToInches = (cm: number) => cm / 2.54;
export const inchesToCm = (inches: number) => inches * 2.54;

export function cmToFtIn(cm: number): { ft: number; inch: number } {
  const totalInches = Math.round(cmToInches(cm));
  return { ft: Math.floor(totalInches / 12), inch: totalInches % 12 };
}

export const round1 = (n: number) => Math.round(n * 10) / 10;

export function weightUnitLabel(units: Units) {
  return units === 'imperial' ? 'lb' : 'kg';
}

/** Weight (kg internally) shown in the user's units. */
export function formatWeight(kg: number, units: Units): string {
  return units === 'imperial' ? `${round1(kgToLb(kg))} lb` : `${round1(kg)} kg`;
}

/** Signed weight change, e.g. "−0.56 kg" or "+0.3 kg". Clearly an estimate: callers add "≈". */
export function formatWeightChange(kg: number, units: Units): string {
  const value = units === 'imperial' ? kgToLb(kg) : kg;
  const unit = weightUnitLabel(units);
  const abs = Math.abs(value);
  if (abs < 0.005) return `0 ${unit}`;
  return `${value < 0 ? '−' : '+'}${abs.toFixed(2)} ${unit}`;
}

export function greetingFor(date: Date): string {
  const h = date.getHours();
  if (h < 5) return 'Good evening';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export const pct = (n: number) => `${Math.round(n)}%`;
