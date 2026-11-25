import { MapPin } from 'lucide-react';
import type { RegionalPreset } from '../../types/air';

interface SidebarPresetsProps {
  presets: RegionalPreset[];
  activePresetId: string | null;
  isCompact: boolean;
  onSelectPreset: (presetId: string) => void;
  onCloseMobile: () => void;
}

/** Derives a two-letter monogram for compact collapsed sidebar preset buttons. */
function getPresetShortCode(label: string): string {
  const words = label.trim().split(/\s+/);
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return label.slice(0, 2).toUpperCase();
}

/**
 * Regional winter smog scenario switcher allowing instant comparison across
 * cities and seasonal particulate severity bands.
 */
export function SidebarPresets({
  presets,
  activePresetId,
  isCompact,
  onSelectPreset,
  onCloseMobile,
}: SidebarPresetsProps) {
  return (
    <div className="border-t border-slate-800 pt-5">
      {!isCompact && (
        <div className="px-2 pb-2 text-xs font-semibold text-slate-400">Winter Smog Scenarios</div>
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
              aria-label={isCompact ? `${preset.label} (${preset.profile.aqi} AQI)` : undefined}
              title={isCompact ? `${preset.label} · ${preset.profile.aqi} AQI` : undefined}
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
  );
}
