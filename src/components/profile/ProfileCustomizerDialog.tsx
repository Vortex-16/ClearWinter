import { useEffect, useRef, useState, type FormEvent } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, X } from 'lucide-react';
import type { HouseholdProfile, ProfileValidationErrors } from '../../types/air';
import { validateProfileInput } from '../../utils/airImpact';
import { ProfileIdentityFields } from './ProfileIdentityFields';
import { ProfilePrioritiesFieldset } from './ProfilePrioritiesFieldset';
import { ProfileSelectGrid } from './ProfileSelectGrid';

export interface ProfileCustomizerDialogProps {
  initialProfile: HouseholdProfile;
  isGenerating: boolean;
  apiError: string | null;
  onClose: () => void;
  onGeneratePlan: (profile: HouseholdProfile) => Promise<void>;
  onApplyLocalProfile: (profile: HouseholdProfile) => void;
}

/**
 * Mounted dialog body managing local draft state, initial focus placement,
 * Escape dismissal, validation, and focus restoration on unmount.
 */
export function ProfileCustomizerDialog({
  initialProfile,
  isGenerating,
  apiError,
  onClose,
  onGeneratePlan,
  onApplyLocalProfile,
}: ProfileCustomizerDialogProps) {
  const [formState, setFormState] = useState<HouseholdProfile>(initialProfile);
  const [errors, setErrors] = useState<ProfileValidationErrors>({});
  const cityInputRef = useRef<HTMLInputElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusTimer = window.setTimeout(() => cityInputRef.current?.focus(), 20);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [onClose]);

  function togglePriority(priority: string) {
    setFormState((prev) => {
      const exists = prev.priorities.includes(priority);
      const next = exists
        ? prev.priorities.filter((item) => item !== priority)
        : [...prev.priorities, priority];
      return { ...prev, priorities: next };
    });
  }

  function validateForm(): boolean {
    const validation = validateProfileInput(formState);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return false;
    }
    setErrors({});
    return true;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (validateForm()) {
      await onGeneratePlan(formState);
    }
  }

  function handleApplyLocal() {
    if (validateForm()) {
      onApplyLocalProfile(formState);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
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
              Generate custom low-emission routines, indoor air hacks, and community alternatives
              with Gemini.
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

          <ProfileIdentityFields
            city={formState.city}
            aqi={formState.aqi}
            errors={errors}
            cityInputRef={cityInputRef}
            onCityChange={(city) => setFormState({ ...formState, city })}
            onAqiChange={(aqi) => setFormState({ ...formState, aqi })}
          />

          <ProfileSelectGrid
            profile={formState}
            onChange={(patch) => setFormState({ ...formState, ...patch })}
          />

          <ProfilePrioritiesFieldset
            selectedPriorities={formState.priorities}
            onTogglePriority={togglePriority}
          />

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
  );
}
