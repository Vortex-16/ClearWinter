import type { HouseholdProfile } from '../../types/air';
import {
  COMMUTE_OPTIONS,
  HEATING_OPTIONS,
  HOUSEHOLD_OPTIONS,
  HOUSING_OPTIONS,
} from './profileFormConstants';
import { ProfileSelectField } from './ProfileSelectField';

interface ProfileSelectGridProps {
  profile: HouseholdProfile;
  onChange: (patch: Partial<HouseholdProfile>) => void;
}

/**
 * Renders the 2x2 grid of household lifestyle dropdowns inside the customizer modal.
 */
export function ProfileSelectGrid({ profile, onChange }: ProfileSelectGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <ProfileSelectField
        id="profile-household"
        label="Household Profile"
        value={profile.householdType}
        options={HOUSEHOLD_OPTIONS}
        onChange={(householdType) => onChange({ householdType })}
      />
      <ProfileSelectField
        id="profile-heating"
        label="Primary Heating Source"
        value={profile.heatingSource}
        options={HEATING_OPTIONS}
        onChange={(heatingSource) => onChange({ heatingSource })}
      />
      <ProfileSelectField
        id="profile-commute"
        label="Daily Commute Mode"
        value={profile.commuteMode}
        options={COMMUTE_OPTIONS}
        onChange={(commuteMode) => onChange({ commuteMode })}
      />
      <ProfileSelectField
        id="profile-housing"
        label="Home Envelope & Ventilation"
        value={profile.housingType}
        options={HOUSING_OPTIONS}
        onChange={(housingType) => onChange({ housingType })}
      />
    </div>
  );
}
