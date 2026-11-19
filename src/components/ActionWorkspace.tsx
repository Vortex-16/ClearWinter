import { Check, Info, Search, ShieldCheck, Sprout } from 'lucide-react';
import { filterActions } from '../utils/airImpact';
import type { ActionCategory, AdoptionFilter, AirAction } from '../types/air';

interface ActionWorkspaceProps {
  category: ActionCategory;
  actions: AirAction[];
  adoptedIds: string[];
  onToggleAdopt: (id: string) => void;
  statusFilter: AdoptionFilter;
  onStatusFilterChange: (next: AdoptionFilter) => void;
  searchQuery: string;
  onSearchQueryChange: (next: string) => void;
  isLoading: boolean;
  impactNarrative: string;
}

const CATEGORY_COPY: Record<
  ActionCategory,
  { heading: string; subheading: string; verb: string }
> = {
  routine: {
    heading: 'Low-Emission Daily Routines',
    subheading:
      'Time outdoor movement, cooking, and short trips around winter thermal inversion cycles to slash both inhaled dose and curbside exhaust.',
    verb: 'Routine',
  },
  indoor: {
    heading: 'Indoor Air Quality Hacks',
    subheading:
      'Targeted filtration, perimeter sealing, and combustion elimination that keep living and sleeping spaces clean without wasted heating energy.',
    verb: 'Hack',
  },
  community: {
    heading: 'Sustainable Community Alternatives',
    subheading:
      'Shared school runs, classroom filtration builds, and clean-heat swaps that lower particulate load across the whole block.',
    verb: 'Alternative',
  },
};

export function ActionWorkspace({
  category,
  actions,
  adoptedIds,
  onToggleAdopt,
  statusFilter,
  onStatusFilterChange,
  searchQuery,
  onSearchQueryChange,
  isLoading,
  impactNarrative,
}: ActionWorkspaceProps) {
  const copy = CATEGORY_COPY[category];
  const adoptedSet = new Set(adoptedIds);
  const filtered = filterActions(actions, category, statusFilter, adoptedIds, searchQuery);

  return (
    <section aria-label={copy.heading} className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <h2 className="font-display text-lg font-semibold text-slate-900">{copy.heading}</h2>
            <p className="text-sm text-slate-600 leading-relaxed">{copy.subheading}</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <div className="relative">
              <label htmlFor="action-search" className="sr-only">
                Search recommendations
              </label>
              <Search
                className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="action-search"
                type="search"
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                placeholder="Filter by keyword..."
                className="w-full sm:w-52 rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none"
              />
            </div>

            <div
              className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg"
              role="group"
              aria-label="Filter by adoption status"
            >
              {(['all', 'adopted', 'pending'] as AdoptionFilter[]).map((tab) => {
                const active = statusFilter === tab;
                const label = tab === 'all' ? 'All' : tab === 'adopted' ? 'Adopted' : 'Pending';
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => onStatusFilterChange(tab)}
                    aria-pressed={active}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-teal-700 ${
                      active
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-3.5 flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed">
          <Info className="h-4 w-4 text-teal-700 shrink-0 mt-0.5" aria-hidden="true" />
          <p>{impactNarrative}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4" aria-busy="true" aria-label="Generating tailored actions">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 animate-pulse"
            >
              <div className="h-4 w-1/3 bg-slate-200 rounded" />
              <div className="h-5 w-2/3 bg-slate-200 rounded" />
              <div className="h-12 w-full bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-3">
          <p className="text-sm font-medium text-slate-900">
            No {copy.verb.toLowerCase()} items match your current filter.
          </p>
          <p className="text-xs text-slate-600">
            Clear your keyword search or switch the status filter back to All to inspect every recommendation.
          </p>
          <button
            type="button"
            onClick={() => {
              onStatusFilterChange('all');
              onSearchQueryChange('');
            }}
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 transition-colors focus-visible:outline-2 focus-visible:outline-teal-700"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((action) => {
            const isAdopted = adoptedSet.has(action.id);
            return (
              <article
                key={action.id}
                data-testid={`action-card-${action.id}`}
                className={`bg-white border rounded-xl p-5 transition-colors ${
                  isAdopted ? 'border-teal-600' : 'border-slate-200'
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
                    <h3 className="font-display text-base font-semibold text-slate-900">
                      {action.title}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => onToggleAdopt(action.id)}
                    aria-pressed={isAdopted}
                    aria-label={
                      isAdopted ? `Remove '${action.title}' from plan` : `Adopt '${action.title}'`
                    }
                    className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-teal-700 ${
                      isAdopted
                        ? 'bg-teal-700 text-white hover:bg-teal-800'
                        : 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <Check
                      className={`h-3.5 w-3.5 ${isAdopted ? 'text-white' : 'text-slate-400'}`}
                      aria-hidden="true"
                    />
                    <span>{isAdopted ? 'Adopted' : `Adopt ${copy.verb}`}</span>
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
          })}
        </div>
      )}
    </section>
  );
}
