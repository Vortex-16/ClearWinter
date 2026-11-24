import { motion } from 'motion/react';
import { CalendarClock, Home, MessageSquareText, Users } from 'lucide-react';
import type { WorkspaceTab } from '../../types/air';

interface SidebarNavProps {
  activeTab: WorkspaceTab;
  counts: Record<'routine' | 'indoor' | 'community', number>;
  isCompact: boolean;
  isMobileDrawer: boolean;
  onSelectTab: (tab: WorkspaceTab) => void;
  onCloseMobile: () => void;
}

const NAV_ITEMS: Array<{
  id: WorkspaceTab;
  label: string;
  icon: typeof CalendarClock;
}> = [
  { id: 'routine', label: 'Daily Routine', icon: CalendarClock },
  { id: 'indoor', label: 'Indoor Air Hacks', icon: Home },
  { id: 'community', label: 'Community & Swaps', icon: Users },
  { id: 'assistant', label: 'Ask Assistant', icon: MessageSquareText },
];

/**
 * Primary workspace section navigation rendered inside both the desktop rail
 * and the mobile slide-in drawer, using scoped layoutId pills to keep active
 * indicator animations independent across viewports.
 */
export function SidebarNav({
  activeTab,
  counts,
  isCompact,
  isMobileDrawer,
  onSelectTab,
  onCloseMobile,
}: SidebarNavProps) {
  return (
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
            } ${isActive ? 'text-white' : 'text-slate-300 hover:bg-slate-900 hover:text-white'}`}
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
  );
}
