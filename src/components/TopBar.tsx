import { Menu, SlidersHorizontal } from 'lucide-react';
import { classifyAqiBand } from '../utils/airImpact';
import type { HouseholdProfile, WorkspaceTab } from '../types/air';

interface TopBarProps {
  activeTab: WorkspaceTab;
  profile: HouseholdProfile;
  onOpenCustomizer: () => void;
  onOpenMobileMenu: () => void;
  isGenerating: boolean;
}

const TAB_TITLES: Record<WorkspaceTab, string> = {
  routine: 'Daily Routine',
  indoor: 'Indoor Air Hacks',
  community: 'Community & Swaps',
  assistant: 'Ask Assistant',
};

export function TopBar({
  activeTab,
  profile,
  onOpenCustomizer,
  onOpenMobileMenu,
  isGenerating,
}: TopBarProps) {
  const aqiBand = classifyAqiBand(profile.aqi);

  return (
    <header className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-3.5">
      <div className="flex items-center justify-between gap-4 sm:gap-8 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Open navigation menu"
            className="lg:hidden rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-teal-700"
          >
            <Menu className="h-4 w-4" aria-hidden="true" />
          </button>
          <div className="flex items-center gap-2 text-sm min-w-0">
            <span className="hidden sm:inline font-display font-semibold text-slate-500 whitespace-nowrap">
              ClearWinter
            </span>
            <span className="hidden sm:inline text-slate-300" aria-hidden="true">
              /
            </span>
            <h1 className="font-display text-base sm:text-lg font-semibold text-slate-900 truncate">
              {TAB_TITLES[activeTab]}
            </h1>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 text-xs text-slate-600 whitespace-nowrap shrink-0">
          <span className="font-medium text-slate-900">{profile.city}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums text-slate-800">AQI {profile.aqi}</span>
          <span aria-hidden="true">·</span>
          <span className={`font-semibold ${aqiBand.textColorClass}`}>{aqiBand.severity}</span>
        </div>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onOpenCustomizer}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-xs sm:text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{isGenerating ? 'Tailoring Plan...' : 'Tailor with AI'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
