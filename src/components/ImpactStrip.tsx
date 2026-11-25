import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { classifyAqiBand } from '../utils/airImpact';
import { ExposureProjectionChart } from './ExposureProjectionChart';
import type { HouseholdProfile, ImpactSummary } from '../types/air';

interface ImpactStripProps {
  profile: HouseholdProfile;
  impact: ImpactSummary;
}

export function ImpactStrip({ profile, impact }: ImpactStripProps) {
  const band = classifyAqiBand(profile.aqi);
  const progressPct = Math.min(100, Math.round((impact.exposureReductionPct / 82) * 100));

  const StatusIcon =
    profile.aqi <= 50 ? CheckCircle2 : profile.aqi <= 150 ? AlertTriangle : ShieldAlert;

  return (
    <section
      aria-label="Direct household and community impact summary"
      className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80">
        <div className="p-4 sm:p-5 space-y-1.5 transition-colors duration-150 hover:bg-slate-50/70">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-600">Ambient Winter Smog</span>
            <span
              className={`inline-flex items-center gap-1 text-xs font-semibold ${band.textColorClass}`}
            >
              <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{band.severity}</span>
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
              {profile.aqi}
            </span>
            <span className="text-xs text-slate-600 font-mono tabular-nums">
              AQI · {impact.outdoorPm25} µg/m³ outdoor
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-2 transition-colors duration-150 hover:bg-slate-50/70">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-600">Personal Exposure Cut</span>
            <span className="font-mono text-xs tabular-nums text-slate-600">max 82%</span>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span
              data-testid="metric-exposure-cut"
              className="font-mono text-2xl font-semibold text-teal-800 tabular-nums whitespace-nowrap shrink-0"
            >
              -{impact.exposureReductionPct}%
            </span>
            <span className="text-xs text-slate-600 font-mono tabular-nums">
              est. {impact.estimatedIndoorPm25} µg/m³ indoor
            </span>
          </div>
          <div
            className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden"
            aria-hidden="true"
          >
            <div
              style={{ width: `${progressPct}%` }}
              className="h-full rounded-full bg-teal-600 transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
            />
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-1.5 transition-colors duration-150 hover:bg-slate-50/70">
          <div className="text-xs font-medium text-slate-600">Weekly CO2e Avoided</div>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span
              data-testid="metric-co2e-avoided"
              className="font-mono text-2xl font-semibold text-slate-900 tabular-nums whitespace-nowrap shrink-0"
            >
              {impact.weeklyCo2eAvoidedKg.toFixed(1)} kg
            </span>
            <span className="text-xs text-slate-600 font-mono tabular-nums">
              from {impact.adoptedCount}/{impact.totalCount} habits
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-1.5 transition-colors duration-150 hover:bg-slate-50/70">
          <div className="text-xs font-medium text-slate-600">Local PM2.5 Prevented</div>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span
              data-testid="metric-pm25-prevented"
              className="font-mono text-2xl font-semibold text-slate-900 tabular-nums whitespace-nowrap shrink-0"
            >
              {impact.weeklyPm25AvoidedGrams.toFixed(1)} g
            </span>
            <span className="text-xs text-slate-600">direct curb &amp; chimney cut</span>
          </div>
        </div>
      </div>

      <ExposureProjectionChart profile={profile} impact={impact} />
    </section>
  );
}
