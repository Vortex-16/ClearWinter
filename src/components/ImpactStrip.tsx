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

  const StatusIcon =
    profile.aqi <= 50 ? CheckCircle2 : profile.aqi <= 150 ? AlertTriangle : ShieldAlert;

  return (
    <section
      aria-label="Direct household and community impact summary"
      className="bg-white border border-slate-200 rounded-xl overflow-hidden"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        <div className="p-4 sm:p-5 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-500">Ambient Winter Smog</span>
            <span className={`inline-flex items-center gap-1 text-xs font-semibold ${band.textColorClass}`}>
              <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{band.severity}</span>
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
              {profile.aqi}
            </span>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              AQI · {impact.outdoorPm25} µg/m³ outdoor
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-1.5">
          <div className="text-xs font-medium text-slate-500">Personal Exposure Cut</div>
          <div className="flex items-baseline gap-2">
            <span
              data-testid="metric-exposure-cut"
              className="font-mono text-2xl font-semibold text-teal-700 tabular-nums"
            >
              -{impact.exposureReductionPct}%
            </span>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              est. {impact.estimatedIndoorPm25} µg/m³ indoor
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-1.5">
          <div className="text-xs font-medium text-slate-500">Weekly CO2e Avoided</div>
          <div className="flex items-baseline gap-2">
            <span
              data-testid="metric-co2e-avoided"
              className="font-mono text-2xl font-semibold text-slate-900 tabular-nums"
            >
              {impact.weeklyCo2eAvoidedKg.toFixed(1)} kg
            </span>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              from {impact.adoptedCount}/{impact.totalCount} habits
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-1.5">
          <div className="text-xs font-medium text-slate-500">Local PM2.5 Prevented</div>
          <div className="flex items-baseline gap-2">
            <span
              data-testid="metric-pm25-prevented"
              className="font-mono text-2xl font-semibold text-slate-900 tabular-nums"
            >
              {impact.weeklyPm25AvoidedGrams.toFixed(1)} g
            </span>
            <span className="text-xs text-slate-500">
              direct curb &amp; chimney cut
            </span>
          </div>
        </div>
      </div>

      <ExposureProjectionChart profile={profile} impact={impact} />
    </section>
  );
}
