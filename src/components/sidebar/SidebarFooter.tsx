import { BookmarkCheck, RefreshCw, SlidersHorizontal } from 'lucide-react';
import type { HouseholdProfile, SavedLocationBaseline } from '../../types/air';

interface SidebarFooterProps {
  profile: HouseholdProfile;
  savedBaseline: SavedLocationBaseline;
  baselineMatchesProfile: boolean;
  isCompact: boolean;
  isCheckingLive: boolean;
  onSaveBaseline: () => void;
  onCheckLiveAqi: () => void;
  onOpenCustomizer: () => void;
  onCloseMobile: () => void;
}

/**
 * Displays the user's persisted AQI alert baseline and quick actions to save
 * the active profile baseline, poll live station telemetry, or customize settings.
 */
export function SidebarFooter({
  profile,
  savedBaseline,
  baselineMatchesProfile,
  isCompact,
  isCheckingLive,
  onSaveBaseline,
  onCheckLiveAqi,
  onOpenCustomizer,
  onCloseMobile,
}: SidebarFooterProps) {
  return (
    <div className="border-t border-slate-800 pt-4 mt-6 space-y-3">
      {!isCompact && (
        <div className="rounded-xl bg-slate-900 border border-slate-800 px-3 py-2.5 space-y-1">
          <div className="text-xs font-semibold text-slate-400">Saved Alert Baseline</div>
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
            isCompact ? (isCheckingLive ? 'Checking Live AQI...' : 'Check Live AQI') : undefined
          }
          title={isCompact ? 'Check Live AQI' : undefined}
          className={`w-full flex items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-900 text-xs font-medium text-slate-200 hover:bg-slate-800 hover:border-slate-700 hover:text-white active:scale-[0.98] disabled:opacity-60 transition-all duration-150 focus-visible:outline-2 focus-visible:outline-teal-400 whitespace-nowrap ${
            isCompact ? 'p-2.5' : 'px-3 py-2'
          }`}
        >
          <RefreshCw
            className={`h-3.5 w-3.5 shrink-0 text-teal-400 ${isCheckingLive ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          {!isCompact && <span>{isCheckingLive ? 'Checking Live AQI...' : 'Check Live AQI'}</span>}
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
          <SlidersHorizontal className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
          {!isCompact && <span>Edit Lifestyle &amp; City</span>}
        </button>
      </div>
    </div>
  );
}
