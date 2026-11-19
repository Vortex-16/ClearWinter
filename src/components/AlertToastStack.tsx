import { ArrowUpRight, ShieldAlert, X } from 'lucide-react';
import type { AqiAlertToast } from '../types/air';

interface AlertToastStackProps {
  alerts: AqiAlertToast[];
  onDismiss: (id: string) => void;
  onApplyLiveAqi: (alert: AqiAlertToast) => void;
}

export function AlertToastStack({
  alerts,
  onDismiss,
  onApplyLiveAqi,
}: AlertToastStackProps) {
  if (alerts.length === 0) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="Real-time air quality alerts"
      className="fixed bottom-4 right-4 left-4 sm:left-auto z-50 flex flex-col gap-2.5 sm:w-96 max-w-full pointer-events-none"
    >
      {alerts.map((alert) => (
        <div
          key={alert.id}
          role="alert"
          aria-live="assertive"
          data-testid={`aqi-toast-${alert.currentAqi}`}
          className="pointer-events-auto rounded-xl border border-red-300 bg-white p-4 shadow-lg space-y-2.5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-700 border border-red-200">
                <ShieldAlert className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="min-w-0 space-y-0.5">
                <div className="text-xs font-semibold text-red-800">
                  Air Quality Alert · {alert.currentSeverity}
                </div>
                <div className="text-sm font-semibold text-slate-900 truncate">
                  {alert.city}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onDismiss(alert.id)}
              aria-label={`Dismiss AQI alert for ${alert.city}`}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-teal-700 shrink-0"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <p className="text-xs text-slate-700 leading-relaxed">{alert.reason}</p>

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <div className="font-mono text-xs tabular-nums text-slate-600">
              <span>{alert.baselineAqi}</span>
              <span aria-hidden="true"> → </span>
              <span className="font-semibold text-red-700">{alert.currentAqi} AQI</span>
              <span className="text-slate-400"> · {alert.pm25} µg/m³</span>
            </div>

            <button
              type="button"
              onClick={() => onApplyLiveAqi(alert)}
              className="inline-flex items-center gap-1 rounded-lg bg-red-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-800 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-red-700"
            >
              <span>Apply {alert.currentAqi} AQI</span>
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
