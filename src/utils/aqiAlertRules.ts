import { classifyAqiBand, estimatePm25FromAqi } from './airImpact';
import type {
  AqiAlertToast,
  AqiReadingEvent,
  AqiSeverity,
  SavedLocationBaseline,
} from '../types/air';

export const BASELINE_STORAGE_KEY = 'clearwinter.savedBaseline.v1';

export const SEVERITY_RANK: Record<AqiSeverity, number> = {
  Good: 0,
  Moderate: 1,
  Sensitive: 2,
  Unhealthy: 3,
  'Very Unhealthy': 4,
  Hazardous: 5,
};

export function normalizeCityName(city: string): string {
  return city
    .split(',')[0]
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function citiesMatch(cityA: string, cityB: string): boolean {
  const normA = normalizeCityName(cityA);
  const normB = normalizeCityName(cityB);
  if (!normA || !normB) return false;
  return normA === normB || normA.includes(normB) || normB.includes(normA);
}

export interface EvaluateWorseningInput {
  baseline: SavedLocationBaseline;
  reading: AqiReadingEvent;
  lastAlertedAqi: number | null;
}

export function evaluateAqiWorsening({
  baseline,
  reading,
  lastAlertedAqi,
}: EvaluateWorseningInput): AqiAlertToast | null {
  if (!citiesMatch(baseline.city, reading.city)) {
    return null;
  }

  const incomingAqi = Math.round(reading.aqi);
  const baseAqi = Math.round(baseline.baselineAqi);

  if (!Number.isFinite(incomingAqi) || incomingAqi < 1 || incomingAqi > 500) {
    return null;
  }

  const delta = incomingAqi - baseAqi;
  if (delta <= 0) {
    return null;
  }

  const baselineSeverity = classifyAqiBand(baseAqi).severity;
  const currentSeverity = classifyAqiBand(incomingAqi).severity;
  const severityWorsened = SEVERITY_RANK[currentSeverity] > SEVERITY_RANK[baselineSeverity];
  const significantSpike = delta >= 15;

  if (!severityWorsened && !significantSpike) {
    return null;
  }

  // Idempotent guard: skip duplicate or lower-magnitude alert if already alerted at this level
  if (lastAlertedAqi !== null) {
    const prevSeverity = classifyAqiBand(lastAlertedAqi).severity;
    if (
      incomingAqi <= lastAlertedAqi &&
      SEVERITY_RANK[currentSeverity] <= SEVERITY_RANK[prevSeverity]
    ) {
      return null;
    }
  }

  const reason = severityWorsened
    ? `Status escalated from ${baselineSeverity} to ${currentSeverity} (+${delta} AQI above saved baseline).`
    : `Local AQI climbed +${delta} points beyond your saved ${baseAqi} AQI baseline.`;

  return {
    id: `aqi-alert-${normalizeCityName(baseline.city).replace(/\s+/g, '-')}-${incomingAqi}-${reading.timestamp}`,
    city: baseline.city,
    baselineAqi: baseAqi,
    baselineSeverity,
    currentAqi: incomingAqi,
    currentSeverity,
    delta,
    pm25: reading.pm25 ?? estimatePm25FromAqi(incomingAqi),
    reason,
    source: reading.source,
    timestamp: reading.timestamp,
  };
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function loadSavedBaseline(
  storage: StorageLike | null,
  fallback: SavedLocationBaseline,
): SavedLocationBaseline {
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(BASELINE_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<SavedLocationBaseline>;
    if (
      typeof parsed.city === 'string' &&
      parsed.city.trim().length >= 2 &&
      typeof parsed.baselineAqi === 'number' &&
      Number.isFinite(parsed.baselineAqi) &&
      parsed.baselineAqi >= 1 &&
      parsed.baselineAqi <= 500
    ) {
      return {
        city: parsed.city.trim(),
        baselineAqi: Math.round(parsed.baselineAqi),
        savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : fallback.savedAt,
      };
    }
  } catch {
    return fallback;
  }
  return fallback;
}

export function persistSavedBaseline(
  storage: StorageLike | null,
  baseline: SavedLocationBaseline,
): void {
  if (!storage) return;
  try {
    storage.setItem(BASELINE_STORAGE_KEY, JSON.stringify(baseline));
  } catch {
    // Ignore storage quota errors gracefully
  }
}
