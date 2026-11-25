import { Info } from 'lucide-react';
import { filterActions } from '../utils/airImpact';
import type { ActionCategory, AdoptionFilter, AirAction } from '../types/air';
import { ActionCard } from './workspace/ActionCard';
import { ACTION_CATEGORY_COPY, ActionFilterBar } from './workspace/ActionFilterBar';

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

/**
 * Displays filterable winter smog mitigation cards for a selected intervention category
 * along with loading skeletons and an empty-filter recovery prompt.
 */
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
  const copy = ACTION_CATEGORY_COPY[category];
  const adoptedSet = new Set(adoptedIds);
  const filtered = filterActions(actions, category, statusFilter, adoptedIds, searchQuery);

  return (
    <section aria-label={copy.heading} className="space-y-5">
      <ActionFilterBar
        heading={copy.heading}
        subheading={copy.subheading}
        statusFilter={statusFilter}
        onStatusFilterChange={onStatusFilterChange}
        searchQuery={searchQuery}
        onSearchQueryChange={onSearchQueryChange}
        impactNarrative={impactNarrative}
        infoIcon={<Info className="h-4 w-4 text-teal-700 shrink-0 mt-0.5" aria-hidden="true" />}
      />

      {isLoading ? (
        <div
          role="status"
          className="space-y-4"
          aria-busy="true"
          aria-label="Generating tailored actions"
        >
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-3 animate-pulse"
            >
              <div className="h-4 w-1/3 bg-slate-200 rounded" />
              <div className="h-5 w-2/3 bg-slate-200 rounded" />
              <div className="h-12 w-full bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-8 text-center space-y-3">
          <p className="text-sm font-medium text-slate-900">
            No {copy.verb.toLowerCase()} items match your current filter.
          </p>
          <p className="text-xs text-slate-600">
            Clear your keyword search or switch the status filter back to All to inspect every
            recommendation.
          </p>
          <button
            type="button"
            onClick={() => {
              onStatusFilterChange('all');
              onSearchQueryChange('');
            }}
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 active:scale-[0.98] transition-all duration-150 focus-visible:outline-2 focus-visible:outline-teal-700"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((action) => (
            <ActionCard
              key={action.id}
              action={action}
              verb={copy.verb}
              isAdopted={adoptedSet.has(action.id)}
              onToggleAdopt={onToggleAdopt}
            />
          ))}
        </div>
      )}
    </section>
  );
}
