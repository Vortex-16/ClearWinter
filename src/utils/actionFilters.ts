import type {
  ActionCategory,
  AdoptionFilter,
  AirAction,
  HouseholdProfile,
  ProfileValidationErrors,
} from '../types/air';

/** Filters actions by workspace category, adoption status, and multi-field keyword search. */
export function filterActions(
  actions: AirAction[],
  category: ActionCategory,
  statusFilter: AdoptionFilter,
  adoptedIds: string[],
  searchQuery: string,
): AirAction[] {
  const adoptedSet = new Set(adoptedIds);
  const normalizedQuery = searchQuery.trim().toLowerCase();

  return actions.filter((action) => {
    if (action.category !== category) {
      return false;
    }
    const isAdopted = adoptedSet.has(action.id);
    if (statusFilter === 'adopted' && !isAdopted) {
      return false;
    }
    if (statusFilter === 'pending' && isAdopted) {
      return false;
    }
    if (!normalizedQuery) {
      return true;
    }

    const haystack = [
      action.title,
      action.contextLabel,
      action.steps,
      action.personalImpactSummary,
      action.communityImpactSummary,
      action.whyItWorks,
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}

/** Validates household city and AQI range (1–500) prior to local update or AI plan requests. */
export function validateProfileInput(profile: HouseholdProfile): ProfileValidationErrors {
  const errors: ProfileValidationErrors = {};

  if (!profile.city.trim()) {
    errors.city = 'Enter a city or neighborhood name so advice matches local winter conditions.';
  } else if (profile.city.trim().length < 2) {
    errors.city = 'City name must be at least 2 characters.';
  }

  if (!Number.isFinite(profile.aqi) || profile.aqi < 1 || profile.aqi > 500) {
    errors.aqi = 'Enter a valid AQI value between 1 and 500.';
  }

  return errors;
}
