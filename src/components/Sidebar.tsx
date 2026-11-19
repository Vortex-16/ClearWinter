import {
  BookmarkCheck,
  CalendarClock,
  Home,
  MapPin,
  MessageSquareText,
  RefreshCw,
  SlidersHorizontal,
  Users,
  Wind,
  X,
} from 'lucide-react';
import type {
  HouseholdProfile,
  RegionalPreset,
  SavedLocationBaseline,
  WorkspaceTab,
} from '../types/air';

interface SidebarProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  presets: RegionalPreset[];
  activePresetId: string | null;
  onSelectPreset: (presetId: string) => void;
  profile: HouseholdProfile;
  savedBaseline: SavedLocationBaseline;
  onSaveBaseline: () => void;
  onCheckLiveAqi: () => void;
  isCheckingLive: boolean;
  onOpenCustomizer: () => void;
  counts: Record<'routine' | 'indoor' | 'community', number>;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: Array<{
  id: WorkspaceTab;
  label: string;
  description: string;
  icon: typeof CalendarClock;
}> = [
  {
    id: 'routine',
    label: 'Daily Routine',
    description: 'Exposure-timed schedule',
    icon: CalendarClock,
  },
  {
    id: 'indoor',
    label: 'Indoor Air Hacks',
    description: 'Filtration & sealing',
    icon: Home,
  },
  {
    id: 'community',
    label: 'Community & Swaps',
    description: 'Neighborhood alternatives',
    icon: Users,
  },
  {
    id: 'assistant',
    label: 'Ask Assistant',
    description: 'Tailored Q&A guidance',
    icon: MessageSquareText,
  },
];

export function Sidebar({
  activeTab,
  onSelectTab,
  presets,
  activePresetId,
  onSelectPreset,
  profile,
  savedBaseline,
  onSaveBaseline,
  onCheckLiveAqi,
  isCheckingLive,
  onOpenCustomizer,
  counts,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const baselineMatchesProfile =
    profile.city.trim().toLowerCase() === savedBaseline.city.trim().toLowerCase() &&
    Math.round(profile.aqi) === savedBaseline.baselineAqi;
  const sidebarBody = (
    <div className="flex h-full flex-col justify-between bg-white border-r border-slate-200 px-4 py-5">
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700 text-white">
              <Wind className="h-4 w-4" aria-hidden="true" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
              ClearWinter
            </span>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
            className="lg:hidden rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-teal-700"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Workspace sections" className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const count = item.id !== 'assistant' ? counts[item.id] : null;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobile();
                }}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-teal-700 ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${isActive ? 'text-teal-300' : 'text-slate-500'}`}
                    aria-hidden="true"
                  />
                  <span className="truncate text-sm font-medium">{item.label}</span>
                </span>
                {count !== null && (
                  <span
                    className={`font-mono text-xs tabular-nums shrink-0 ${
                      isActive ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 pt-5">
          <div className="px-2 pb-2 text-xs font-semibold text-slate-500">
            Winter Smog Scenarios
          </div>
          <div className="space-y-1">
            {presets.map((preset) => {
              const selected = activePresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    onSelectPreset(preset.id);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-teal-700 ${
                    selected
                      ? 'bg-teal-50 text-teal-900 font-medium border border-teal-200'
                      : 'text-slate-700 hover:bg-slate-100 border border-transparent'
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <MapPin
                      className={`h-3.5 w-3.5 shrink-0 ${
                        selected ? 'text-teal-700' : 'text-slate-400'
                      }`}
                      aria-hidden="true"
                    />
                    <span className="truncate">{preset.label}</span>
                  </span>
                  <span className="font-mono text-xs tabular-nums text-slate-500 shrink-0">
                    {preset.profile.aqi}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-4 space-y-3">
        <div className="px-2 space-y-1">
          <div className="text-xs font-semibold text-slate-500">Saved Alert Baseline</div>
          <div
            data-testid="saved-baseline-label"
            className="text-xs font-medium text-slate-900 truncate"
          >
            {savedBaseline.city} ·{' '}
            <span className="font-mono tabular-nums">{savedBaseline.baselineAqi} AQI</span>
          </div>
          <div className="text-xs text-slate-600 leading-relaxed truncate">
            {profile.householdType}
          </div>
        </div>
        <div className="space-y-2">
          {!baselineMatchesProfile && (
            <button
              type="button"
              onClick={onSaveBaseline}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 transition-colors focus-visible:outline-2 focus-visible:outline-teal-700 whitespace-nowrap"
            >
              <BookmarkCheck className="h-3.5 w-3.5 text-teal-300" aria-hidden="true" />
              <span>Save Current as Baseline</span>
            </button>
          )}
          <button
            type="button"
            onClick={onCheckLiveAqi}
            disabled={isCheckingLive}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60 transition-colors focus-visible:outline-2 focus-visible:outline-teal-700 whitespace-nowrap"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 text-slate-600 ${isCheckingLive ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>{isCheckingLive ? 'Checking Live AQI...' : 'Check Live AQI'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onOpenCustomizer();
              onCloseMobile();
            }}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 transition-colors focus-visible:outline-2 focus-visible:outline-teal-700 whitespace-nowrap"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-600" aria-hidden="true" />
            <span>Edit Lifestyle &amp; City</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-64 shrink-0">{sidebarBody}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50"
            aria-hidden="true"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[85vw] h-full z-10">{sidebarBody}</div>
        </div>
      )}
    </>
  );
}
