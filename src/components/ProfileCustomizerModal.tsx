import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, X } from 'lucide-react';
import { validateProfileInput } from '../utils/airImpact';
import type { HouseholdProfile, ProfileValidationErrors } from '../types/air';
import {
  COMMUTE_OPTIONS,
  HEATING_OPTIONS,
  HOUSEHOLD_OPTIONS,
  HOUSING_OPTIONS,
  PRIORITY_OPTIONS,
} from './profile/profileFormConstants';
import { ProfileSelectField } from './profile/ProfileSelectField';

interface ProfileCustomizerModalProps {
  open: boolean;
  initialProfile: HouseholdProfile;
  isGenerating: boolean;
  apiError: string | null;
  onClose: () => void;
  onGeneratePlan: (profile: HouseholdProfile) => Promise<void>;
  onApplyLocalProfile: (profile: HouseholdProfile) => void;
}

/**
 * Accessible modal dialog for editing household location, AQI, heating, commute,
 * and priority inputs with immediate local model preview or Gemini plan generation.
 */
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
  const cityInputRef = useRef<HTMLInputElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Sync form state with active profile on open, place focus in city field, and restore focus on close.
  useEffect(() => {
    if (!open) return;
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setFormState(initialProfile);
    setErrors({});

    const focusTimer = window.setTimeout(() => {
      cityInputRef.current?.focus();
    }, 20);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [open, initialProfile, onClose]);

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
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/55 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="customizer-modal-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white border border-slate-200 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2
                  id="customizer-modal-title"
                  className="font-display text-lg font-semibold text-slate-900"
                >
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
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 active:scale-[0.95] transition-all duration-150 focus-visible:outline-2 focus-visible:outline-teal-700"
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
                    ref={cityInputRef}
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
                <ProfileSelectField
                  id="profile-household"
                  label="Household Profile"
                  value={formState.householdType}
                  options={HOUSEHOLD_OPTIONS}
                  onChange={(value) => setFormState({ ...formState, householdType: value })}
                />
                <ProfileSelectField
                  id="profile-heating"
                  label="Primary Heating Source"
                  value={formState.heatingSource}
                  options={HEATING_OPTIONS}
                  onChange={(value) => setFormState({ ...formState, heatingSource: value })}
                />
                <ProfileSelectField
                  id="profile-commute"
                  label="Daily Commute Mode"
                  value={formState.commuteMode}
                  options={COMMUTE_OPTIONS}
                  onChange={(value) => setFormState({ ...formState, commuteMode: value })}
                />
                <ProfileSelectField
                  id="profile-housing"
                  label="Home Envelope & Ventilation"
                  value={formState.housingType}
                  options={HOUSING_OPTIONS}
                  onChange={(value) => setFormState({ ...formState, housingType: value })}
                />
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
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-all duration-150 focus-visible:outline-2 focus-visible:outline-teal-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyLocal}
                  disabled={isGenerating}
                  className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-xs sm:text-sm font-medium text-slate-800 hover:bg-slate-100 active:scale-[0.98] disabled:opacity-60 transition-all duration-150 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-teal-700"
                >
                  Apply Locally
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="rounded-lg bg-teal-700 px-5 py-2 text-xs sm:text-sm font-medium text-white hover:bg-teal-800 active:scale-[0.98] disabled:opacity-60 transition-all duration-150 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-teal-700"
                >
                  {isGenerating ? 'Generating Custom Plan...' : 'Generate Tailored Plan'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
