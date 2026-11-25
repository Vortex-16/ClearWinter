import { Search } from 'lucide-react';
import type { ActionCategory, AdoptionFilter } from '../../types/air';

interface ActionFilterBarProps {
  heading: string;
  subheading: string;
  statusFilter: AdoptionFilter;
  onStatusFilterChange: (next: AdoptionFilter) => void;
  searchQuery: string;
  onSearchQueryChange: (next: string) => void;
  impactNarrative: string;
  infoIcon: React.ReactNode;
}

const FILTER_TABS: Array<{ id: AdoptionFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'adopted', label: 'Adopted' },
  { id: 'pending', label: 'Pending' },
];

export const ACTION_CATEGORY_COPY: Record<
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

/**
 * Renders the category heading, keyword search box, adoption status toggle tabs,
 * and household impact narrative banner for ActionWorkspace.
 */
export function ActionFilterBar({
  heading,
  subheading,
  statusFilter,
  onStatusFilterChange,
  searchQuery,
  onSearchQueryChange,
  impactNarrative,
  infoIcon,
}: ActionFilterBarProps) {
  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <h2 className="font-display text-lg font-semibold text-slate-900">{heading}</h2>
          <p className="text-sm text-slate-600 leading-relaxed">{subheading}</p>
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
              className="w-full sm:w-52 rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 transition-colors focus:border-teal-700 focus:outline-none"
            />
          </div>

          <div
            className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg"
            role="group"
            aria-label="Filter by adoption status"
          >
            {FILTER_TABS.map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onStatusFilterChange(tab.id)}
                  aria-pressed={active}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md active:scale-[0.97] transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-teal-700 ${
                    active
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-3.5 flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed">
        {infoIcon}
        <p>{impactNarrative}</p>
      </div>
    </div>
  );
}
