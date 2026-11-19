import { describe, expect, it } from 'vitest';
import {
  buildHourlyInversionCurve,
  buildLongTermExposureProjection,
  calculateImpactSummary,
  classifyAqiBand,
  estimatePm25FromAqi,
  filterActions,
  validateProfileInput,
} from '../utils/airImpact';
import type { AirAction, HouseholdProfile, ImpactSummary } from '../types/air';

const BASE_PROFILE: HouseholdProfile = {
  city: 'Krakow, Poland',
  aqi: 194,
  householdType: 'Family with school-age kids',
  heatingSource: 'District heating',
  commuteMode: 'Public transit / rail + walking',
  housingType: 'Historic brick tenement flat',
  priorities: ['Protect children & elders'],
};

const SAMPLE_ACTIONS: AirAction[] = [
  {
    id: 'routine-1',
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
  },
  {
    id: 'routine-2',
    category: 'routine',
    title: 'Skip cold-start errands',
    contextLabel: 'Morning commute',
    costTier: 'Zero cost',
    steps: 'Use commuter rail instead of sub-2km driving.',
    personalImpactSummary: '-18% cabin NO2',
    communityImpactSummary: 'Prevents cold catalytic soot',
    whyItWorks: 'Cold engines emit peak fine particulates.',
    exposureReductionPct: 20,
    weeklyCo2eAvoidedKg: 9.2,
    weeklyPm25AvoidedGrams: 11.4,
  },
  {
    id: 'indoor-1',
    category: 'indoor',
    title: 'Seal drafty bedroom perimeter',
    contextLabel: 'Sleeping zone',
    costTier: 'Low cost',
    steps: 'Install EPDM weatherstripping on casement frames.',
    personalImpactSummary: '-40% nocturnal infiltration',
    communityImpactSummary: 'Saves 8% heating gas load',
    whyItWorks: 'Positive HEPA pressure plus sealing blocks smoke intrusion.',
    exposureReductionPct: 45,
    weeklyCo2eAvoidedKg: 4.0,
    weeklyPm25AvoidedGrams: 5.5,
  },
  {
    id: 'community-1',
    category: 'community',
    title: 'Classroom Corsi-Rosenthal build',
    contextLabel: 'School co-op',
    costTier: 'Shared investment',
    steps: 'Assemble MERV-13 filter cubes with parent association.',
    personalImpactSummary: '-55% classroom PM2.5',
    communityImpactSummary: 'Clean air for 30 students',
    whyItWorks: 'High CADR box fans clean indoor air quietly.',
    exposureReductionPct: 25,
    weeklyCo2eAvoidedKg: 1.2,
    weeklyPm25AvoidedGrams: 3.0,
  },
];

