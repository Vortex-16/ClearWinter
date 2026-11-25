export type ActionCategory = 'routine' | 'indoor' | 'community';

export type WorkspaceTab = ActionCategory | 'assistant';

export type AdoptionFilter = 'all' | 'adopted' | 'pending';

export type AqiSeverity =
  'Good' | 'Moderate' | 'Sensitive' | 'Unhealthy' | 'Very Unhealthy' | 'Hazardous';

export type CostTier = 'Zero cost' | 'Low cost' | 'Shared investment';

export interface HouseholdProfile {
  city: string;
  aqi: number;
  householdType: string;
  heatingSource: string;
  commuteMode: string;
  housingType: string;
  priorities: string[];
}

export interface AirAction {
  id: string;
  category: ActionCategory;
  title: string;
  contextLabel: string;
  costTier: CostTier;
  steps: string;
  personalImpactSummary: string;
  communityImpactSummary: string;
  whyItWorks: string;
  exposureReductionPct: number;
  weeklyCo2eAvoidedKg: number;
  weeklyPm25AvoidedGrams: number;
}

export interface HourlySmogPoint {
  hour: number;
  label: string;
  pm25: number;
  aqi: number;
  ventilationSafe: boolean;
  phaseLabel: string;
}

export interface ImpactSummary {
  outdoorPm25: number;
  estimatedIndoorPm25: number;
  exposureReductionPct: number;
  weeklyCo2eAvoidedKg: number;
  weeklyPm25AvoidedGrams: number;
  adoptedCount: number;
  totalCount: number;
}

export interface AqiClassification {
  severity: AqiSeverity;
  advisory: string;
  textColorClass: string;
  surfaceClass: string;
  borderColorClass: string;
  dotColorClass: string;
}

export interface RegionalPreset {
  id: string;
  label: string;
  seasonNote: string;
  profile: HouseholdProfile;
  bestVentilationWindow: string;
  impactNarrative: string;
  actions: AirAction[];
  defaultAdoptedIds: string[];
}

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  personalTakeaway?: string;
  communityTakeaway?: string;
}

export interface ProfileValidationErrors {
  city?: string;
  aqi?: string;
}

export interface GeneratedPlanPayload {
  bestVentilationWindow: string;
  impactNarrative: string;
  actions: AirAction[];
}

export interface SavedLocationBaseline {
  city: string;
  baselineAqi: number;
  savedAt: string;
}

export interface AqiReadingEvent {
  city: string;
  aqi: number;
  pm25?: number;
  source: 'open-meteo' | 'station-feed';
  timestamp: string;
}

export interface AqiAlertToast {
  id: string;
  city: string;
  baselineAqi: number;
  baselineSeverity: AqiSeverity;
  currentAqi: number;
  currentSeverity: AqiSeverity;
  delta: number;
  pm25: number;
  reason: string;
  source: 'open-meteo' | 'station-feed';
  timestamp: string;
}

export interface LongTermProjectionPoint {
  weekNumber: number;
  weekLabel: string;
  baselineCumulativeMg: number;
  projectedCumulativeMg: number;
  avoidedCumulativeMg: number;
}

export interface LongTermProjectionSummary {
  points: LongTermProjectionPoint[];
  totalBaselineMg: number;
  totalProjectedMg: number;
  totalAvoidedMg: number;
  seasonalCo2eAvoidedKg: number;
  seasonalPm25PreventedGrams: number;
}
