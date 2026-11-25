import type { RefObject } from 'react';
import type { ProfileValidationErrors } from '../../types/air';

interface ProfileIdentityFieldsProps {
  city: string;
  aqi: number;
  errors: ProfileValidationErrors;
  cityInputRef: RefObject<HTMLInputElement | null>;
  onCityChange: (city: string) => void;
  onAqiChange: (aqi: number) => void;
}

/**
 * City/neighborhood text field and numeric AQI input with inline validation alerts.
 */
export function ProfileIdentityFields({
  city,
  aqi,
  errors,
  cityInputRef,
  onCityChange,
  onAqiChange,
}: ProfileIdentityFieldsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="sm:col-span-2 space-y-1.5">
        <label htmlFor="profile-city" className="block text-xs font-medium text-slate-700">
          City or Neighborhood
        </label>
        <input
          ref={cityInputRef}
          id="profile-city"
          type="text"
          value={city}
          onChange={(e) => onCityChange(e.target.value)}
          placeholder="e.g. Delhi NCR, Salt Lake City, Milan"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
        />
        {errors.city && (
          <p className="text-xs text-red-700" role="alert">
            {errors.city}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="profile-aqi" className="block text-xs font-medium text-slate-700">
          Current Winter AQI (1–500)
        </label>
        <input
          id="profile-aqi"
          type="number"
          min={1}
          max={500}
          value={Number.isNaN(aqi) ? '' : aqi}
          onChange={(e) => onAqiChange(e.target.value === '' ? NaN : Number(e.target.value))}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm tabular-nums text-slate-900 focus:border-teal-700 focus:outline-none"
        />
        {errors.aqi && (
          <p className="text-xs text-red-700" role="alert">
            {errors.aqi}
          </p>
        )}
      </div>
    </div>
  );
}
