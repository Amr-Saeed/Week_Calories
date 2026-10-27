import { forwardRef, useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, Check, Circle, Info } from 'lucide-react';
import type { DayStatus, PlanWarning } from '@/types';
import { STATUS_LABEL } from '@/lib/labels';

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

export function Card({ className, children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx('rounded-2xl border border-slate-200/70 bg-white p-4 shadow-card dark:border-slate-800 dark:bg-slate-900 sm:p-5', className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-3">
      <h2 className="text-base font-semibold tracking-tight">{children}</h2>
      {hint && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'md' | 'sm' };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', className, ...rest },
  ref,
) {
  const styles = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-600/50',
    secondary: 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800',
    ghost: 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-600/50',
  }[variant];
  return (
    <button
      ref={ref}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors disabled:cursor-not-allowed',
        size === 'md' ? 'min-h-[44px] px-4 py-2 text-sm' : 'min-h-[36px] px-3 py-1.5 text-sm',
        styles,
        className,
      )}
      {...rest}
    />
  );
});

export function ProgressBar({ value, status, label, className }: { value: number; status?: DayStatus; label: string; className?: string }) {
  const clamped = Math.max(0, Math.min(1, value));
  const color =
    status === 'over' ? 'bg-rose-500' : status === 'under' ? 'bg-sky-500' : status === 'not-logged' ? 'bg-slate-300 dark:bg-slate-600' : 'bg-brand-500';
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      className={cx('h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800', className)}
    >
      <div className={cx('h-full rounded-full transition-all', color)} style={{ width: `${clamped * 100}%` }} />
    </div>
  );
}

const STATUS_STYLE: Record<DayStatus, string> = {
  under: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
  on: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
  over: 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300',
  'not-logged': 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};
const STATUS_ICON = { under: ArrowDown, on: Check, over: ArrowUp, 'not-logged': Circle } as const;

/** Status is always conveyed with an icon and a word, never by colour alone. */
export function StatusBadge({ status, className }: { status: DayStatus; className?: string }) {
  const Icon = STATUS_ICON[status];
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium', STATUS_STYLE[status], className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function Pill({ tone = 'slate', children }: { tone?: 'slate' | 'amber' | 'emerald' | 'sky'; children: ReactNode }) {
  const t = {
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    amber: 'bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300',
    emerald: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
    sky: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
  }[tone];
  return <span className={cx('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium', t)}>{children}</span>;
}

export function Alert({ tone = 'info', title, children }: { tone?: 'info' | 'warning' | 'error' | 'success'; title?: string; children: ReactNode }) {
  const t = {
    info: 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100',
    warning: 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100',
    error: 'border-rose-300 bg-rose-50 text-rose-950 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100',
    success: 'border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100',
  }[tone];
  const Icon = tone === 'info' || tone === 'success' ? Info : AlertTriangle;
  return (
    <div role={tone === 'error' ? 'alert' : 'note'} className={cx('flex gap-3 rounded-xl border p-3 text-sm', t)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>
        {title && <p className="font-semibold">{title}</p>}
        <div className="leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

export function WarningList({ warnings }: { warnings: PlanWarning[] }) {
  if (warnings.length === 0) return null;
  return (
    <div className="space-y-2">
      {warnings.map((w) => (
        <Alert key={w.code} tone={w.severity === 'warning' ? 'warning' : 'info'}>
          {w.message}
        </Alert>
      ))}
    </div>
  );
}

interface FieldShellProps { label: string; hint?: string; error?: string; htmlFor: string; children: ReactNode; className?: string }
export function FieldShell({ label, hint, error, htmlFor, children, className }: FieldShellProps) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium">{label}</label>
      {children}
      {hint && !error && <p id={`${htmlFor}-hint`} className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
      {error && <p id={`${htmlFor}-error`} role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  );
}

const inputBase =
  'block w-full min-h-[44px] rounded-xl border bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 sm:text-sm';
const inputBorder = (error?: string) => (error ? 'border-rose-400 dark:border-rose-500' : 'border-slate-300 dark:border-slate-700');

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & { label: string; hint?: string; error?: string; suffix?: string; id?: string; wrapperClassName?: string };

export const TextField = forwardRef<HTMLInputElement, InputProps>(function TextField(
  { label, hint, error, suffix, id, className, wrapperClassName, ...rest },
  ref,
) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={fid} className={wrapperClassName}>
      <div className="relative">
        <input
          ref={ref}
          id={fid}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${fid}-error` : hint ? `${fid}-hint` : undefined}
          className={cx(inputBase, inputBorder(error), suffix && 'pr-14', className)}
          {...rest}
        />
        {suffix && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-500 dark:text-slate-400">{suffix}</span>}
      </div>
    </FieldShell>
  );
});

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> & { label: string; hint?: string; error?: string; id?: string; wrapperClassName?: string };
export function SelectField({ label, hint, error, id, className, wrapperClassName, children, ...rest }: SelectProps) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={fid} className={wrapperClassName}>
      <select id={fid} aria-invalid={error ? true : undefined} className={cx(inputBase, inputBorder(error), className)} {...rest}>
        {children}
      </select>
    </FieldShell>
  );
}

export function Segmented<T extends string | number>({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cx('grid gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800', className)} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cx(
              'min-h-[40px] rounded-lg px-3 text-sm font-medium transition-colors',
              active ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'good' | 'bad' }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className={cx('mt-1 truncate text-2xl font-semibold tabular-nums tracking-tight', tone === 'bad' && 'text-rose-600 dark:text-rose-400', tone === 'good' && 'text-emerald-600 dark:text-emerald-400')}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{sub}</p>}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">
      <span className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" aria-hidden="true" />
      {label}
    </div>
  );
}
