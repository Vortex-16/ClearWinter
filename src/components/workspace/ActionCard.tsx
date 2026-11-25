import { Check, ShieldCheck, Sprout } from 'lucide-react';
import type { AirAction } from '../../types/air';

interface ActionCardProps {
  action: AirAction;
  verb: string;
  isAdopted: boolean;
  onToggleAdopt: (id: string) => void;
}

/**
 * Displays a single winter smog intervention card with adoption toggle,
 * direct personal exposure reduction metrics, community emissions impact, and mechanism.
 */
export function ActionCard({ action, verb, isAdopted, onToggleAdopt }: ActionCardProps) {
  return (
    <article
      data-testid={`action-card-${action.id}`}
      className={`border rounded-2xl p-5 transition-all duration-150 ${
        isAdopted
          ? 'border-teal-600 bg-teal-50/25'
          : 'border-slate-200/90 bg-white hover:border-slate-300'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>{action.contextLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{action.costTier}</span>
            {isAdopted && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-medium text-teal-700">Active in household plan</span>
              </>
            )}
          </div>
          <h3 className="font-display text-base font-semibold text-slate-900">{action.title}</h3>
        </div>

        <button
          type="button"
          onClick={() => onToggleAdopt(action.id)}
          aria-pressed={isAdopted}
          aria-label={isAdopted ? `Remove '${action.title}' from plan` : `Adopt '${action.title}'`}
          className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-medium active:scale-[0.98] transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-teal-700 ${
            isAdopted
              ? 'bg-teal-700 text-white hover:bg-teal-800'
              : 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 hover:border-slate-400'
          }`}
        >
          <Check
            className={`h-3.5 w-3.5 transition-transform duration-150 ${
              isAdopted ? 'text-white scale-110' : 'text-slate-400'
            }`}
            aria-hidden="true"
          />
          <span>{isAdopted ? 'Adopted' : `Adopt ${verb}`}</span>
        </button>
      </div>

      <p className="mt-3 text-sm text-slate-700 leading-relaxed">{action.steps}</p>

      <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
            <ShieldCheck className="h-3.5 w-3.5 text-teal-700 shrink-0" aria-hidden="true" />
            <span>Direct Personal Impact</span>
          </div>
          <p className="text-xs text-slate-700">
            {action.personalImpactSummary}{' '}
            <span className="font-mono tabular-nums text-teal-800 font-medium">
              (-{action.exposureReductionPct}% exposure weight)
            </span>
          </p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
            <Sprout className="h-3.5 w-3.5 text-emerald-700 shrink-0" aria-hidden="true" />
            <span>Direct Community Impact</span>
          </div>
          <p className="text-xs text-slate-700">
            {action.communityImpactSummary}{' '}
            <span className="font-mono tabular-nums text-slate-800 font-medium">
              (-{action.weeklyCo2eAvoidedKg.toFixed(1)} kg CO2e · -
              {action.weeklyPm25AvoidedGrams.toFixed(1)} g PM2.5/wk)
            </span>
          </p>
        </div>
      </div>

      <p className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 leading-relaxed">
        <span className="font-semibold text-slate-800">Mechanism: </span>
        {action.whyItWorks}
      </p>
    </article>
  );
}
