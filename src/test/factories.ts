import axe from 'axe-core';
import { expect, vi } from 'vitest';
import type {
  AirAction,
  AqiAlertToast,
  AqiClassification,
  HouseholdProfile,
  ImpactSummary,
  SavedLocationBaseline,
} from '../types/air';

/** Builds a default valid HouseholdProfile fixture with optional field overrides. */
export function createTestProfile(overrides: Partial<HouseholdProfile> = {}): HouseholdProfile {
  return {
    city: 'Delhi NCR, India',
    aqi: 312,
    householdType: 'Family with young children & elders',
    heatingSource: 'Portable electric room heaters',
    commuteMode: 'Metro + short car school drop-off',
    housingType: 'Older apartment with drafty windows',
    priorities: ['Protect children & elders'],
    ...overrides,
  };
}

/** Builds a SavedLocationBaseline fixture with optional overrides. */
export function createTestBaseline(
  overrides: Partial<SavedLocationBaseline> = {},
): SavedLocationBaseline {
  return {
    city: 'Delhi NCR, India',
    baselineAqi: 312,
    savedAt: '2026-11-19T10:00:00.000Z',
    ...overrides,
  };
}

/** Builds a valid AirAction fixture with optional overrides. */
export function createTestAction(overrides: Partial<AirAction> = {}): AirAction {
  return {
    id: 'act-1',
    category: 'routine',
    title: 'Midday solar window walk',
    contextLabel: 'Afternoon · Daily',
    costTier: 'Zero cost',
    steps: 'Shift outdoor errands to 1 PM – 3 PM.',
    personalImpactSummary: '-35% inhaled PM2.5 dose',
    communityImpactSummary: 'Reduces rush-hour car idling',
    whyItWorks: 'Afternoon warming lifts the winter boundary layer.',
    exposureReductionPct: 30,
    weeklyCo2eAvoidedKg: 2.5,
    weeklyPm25AvoidedGrams: 4.1,
    ...overrides,
  };
}

/** Builds an ImpactSummary fixture with optional overrides. */
export function createTestImpact(overrides: Partial<ImpactSummary> = {}): ImpactSummary {
  return {
    outdoorPm25: 235.4,
    estimatedIndoorPm25: 80.0,
    exposureReductionPct: 50,
    weeklyCo2eAvoidedKg: 15.0,
    weeklyPm25AvoidedGrams: 18.0,
    adoptedCount: 3,
    totalCount: 8,
    ...overrides,
  };
}

/** Builds an AqiAlertToast fixture with optional overrides. */
export function createTestAlert(overrides: Partial<AqiAlertToast> = {}): AqiAlertToast {
  return {
    id: 'alert-365',
    city: 'Delhi NCR, India',
    baselineAqi: 312,
    baselineSeverity: 'Hazardous',
    currentAqi: 365,
    currentSeverity: 'Hazardous',
    delta: 53,
    pm25: 315.4,
    reason: 'Local AQI climbed +53 points beyond your saved 312 AQI baseline.',
    source: 'station-feed',
    timestamp: '2026-11-19T12:00:00.000Z',
    ...overrides,
  };
}

/** Deterministic AQI severity band stub for isolated component and rule unit tests. */
export function createAqiBandStub(aqi: number): AqiClassification {
  let severity: AqiClassification['severity'] = 'Hazardous';
  if (aqi <= 50) severity = 'Good';
  else if (aqi <= 100) severity = 'Moderate';
  else if (aqi <= 150) severity = 'Sensitive';
  else if (aqi <= 200) severity = 'Unhealthy';
  else if (aqi <= 300) severity = 'Very Unhealthy';

  return {
    severity,
    advisory: `${severity} advisory`,
    textColorClass: 'text-red-900',
    surfaceClass: 'bg-red-100',
    borderColorClass: 'border-red-300',
    dotColorClass: 'bg-red-800',
  };
}

/** Stubs global `fetch` for static-host API fallbacks and live Open-Meteo AQI checks. */
export function mockStaticEndpoints(liveAqi = 312) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input);
    if (url.startsWith('/api/aqi-live')) {
      return new Response(
        JSON.stringify({
          reading: {
            city: 'Delhi NCR, India',
            aqi: liveAqi,
            pm25: 315.4,
            source: 'station-feed',
            timestamp: '2026-11-19T13:00:00.000Z',
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    if (url.includes('geocoding-api.open-meteo.com')) {
      return new Response(JSON.stringify({ results: [{ latitude: 28.61, longitude: 77.21 }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (url.includes('air-quality-api.open-meteo.com')) {
      return new Response(JSON.stringify({ current: { us_aqi: liveAqi, pm2_5: 315.4 } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response('<html>404</html>', {
      status: 404,
      headers: { 'content-type': 'text/html' },
    });
  });
}

/** Executes an axe-core WCAG accessibility audit on a rendered container in jsdom. */
export async function runAxeAudit(container: HTMLElement): Promise<void> {
  const results = await axe.run(container, {
    rules: {
      // jsdom does not compute layout pixels needed for canvas contrast checks
      'color-contrast': { enabled: false },
    },
  });

  if (results.violations.length > 0) {
    const summary = results.violations
      .map(
        (v) =>
          `[${v.id}] (${v.impact ?? 'unknown'}) ${v.help}: ${v.nodes
            .map((n) => n.target.join(' '))
            .join(', ')}`,
      )
      .join('\n');
    throw new Error(`Accessibility violations detected:\n${summary}`);
  }

  expect(results.violations).toHaveLength(0);
}
