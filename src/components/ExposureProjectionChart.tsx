import { useMemo } from 'react';
import { TrendingDown } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { buildLongTermExposureProjection } from '../utils/airImpact';
import type { HouseholdProfile, ImpactSummary, LongTermProjectionPoint } from '../types/air';

interface ExposureProjectionChartProps {
  profile: HouseholdProfile;
  impact: ImpactSummary;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload?: LongTermProjectionPoint;
  }>;
}

function ProjectionTooltip({ active, payload }: ChartTooltipProps) {
  const point = payload?.[0]?.payload;
  if (!active || !point) {
    return null;
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm text-xs space-y-1.5">
      <div className="font-display font-semibold text-slate-900">
        Week {point.weekNumber} Cumulative Dose
      </div>
      <div className="space-y-1 font-mono tabular-nums">
        <div className="flex items-center justify-between gap-4 text-slate-600">
          <span>Unmitigated baseline</span>
          <span className="font-medium text-slate-900">{point.baselineCumulativeMg.toFixed(1)} mg</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-teal-800">
          <span>With adopted plan</span>
          <span className="font-semibold text-teal-700">{point.projectedCumulativeMg.toFixed(1)} mg</span>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-1 text-emerald-700">
          <span>Cumulative spared</span>
          <span className="font-semibold">-{point.avoidedCumulativeMg.toFixed(1)} mg</span>
        </div>
      </div>
    </div>
  );
}

export function ExposureProjectionChart({ profile, impact }: ExposureProjectionChartProps) {
  const projection = useMemo(
    () => buildLongTermExposureProjection(impact, profile, 12),
    [impact, profile],
  );

  return (
    <div
      data-testid="exposure-projection-chart"
      className="border-t border-slate-200 p-4 sm:p-5 space-y-4"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-teal-700 shrink-0" aria-hidden="true" />
            <h2 className="font-display text-sm sm:text-base font-semibold text-slate-900">
              Projected 12-Week Winter Smog Exposure Reduction
            </h2>
          </div>
          <p className="text-xs text-slate-600">
            Cumulative inhaled PM2.5 dose per household member across a 12-week winter season based on your{' '}
            <span className="font-mono tabular-nums font-medium text-slate-800">
              {impact.adoptedCount}
            </span>{' '}
            adopted habits.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs shrink-0">
          <div>
            <span className="text-slate-600">12-Week PM2.5 spared: </span>
            <span
              data-testid="projection-avoided-mg"
              className="font-mono font-semibold tabular-nums text-teal-800"
            >
              -{projection.totalAvoidedMg.toFixed(1)} mg
            </span>
          </div>
          <div>
            <span className="text-slate-600">Seasonal CO2e: </span>
            <span className="font-mono font-semibold tabular-nums text-slate-900">
              {projection.seasonalCo2eAvoidedKg.toFixed(1)} kg
            </span>
          </div>
          <div>
            <span className="text-slate-600">Seasonal PM2.5 cut: </span>
            <span className="font-mono font-semibold tabular-nums text-slate-900">
              {projection.seasonalPm25PreventedGrams.toFixed(1)} g
            </span>
          </div>
        </div>
      </div>

      {impact.adoptedCount === 0 && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          No habits are currently adopted. Adopt one or more routines, indoor hacks, or community swaps below to project your seasonal exposure reduction.
        </p>
      )}

      <div className="h-52 w-full min-w-0">
        <ResponsiveContainer width="100%" height={208}>
          <AreaChart
            data={projection.points}
            margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
          >
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="weekLabel"
              tick={{ fontSize: 11, fill: '#64748b', fontFamily: 'IBM Plex Mono, monospace' }}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={false}
            />
            <YAxis
              width={48}
              tickFormatter={(value: number) => `${Math.round(value)}mg`}
              tick={{ fontSize: 11, fill: '#64748b', fontFamily: 'IBM Plex Mono, monospace' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<ProjectionTooltip />} />
            <Area
              type="monotone"
              dataKey="baselineCumulativeMg"
              name="Unmitigated baseline"
              stroke="#64748b"
              strokeWidth={1.75}
              strokeDasharray="4 4"
              fill="#cbd5e1"
              fillOpacity={0.2}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="projectedCumulativeMg"
              name="Adopted plan projection"
              stroke="#0f766e"
              strokeWidth={2.25}
              fill="#0d9488"
              fillOpacity={0.18}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-4 bg-slate-500 inline-block" aria-hidden="true" />
            <span>Unmitigated baseline ({projection.totalBaselineMg.toFixed(1)} mg/season)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-4 bg-teal-700 inline-block" aria-hidden="true" />
            <span>Projected with adopted actions ({projection.totalProjectedMg.toFixed(1)} mg/season)</span>
          </span>
        </div>
        <span className="font-mono tabular-nums">
          Model: 14 m³/day breathing rate · {profile.housingType}
        </span>
      </div>
    </div>
  );
}
