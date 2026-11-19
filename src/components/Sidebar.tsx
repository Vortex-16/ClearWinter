import { AnimatePresence, motion } from 'motion/react';
import {
  BookmarkCheck,
  CalendarClock,
  Home,
  MapPin,
  MessageSquareText,
  PanelLeftClose,
  PanelLeftOpen,
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
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
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

function getPresetShortCode(label: string): string {
  const words = label.trim().split(/\s+/);
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return label.slice(0, 2).toUpperCase();
}

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
  collapsed = false,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const baselineMatchesProfile =
    profile.city.trim().toLowerCase() === savedBaseline.city.trim().toLowerCase() &&
    Math.round(profile.aqi) === savedBaseline.baselineAqi;

  const renderSidebarBody = (isMobileDrawer: boolean) => {
    const isCompact = !isMobileDrawer && collapsed;

    return (
      <div
        className={`flex h-full flex-col justify-between bg-slate-950 text-slate-100 border-r border-slate-800/90 py-5 overflow-y-auto sidebar-scroll ${
          isCompact ? 'px-2.5' : 'px-4'
        }`}
      >
        <div className="space-y-6">
          <div
            className={`flex items-center ${
              isCompact ? 'flex-col gap-3' : 'justify-between px-1.5'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-white transition-transform duration-150 hover:scale-105">
                <Wind className="h-4 w-4" aria-hidden="true" />
              </div>
              {!isCompact && (
                <span className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap truncate">
                  ClearWinter
                </span>
              )}
            </div>

            {isMobileDrawer ? (
              <button
                type="button"
                onClick={onCloseMobile}
                aria-label="Close navigation menu"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white active:scale-[0.95] transition-all duration-150 focus-visible:outline-2 focus-visible:outline-teal-400"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            ) : (
              onToggleCollapsed && (
                <button
                  type="button"
                  onClick={onToggleCollapsed}
                  aria-label={isCompact ? 'Expand sidebar' : 'Collapse sidebar'}
                  aria-expanded={!isCompact}
                  title={isCompact ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
                  className="hidden lg:inline-flex items-center justify-center rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white active:scale-[0.95] transition-all duration-150 focus-visible:outline-2 focus-visible:outline-teal-400"
                >
                  {isCompact ? (
                    <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              )
            )}
          </div>

          <nav
            aria-label={isMobileDrawer ? 'Mobile workspace sections' : 'Workspace sections'}
            className="space-y-1"
          >
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
                  aria-label={isCompact ? item.label : undefined}
                  title={isCompact ? item.label : undefined}
                  aria-current={isActive ? 'page' : undefined}
                  className={`group relative w-full flex items-center rounded-lg text-left active:scale-[0.98] transition-all duration-150 focus-visible:outline-2 focus-visible:outline-teal-400 ${
                    isCompact ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'
                  } ${
                    isActive
                      ? 'text-white'
                      : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId={isMobileDrawer ? 'sidebar-nav-mobile' : 'sidebar-nav-desktop'}
                      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                      aria-hidden="true"
                      className="absolute inset-0 rounded-lg bg-slate-800 ring-1 ring-slate-700/90"
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`h-4 w-4 shrink-0 transition-transform duration-150 ${
                        isActive
                          ? 'text-teal-400'
                          : 'text-slate-400 group-hover:text-slate-200 group-hover:translate-x-0.5'
                      }`}
                      aria-hidden="true"
                    />
                    {!isCompact && (
                      <span className="truncate text-sm font-medium whitespace-nowrap">
                        {item.label}
                      </span>
                    )}
                  </span>
                  {!isCompact && count !== null && (
                    <span
                      className={`relative z-10 font-mono text-xs tabular-nums shrink-0 ${
                        isActive ? 'text-teal-300 font-medium' : 'text-slate-400'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="border-t border-slate-800 pt-5">
            {!isCompact && (
              <div className="px-2 pb-2 text-xs font-semibold text-slate-400">
                Winter Smog Scenarios
              </div>
            )}
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
                    aria-label={
                      isCompact ? `${preset.label} (${preset.profile.aqi} AQI)` : undefined
                    }
                    title={
                      isCompact ? `${preset.label} · ${preset.profile.aqi} AQI` : undefined
                    }
                    className={`group w-full flex items-center rounded-lg text-left text-sm active:scale-[0.98] transition-all duration-150 focus-visible:outline-2 focus-visible:outline-teal-400 ${
                      isCompact ? 'justify-center py-2 px-1' : 'justify-between px-3 py-2'
                    } ${
                      selected
                        ? 'bg-teal-950/90 text-teal-200 font-medium ring-1 ring-teal-700/70'
                        : 'text-slate-300 hover:bg-slate-900 hover:text-white border border-transparent'
                    }`}
                  >
                    {isCompact ? (
                      <span className="font-mono text-xs font-semibold tracking-tight tabular-nums">
                        {getPresetShortCode(preset.label)}
                      </span>
                    ) : (
                      <>
                        <span className="flex items-center gap-2 min-w-0">
                          <MapPin
                            className={`h-3.5 w-3.5 shrink-0 transition-transform duration-150 group-hover:scale-110 ${
                              selected ? 'text-teal-400' : 'text-slate-400'
                            }`}
                            aria-hidden="true"
                          />
                          <span className="truncate">{preset.label}</span>
                        </span>
                        <span
                          className={`font-mono text-xs tabular-nums shrink-0 ${
                            selected ? 'text-teal-300' : 'text-slate-400'
                          }`}
                        >
                          {preset.profile.aqi}
                        </span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-4 mt-6 space-y-3">
          {!isCompact && (
            <div className="rounded-xl bg-slate-900 border border-slate-800 px-3 py-2.5 space-y-1">
              <div className="text-[11px] font-semibold text-slate-400">
                Saved Alert Baseline
              </div>
              <div
                data-testid="saved-baseline-label"
                className="text-xs font-medium text-white truncate"
              >
                {savedBaseline.city} ·{' '}
                <span className="font-mono tabular-nums text-teal-300">
                  {savedBaseline.baselineAqi} AQI
                </span>
              </div>
              <div className="text-xs text-slate-400 leading-relaxed truncate">
                {profile.householdType}
              </div>
            </div>
          )}

          <div className="space-y-2">
            {!baselineMatchesProfile && (
              <button
                type="button"
                onClick={onSaveBaseline}
                aria-label={isCompact ? 'Save Current as Baseline' : undefined}
                title={isCompact ? 'Save Current as Baseline' : undefined}
                className={`w-full flex items-center justify-center gap-2 rounded-lg bg-teal-600 text-xs font-medium text-white hover:bg-teal-500 active:scale-[0.98] transition-all duration-150 focus-visible:outline-2 focus-visible:outline-teal-400 whitespace-nowrap ${
                  isCompact ? 'p-2.5' : 'px-3 py-2'
                }`}
              >
                <BookmarkCheck className="h-3.5 w-3.5 shrink-0 text-white" aria-hidden="true" />
                {!isCompact && <span>Save Current as Baseline</span>}
              </button>
            )}

            <button
              type="button"
              onClick={onCheckLiveAqi}
              disabled={isCheckingLive}
              aria-label={
                isCompact
                  ? isCheckingLive
                    ? 'Checking Live AQI...'
                    : 'Check Live AQI'
                  : undefined
              }
              title={isCompact ? 'Check Live AQI' : undefined}
              className={`w-full flex items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-900 text-xs font-medium text-slate-200 hover:bg-slate-800 hover:border-slate-700 hover:text-white active:scale-[0.98] disabled:opacity-60 transition-all duration-150 focus-visible:outline-2 focus-visible:outline-teal-400 whitespace-nowrap ${
                isCompact ? 'p-2.5' : 'px-3 py-2'
              }`}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 shrink-0 text-teal-400 ${
                  isCheckingLive ? 'animate-spin' : ''
                }`}
                aria-hidden="true"
              />
              {!isCompact && (
                <span>{isCheckingLive ? 'Checking Live AQI...' : 'Check Live AQI'}</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                onOpenCustomizer();
                onCloseMobile();
              }}
              aria-label={isCompact ? 'Edit Lifestyle & City' : undefined}
              title={isCompact ? 'Edit Lifestyle & City' : undefined}
              className={`w-full flex items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-900 text-xs font-medium text-slate-200 hover:bg-slate-800 hover:border-slate-700 hover:text-white active:scale-[0.98] transition-all duration-150 focus-visible:outline-2 focus-visible:outline-teal-400 whitespace-nowrap ${
                isCompact ? 'p-2.5' : 'px-3 py-2'
              }`}
            >
              <SlidersHorizontal
                className="h-3.5 w-3.5 shrink-0 text-slate-400"
                aria-hidden="true"
              />
              {!isCompact && <span>Edit Lifestyle &amp; City</span>}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <aside
        data-testid="desktop-sidebar"
        data-collapsed={collapsed ? 'true' : 'false'}
        aria-hidden={mobileOpen || undefined}
        className={`hidden lg:block lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 transition-[width] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          collapsed ? 'lg:w-[76px]' : 'lg:w-[272px]'
        }`}
      >
        {renderSidebarBody(false)}
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Workspace navigation menu"
            className="fixed inset-0 z-50 lg:hidden flex"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-[1px]"
              aria-hidden="true"
              onClick={onCloseMobile}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-72 max-w-[85vw] h-full z-10"
            >
              {renderSidebarBody(true)}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