describe('src/utils/airImpact unit tests', () => {
  describe('classifyAqiBand', () => {
    it('classifies all six EPA winter AQI bands and rounds/clamps inputs', () => {
      expect(classifyAqiBand(-12).severity).toBe('Good');
      expect(classifyAqiBand(50).severity).toBe('Good');
      expect(classifyAqiBand(50.4).severity).toBe('Good');
      expect(classifyAqiBand(51).severity).toBe('Moderate');
      expect(classifyAqiBand(100).severity).toBe('Moderate');
      expect(classifyAqiBand(101).severity).toBe('Sensitive');
      expect(classifyAqiBand(150).severity).toBe('Sensitive');
      expect(classifyAqiBand(151).severity).toBe('Unhealthy');
      expect(classifyAqiBand(200).severity).toBe('Unhealthy');
      expect(classifyAqiBand(201).severity).toBe('Very Unhealthy');
      expect(classifyAqiBand(300).severity).toBe('Very Unhealthy');
      expect(classifyAqiBand(301).severity).toBe('Hazardous');
      expect(classifyAqiBand(500).severity).toBe('Hazardous');
    });
  });

  describe('estimatePm25FromAqi', () => {
    it('interpolates across EPA breakpoints and clamps negative and extreme AQI values', () => {
      expect(estimatePm25FromAqi(-10)).toBe(0);
      expect(estimatePm25FromAqi(0)).toBe(0);
      expect(estimatePm25FromAqi(50)).toBe(12);
      expect(estimatePm25FromAqi(100)).toBe(35.4);
      expect(estimatePm25FromAqi(150)).toBe(55.4);
      expect(estimatePm25FromAqi(200)).toBe(150.4);
      expect(estimatePm25FromAqi(300)).toBe(250.4);
      expect(estimatePm25FromAqi(500)).toBe(500.4);
      expect(estimatePm25FromAqi(999)).toBe(500.4);
    });
  });

  describe('buildHourlyInversionCurve', () => {
    it('builds a 24-hour diurnal curve with accurate phase labels, formatted hours, and AQI ceiling', () => {
      const curve = buildHourlyInversionCurve(420);

      expect(curve).toHaveLength(24);
      expect(curve[0].label).toBe('12 AM');
      expect(curve[0].phaseLabel).toBe('Stable inversion layer');
      expect(curve[8].label).toBe('8 AM');
      expect(curve[8].phaseLabel).toBe('Morning commute + shallow cold trap');
      expect(curve[8].aqi).toBe(500);
      expect(curve[12].label).toBe('12 PM');
      expect(curve[13].ventilationSafe).toBe(true);
      expect(curve[14].label).toBe('2 PM');
      expect(curve[14].ventilationSafe).toBe(true);
      expect(curve[14].phaseLabel).toBe('Peak solar mixing · Best ventilation window');
      expect(curve[15].ventilationSafe).toBe(true);
      expect(curve[16].ventilationSafe).toBe(false);
      expect(curve[20].phaseLabel).toBe('Evening heating + nocturnal inversion');
      expect(curve[23].label).toBe('11 PM');
    });
  });

  describe('calculateImpactSummary', () => {
    it('returns baseline infiltration values when no actions are adopted', () => {
      const summary = calculateImpactSummary(SAMPLE_ACTIONS, [], BASE_PROFILE);

      expect(summary.adoptedCount).toBe(0);
      expect(summary.totalCount).toBe(4);
      expect(summary.exposureReductionPct).toBe(0);
      expect(summary.weeklyCo2eAvoidedKg).toBe(0);
      expect(summary.weeklyPm25AvoidedGrams).toBe(0);
      expect(summary.estimatedIndoorPm25).toBe(Number((summary.outdoorPm25 * 0.68).toFixed(1)));
    });

    it('applies lower infiltration for modern housing, enforces 4.0 floor, and caps reduction at 82%', () => {
      const modernLowAqi: HouseholdProfile = {
        ...BASE_PROFILE,
        aqi: 20,
        housingType: 'Modern sealed apartment',
      };
      const heavyStack: AirAction[] = Array.from({ length: 8 }, (_, idx) => ({
        ...SAMPLE_ACTIONS[0],
        id: `heavy-${idx}`,
        exposureReductionPct: 80,
        weeklyCo2eAvoidedKg: 1.15,
        weeklyPm25AvoidedGrams: 2.05,
      }));

      const summary = calculateImpactSummary(
        heavyStack,
        heavyStack.map((a) => a.id),
        modernLowAqi,
      );

      expect(summary.exposureReductionPct).toBe(82);
      expect(summary.estimatedIndoorPm25).toBe(4);
      expect(summary.weeklyCo2eAvoidedKg).toBe(9.2);
      expect(summary.weeklyPm25AvoidedGrams).toBe(16.4);
    });
  });

  describe('filterActions', () => {
    it('filters by category, adoption status, and case-insensitive search across all text fields', () => {
      const adopted = ['routine-1', 'indoor-1'];

      expect(filterActions(SAMPLE_ACTIONS, 'routine', 'all', adopted, '').map((a) => a.id)).toEqual([
        'routine-1',
        'routine-2',
      ]);
      expect(
        filterActions(SAMPLE_ACTIONS, 'routine', 'adopted', adopted, '').map((a) => a.id),
      ).toEqual(['routine-1']);
      expect(
        filterActions(SAMPLE_ACTIONS, 'routine', 'pending', adopted, '').map((a) => a.id),
      ).toEqual(['routine-2']);
      expect(
        filterActions(SAMPLE_ACTIONS, 'routine', 'all', adopted, '  BOUNDARY LAYER ').map(
          (a) => a.id,
        ),
      ).toEqual(['routine-1']);
      expect(
        filterActions(SAMPLE_ACTIONS, 'community', 'all', adopted, '30 students').map((a) => a.id),
      ).toEqual(['community-1']);
    });
  });

  describe('validateProfileInput', () => {
    it('validates empty/short cities and invalid or out-of-range AQI values', () => {
      expect(validateProfileInput({ ...BASE_PROFILE, city: '   ', aqi: 100 })).toEqual({
        city: 'Enter a city or neighborhood name so advice matches local winter conditions.',
      });
      expect(validateProfileInput({ ...BASE_PROFILE, city: 'A', aqi: 100 })).toEqual({
        city: 'City name must be at least 2 characters.',
      });
      expect(validateProfileInput({ ...BASE_PROFILE, aqi: Number.NaN })).toEqual({
        aqi: 'Enter a valid AQI value between 1 and 500.',
      });
      expect(validateProfileInput({ ...BASE_PROFILE, aqi: 0 })).toEqual({
        aqi: 'Enter a valid AQI value between 1 and 500.',
      });
      expect(validateProfileInput({ ...BASE_PROFILE, aqi: 501 })).toEqual({
        aqi: 'Enter a valid AQI value between 1 and 500.',
      });
      expect(validateProfileInput({ ...BASE_PROFILE, city: 'Boise', aqi: 1 })).toEqual({});
      expect(validateProfileInput({ ...BASE_PROFILE, city: 'Boise', aqi: 500 })).toEqual({});
    });
  });

  describe('buildLongTermExposureProjection', () => {
    it('clamps week bounds, scales seasonal savings, and handles 0% reduction baseline parity', () => {
      const zeroImpact: ImpactSummary = {
        outdoorPm25: 100,
        estimatedIndoorPm25: 52,
        exposureReductionPct: 0,
        weeklyCo2eAvoidedKg: 0,
        weeklyPm25AvoidedGrams: 0,
        adoptedCount: 0,
        totalCount: 4,
      };
      const shortProjection = buildLongTermExposureProjection(
        zeroImpact,
        { ...BASE_PROFILE, housingType: 'Modern sealed apartment' },
        1,
      );

      expect(shortProjection.points).toHaveLength(4);
      expect(shortProjection.totalAvoidedMg).toBe(0);
      expect(shortProjection.totalBaselineMg).toBe(shortProjection.totalProjectedMg);

      const activeImpact: ImpactSummary = {
        outdoorPm25: 200,
        estimatedIndoorPm25: 68,
        exposureReductionPct: 50,
        weeklyCo2eAvoidedKg: 10,
        weeklyPm25AvoidedGrams: 12.5,
        adoptedCount: 3,
        totalCount: 4,
      };
      const maxProjection = buildLongTermExposureProjection(activeImpact, BASE_PROFILE, 40);

      expect(maxProjection.points).toHaveLength(24);
      expect(maxProjection.points[0].weekLabel).toBe('W1');
      expect(maxProjection.points[23].weekLabel).toBe('W24');
      expect(maxProjection.seasonalCo2eAvoidedKg).toBe(240);
      expect(maxProjection.seasonalPm25PreventedGrams).toBe(300);
      expect(maxProjection.totalAvoidedMg).toBeGreaterThan(0);
    });
  });
});
