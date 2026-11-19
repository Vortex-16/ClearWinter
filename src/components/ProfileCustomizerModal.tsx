import { useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { validateProfileInput } from '../utils/airImpact';
import type { HouseholdProfile, ProfileValidationErrors } from '../types/air';

interface ProfileCustomizerModalProps {
  open: boolean;
  initialProfile: HouseholdProfile;
  isGenerating: boolean;
  apiError: string | null;
  onClose: () => void;
  onGeneratePlan: (profile: HouseholdProfile) => Promise<void>;
  onApplyLocalProfile: (profile: HouseholdProfile) => void;
}

const HOUSEHOLD_OPTIONS = [
  'Family with young children & elders',
  'Family with school-age kids',
  'Multi-generational apartment',
  'Couple or solo remote worker',
  'Community organizer / school lead',
];

const HEATING_OPTIONS = [
  'Natural gas furnace / boiler',
  'Portable electric room heaters',
  'Electric heat pump',
  'District heating',
  'Solid fuel / wood / coal stove',
];

const COMMUTE_OPTIONS = [
  'Solo petrol/diesel car',
  'Metro + short car school drop-off',
  'Public transit / rail + walking',
  'Motorbike + car',
  'Bicycle + remote / hybrid',
];

const HOUSING_OPTIONS = [
  'Older apartment with drafty windows',
  'Modern sealed apartment',
  'Single-family home (1990s build)',
  'Historic brick tenement flat',
  'Townhouse with courtyard',
];

const PRIORITY_OPTIONS = [
  'Protect children & elders',
  'Low-cost DIY indoor hacks',
  'Zero-car school runs',
  'Cut heating & gas emissions',
  'Organize block-level alternatives',
];

export function ProfileCustomizerModal({
  open,
  initialProfile,
  isGenerating,
  apiError,
  onClose,
  onGeneratePlan,
  onApplyLocalProfile,
}: ProfileCustomizerModalProps) {
  const [formState, setFormState] = useState<HouseholdProfile>(initialProfile);
  const [errors, setErrors] = useState<ProfileValidationErrors>({});

  useEffect(() => {
    if (!open) return;
    setFormState(initialProfile);
    setErrors({});

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, initialProfile, onClose]);

  if (!open) {
    return null;
  }

  function togglePriority(priority: string) {
    setFormState((prev) => {
      const exists = prev.priorities.includes(priority);
      const next = exists
        ? prev.priorities.filter((item) => item !== priority)
        : [...prev.priorities, priority];
      return { ...prev, priorities: next };
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validation = validateProfileInput(formState);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }
    setErrors({});
    await onGeneratePlan(formState);
  }

  function handleApplyLocal() {
    const validation = validateProfileInput(formState);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }
    setErrors({});
    onApplyLocalProfile(formState);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="customizer-modal-title"
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white border border-slate-200 shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 id="customizer-modal-title" className="font-display text-lg font-semibold text-slate-900">
              Tailor Plan to Location &amp; Lifestyle
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Generate custom low-emission routines, indoor air hacks, and community alternatives with Gemini.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile customizer"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-teal-700"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5" noValidate>
          {apiError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-red-900"
            >
              <AlertCircle className="h-4 w-4 text-red-700 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{apiError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label htmlFor="profile-city" className="block text-xs font-medium text-slate-700">
                City or Neighborhood
              </label>
              <input
                id="profile-city"
                type="text"
                value={formState.city}
                onChange={(e) => setFormState({ ...formState, city: e.target.value })}
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
                value={Number.isNaN(formState.aqi) ? '' : formState.aqi}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    aqi: e.target.value === '' ? NaN : Number(e.target.value),
                  })
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm tabular-nums text-slate-900 focus:border-teal-700 focus:outline-none"
              />
              {errors.aqi && (
                <p className="text-xs text-red-700" role="alert">
                  {errors.aqi}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="profile-household" className="block text-xs font-medium text-slate-700">
                Household Profile
              </label>
              <select
                id="profile-household"
                value={formState.householdType}
                onChange={(e) => setFormState({ ...formState, householdType: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
              >
                {HOUSEHOLD_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="profile-heating" className="block text-xs font-medium text-slate-700">
                Primary Heating Source
              </label>
              <select
                id="profile-heating"
                value={formState.heatingSource}
                onChange={(e) => setFormState({ ...formState, heatingSource: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
              >
                {HEATING_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="profile-commute" className="block text-xs font-medium text-slate-700">
                Daily Commute Mode
              </label>
              <select
                id="profile-commute"
                value={formState.commuteMode}
                onChange={(e) => setFormState({ ...formState, commuteMode: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
              >
                {COMMUTE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="profile-housing" className="block text-xs font-medium text-slate-700">
                Home Envelope &amp; Ventilation
              </label>
              <select
                id="profile-housing"
                value={formState.housingType}
                onChange={(e) => setFormState({ ...formState, housingType: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
              >
                {HOUSING_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-slate-700">
              Top Priorities for This Plan
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRIORITY_OPTIONS.map((priority) => {
                const checked = formState.priorities.includes(priority);
                return (
                  <label
                    key={priority}
                    className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-xs cursor-pointer transition-colors ${
                      checked
                        ? 'border-teal-600 bg-teal-50 text-teal-900 font-medium'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => togglePriority(priority)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-teal-700 focus:ring-teal-700"
                    />
                    <span>{priority}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors focus-visible:outline-2 focus-visible:outline-teal-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplyLocal}
              disabled={isGenerating}
              className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-xs sm:text-sm font-medium text-slate-800 hover:bg-slate-100 disabled:opacity-60 transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-teal-700"
            >
              Apply Locally
            </button>
            <button
              type="submit"
              disabled={isGenerating}
              className="rounded-lg bg-teal-700 px-5 py-2 text-xs sm:text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60 transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-teal-700"
            >
              {isGenerating ? 'Generating Custom Plan...' : 'Generate Tailored Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
