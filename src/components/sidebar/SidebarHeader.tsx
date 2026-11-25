import type { RefObject } from 'react';
import { PanelLeftClose, PanelLeftOpen, Wind, X } from 'lucide-react';

interface SidebarHeaderProps {
  isCompact: boolean;
  isMobileDrawer: boolean;
  mobileCloseBtnRef: RefObject<HTMLButtonElement | null>;
  onCloseMobile: () => void;
  onToggleCollapsed?: () => void;
}

/**
 * Renders the ClearWinter brand badge alongside the desktop collapse toggle
 * or the mobile drawer close button.
 */
export function SidebarHeader({
  isCompact,
  isMobileDrawer,
  mobileCloseBtnRef,
  onCloseMobile,
  onToggleCollapsed,
}: SidebarHeaderProps) {
  return (
    <div className={`flex items-center ${isCompact ? 'flex-col gap-3' : 'justify-between px-1.5'}`}>
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
  );
}
