import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DayInfo, WeekSummary } from '@/lib/summary';
import { formatWeekdayShort, formatDayMonth } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { STATUS_CHART_COLOR, STATUS_LABEL } from '@/lib/labels';

const AXIS = { fill: 'currentColor', fontSize: 12 } as const;
const GRID = 'rgba(148,163,184,0.25)';

const rows = (days: DayInfo[]) =>
  days.map((d) => ({
    label: formatWeekdayShort(d.date),
    date: formatDayMonth(d.date),
    calories: d.calories,
    target: d.target,
    status: d.status,
  }));

type TipProps = { active?: boolean; payload?: { payload: ReturnType<typeof rows>[number] }[] };
function DayTip({ active, payload }: TipProps) {
  if (!active || !payload?.length) return null;
  const r = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
      <p className="font-semibold">{r.label}, {r.date}</p>
      <p>Intake: {r.calories === null ? 'not logged' : `${formatNumber(r.calories)} kcal`}</p>
      <p>Target: {formatNumber(r.target)} kcal</p>
      <p>{STATUS_LABEL[r.status]}</p>
    </div>
  );
}

const Legend = ({ items }: { items: { color: string; label: string; line?: boolean }[] }) => (
  <ul className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
    {items.map((i) => (
      <li key={i.label} className="flex items-center gap-1.5">
        <span className={i.line ? 'h-0.5 w-4' : 'h-2.5 w-2.5 rounded-sm'} style={{ background: i.color }} aria-hidden="true" />
        {i.label}
      </li>
    ))}
  </ul>
);

/** Bars = actual intake (coloured by status), dashed line = that day's target. */
export function DailyVsTargetChart({ days }: { days: DayInfo[] }) {
  const data = rows(days);
  return (
    <div className="text-slate-500 dark:text-slate-400">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} width={44} tickFormatter={(v: number) => formatNumber(v)} />
            <Tooltip content={<DayTip />} cursor={{ fill: 'rgba(148,163,184,0.12)' }} />
            <Bar dataKey="calories" radius={[6, 6, 0, 0]} maxBarSize={36} isAnimationActive={false}>
              {data.map((r, i) => (
                <Cell key={i} fill={STATUS_CHART_COLOR[r.status]} />
              ))}
            </Bar>
            <Line type="stepAfter" dataKey="target" stroke="#64748b" strokeDasharray="5 4" strokeWidth={2} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <Legend
        items={[
          { color: STATUS_CHART_COLOR.under, label: 'Under' },
          { color: STATUS_CHART_COLOR.on, label: 'On target' },
          { color: STATUS_CHART_COLOR.over, label: 'Over' },
          { color: '#64748b', label: 'Daily target', line: true },
        ]}
      />
    </div>
  );
}

/** Daily intake over the week. Unlogged days are gaps, never zeros. */
export function TrendChart({ days, average }: { days: DayInfo[]; average: number | null }) {
  const data = rows(days);
  return (
    <div className="text-slate-500 dark:text-slate-400">
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} width={44} domain={['dataMin - 200', 'dataMax + 200']} tickFormatter={(v: number) => formatNumber(v)} />
            <Tooltip content={<DayTip />} />
            <Line type="monotone" dataKey="target" stroke="#64748b" strokeDasharray="5 4" strokeWidth={2} dot={false} isAnimationActive={false} />
            {average !== null && <ReferenceLine y={average} stroke="#0ea5e9" strokeDasharray="2 3" />}
            <Line type="monotone" dataKey="calories" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981' }} connectNulls={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <Legend
        items={[
          { color: '#10b981', label: 'Daily intake', line: true },
          { color: '#64748b', label: 'Daily target', line: true },
          ...(average !== null ? [{ color: '#0ea5e9', label: 'Average of logged days', line: true }] : []),
        ]}
      />
    </div>
  );
}

/** Donut: how much of the weekly budget has been used. */
export function BudgetDonut({ summary }: { summary: WeekSummary }) {
  const used = summary.weeklyConsumed;
  const budget = summary.weeklyBudget;
  const over = used > budget;
  const data = over
    ? [{ name: 'Budget', value: budget, color: '#10b981' }, { name: 'Over budget', value: used - budget, color: '#f43f5e' }]
    : [{ name: 'Used', value: used, color: '#10b981' }, { name: 'Remaining', value: Math.max(0, budget - used), color: '#cbd5e1' }];
  const pctUsed = summary.budgetUsagePercentage ?? 0;
  return (
    <div className="text-slate-500 dark:text-slate-400">
      <div className="relative mx-auto h-52 w-52">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius="68%" outerRadius="100%" startAngle={90} endAngle={-270} stroke="none" isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => `${formatNumber(Number(v))} kcal`} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-slate-900 dark:text-slate-100">
          <span className="text-3xl font-bold tabular-nums">{Math.round(pctUsed)}%</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">of weekly budget</span>
        </div>
      </div>
      <Legend
        items={[
          { color: '#10b981', label: `Logged: ${formatNumber(used)} kcal` },
          over ? { color: '#f43f5e', label: `Over: ${formatNumber(used - budget)} kcal` } : { color: '#cbd5e1', label: `Remaining: ${formatNumber(budget - used)} kcal` },
        ]}
      />
    </div>
  );
}

