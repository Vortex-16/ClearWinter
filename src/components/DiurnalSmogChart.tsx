import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Clock } from 'lucide-react';
import { buildHourlyInversionCurve } from '../utils/airImpact';

interface DiurnalSmogChartProps {
  aqi: number;
  bestVentilationWindow: string;
}

export function DiurnalSmogChart({ aqi, bestVentilationWindow }: DiurnalSmogChartProps) {
  const points = useMemo(() => buildHourlyInversionCurve(aqi), [aqi]);
  const [selectedHour, setSelectedHour] = useState<number>(14);
  const barRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const maxPm25 = Math.max(...points.map((p) => p.pm25), 50);
  const activePoint = points[selectedHour] ?? points[14];

  function handleBarKeyDown(event: KeyboardEvent<HTMLButtonElement>, hour: number) {
    let nextHour: number | null = null;
    if (event.key === 'ArrowRight') nextHour = (hour + 1) % 24;
    else if (event.key === 'ArrowLeft') nextHour = (hour + 23) % 24;
    else if (event.key === 'Home') nextHour = 0;
    else if (event.key === 'End') nextHour = 23;

    if (nextHour !== null) {
      event.preventDefault();
      setSelectedHour(nextHour);
      barRefs.current[nextHour]?.focus();
    }
  }

  return (
    <section
      aria-label="24-hour winter inversion curve and ventilation window"
      className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-4 shadow-2xs"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-900">
            24-Hour Winter Thermal Inversion Curve
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Select any hour bar (or use Left/Right arrow keys) to inspect particulate trapping and safe cross-ventilation timing.
          </p>
        </div>
        <div className="flex items-start sm:items-center gap-2 text-xs text-teal-800 min-w-0">
          <Clock className="h-3.5 w-3.5 text-teal-700 shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
          <span className="font-medium break-words">
            Best Window: {bestVentilationWindow}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <div
          className="grid grid-cols-24 gap-1 items-end h-28 pt-2 border-b border-slate-200"
          role="group"
          aria-label="Hourly PM2.5 concentration bars"
        >
          {points.map((point) => {
            const heightPct = Math.max(14, Math.round((point.pm25 / maxPm25) * 100));
            const isSelected = point.hour === selectedHour;
            let barClass = 'bg-slate-300 hover:bg-slate-400';
            if (point.ventilationSafe) {
              barClass = isSelected ? 'bg-teal-700' : 'bg-teal-600 hover:bg-teal-700';
            } else if (point.aqi > 200) {
              barClass = isSelected ? 'bg-red-700' : 'bg-red-400 hover:bg-red-500';
            } else if (point.aqi > 150) {
              barClass = isSelected ? 'bg-amber-600' : 'bg-amber-400 hover:bg-amber-500';
            } else if (isSelected) {
              barClass = 'bg-slate-800';
            }

            return (
              <button
                key={point.hour}
                ref={(el) => {
                  barRefs.current[point.hour] = el;
                }}
                type="button"
                onClick={() => setSelectedHour(point.hour)}
                onKeyDown={(e) => handleBarKeyDown(e, point.hour)}
                aria-label={`${point.label}: ${point.pm25} micrograms per cubic meter, ${point.phaseLabel}`}
                aria-pressed={isSelected}
                className="group h-full flex items-end focus-visible:outline-2 focus-visible:outline-teal-700 rounded-sm"
              >
                <span
                  style={{ height: `${heightPct}%` }}
                  className={`w-full rounded-t-sm transition-all duration-150 group-hover:-translate-y-0.5 ${barClass} ${
                    isSelected ? 'ring-2 ring-slate-900 ring-offset-1' : ''
                  }`}
                />
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-xs font-mono text-slate-600 tabular-nums">
          <span>12 AM</span>
          <span>6 AM</span>
          <span>12 PM</span>
          <span>6 PM</span>
          <span>11 PM</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
        <div
          aria-live="polite"
          className="flex flex-wrap items-center gap-x-2 gap-y-1 text-slate-700"
        >
          <span className="font-mono font-semibold text-slate-900 tabular-nums">
            {activePoint.label}
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums text-slate-800">
            {activePoint.pm25} µg/m³ (est. AQI {activePoint.aqi})
          </span>
          <span aria-hidden="true">·</span>
          <span className={activePoint.ventilationSafe ? 'font-medium text-teal-800' : 'text-slate-700'}>
            {activePoint.phaseLabel}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 shrink-0">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-xs bg-teal-600" aria-hidden="true" />
            <span>Safe ventilation</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-xs bg-amber-400" aria-hidden="true" />
            <span>Elevated</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-xs bg-red-400" aria-hidden="true" />
            <span>Peak trap</span>
          </span>
        </div>
      </div>
    </section>
  );
}
