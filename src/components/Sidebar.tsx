import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { PanelLeftClose, PanelLeftOpen, Wind, X } from 'lucide-react';
import type {
  HouseholdProfile,
  RegionalPreset,
  SavedLocationBaseline,
  WorkspaceTab,
} from '../types/air';
import { SidebarFooter } from './sidebar/SidebarFooter';
import { SidebarNav } from './sidebar/SidebarNav';
import { SidebarPresets } from './sidebar/SidebarPresets';

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

/**
 * Responsive application sidebar rendering a fixed, collapsible desktop rail (272px/76px)
 * and an accessible modal drawer on tablet/mobile viewports.
 */
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
  const mobileCloseBtnRef = useRef<HTMLButtonElement | null>(null);

  // Move focus onto the close control whenever the mobile navigation drawer opens.
  useEffect(() => {
    if (!mobileOpen) return;
    const focusTimer = window.setTimeout(() => {
      mobileCloseBtnRef.current?.focus();
    }, 20);
    return () => window.clearTimeout(focusTimer);
  }, [mobileOpen]);

  const baselineMatchesProfile =
    profile.city.trim().toLowerCase() === savedBaseline.city.trim().toLowerCase() &&
    Math.round(profile.aqi) === savedBaseline.baselineAqi;

  const renderPanel = (isMobileDrawer: boolean) => {
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
                ref={mobileCloseBtnRef}
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

          <SidebarNav
            activeTab={activeTab}
            counts={counts}
            isCompact={isCompact}
            isMobileDrawer={isMobileDrawer}
            onSelectTab={onSelectTab}
            onCloseMobile={onCloseMobile}
          />

          <SidebarPresets
            presets={presets}
            activePresetId={activePresetId}
            isCompact={isCompact}
            onSelectPreset={onSelectPreset}
            onCloseMobile={onCloseMobile}
          />
        </div>

        <SidebarFooter
          profile={profile}
          savedBaseline={savedBaseline}
          baselineMatchesProfile={baselineMatchesProfile}
          isCompact={isCompact}
          isCheckingLive={isCheckingLive}
          onSaveBaseline={onSaveBaseline}
          onCheckLiveAqi={onCheckLiveAqi}
          onOpenCustomizer={onOpenCustomizer}
          onCloseMobile={onCloseMobile}
        />
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
        {renderPanel(false)}
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
              {renderPanel(true)}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
