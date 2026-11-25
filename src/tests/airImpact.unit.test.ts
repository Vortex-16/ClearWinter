import { describe, expect, it } from 'vitest';
import { REGIONAL_PRESETS } from '../data/presets';
import { createTestAction, createTestProfile } from '../test/factories';
import type { AirAction, ImpactSummary } from '../types/air';
import {
  buildHourlyInversionCurve,
  buildLongTermExposureProjection,
  calculateImpactSummary,
  classifyAqiBand,
  estimatePm25FromAqi,
  filterActions,
  getBaselineInfiltrationFactor,
  validateProfileInput,
} from '../utils/airImpact';

const BASE_PROFILE = createTestProfile({
  city: 'Krakow, Poland',
  aqi: 194,
  householdType: 'Family with school-age kids',
  heatingSource: 'District heating',
  commuteMode: 'Public transit / rail + walking',
  housingType: 'Historic brick tenement flat',
});

const SAMPLE_ACTIONS: AirAction[] = [
  createTestAction({ id: 'routine-1', category: 'routine', exposureReductionPct: 30 }),
  createTestAction({
    id: 'routine-2',
    category: 'routine',
    title: 'Skip cold-start errands',
    steps: 'Use commuter rail instead of sub-2km driving.',
    whyItWorks: 'Cold engines emit peak fine particulates.',
    exposureReductionPct: 20,
    weeklyCo2eAvoidedKg: 9.2,
    weeklyPm25AvoidedGrams: 11.4,
  }),
  createTestAction({
    id: 'indoor-1',
    category: 'indoor',
    title: 'Seal drafty bedroom perimeter',
    whyItWorks: 'Positive HEPA pressure plus sealing blocks smoke intrusion.',
    exposureReductionPct: 45,
    weeklyCo2eAvoidedKg: 4.0,
    weeklyPm25AvoidedGrams: 5.5,
  }),
  createTestAction({
    id: 'community-1',
    category: 'community',
    title: 'Classroom Corsi-Rosenthal build',
    communityImpactSummary: 'Clean air for 30 students',
    exposureReductionPct: 25,
    weeklyCo2eAvoidedKg: 1.2,
    weeklyPm25AvoidedGrams: 3.0,
  }),
];

describe('src/utils/airImpact unit tests', () => {
  describe('classifyAqiBand', () => {
    it('classifies all six EPA winter AQI bands with styling classes and advisories', () => {
      expect(classifyAqiBand(-12).severity).toBe('Good');
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
      expect(classifyAqiBand(999).severity).toBe('Hazardous');

      const severe = classifyAqiBand(312);
      expect(severe.textColorClass).toContain('text-red');
      expect(severe.surfaceClass).toContain('bg-red');
      expect(severe.advisory.length).toBeGreaterThan(20);
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
    it('builds a 24-hour diurnal curve with accurate phase labels and AQI ceiling', () => {
      const curve = buildHourlyInversionCurve(420);

      expect(curve).toHaveLength(24);
      expect(curve[0].label).toBe('12 AM');
      expect(curve[0].phaseLabel).toBe('Stable inversion layer');
      expect(curve[8].label).toBe('8 AM');
      expect(curve[8].phaseLabel).toBe('Morning commute + shallow cold trap');
      expect(curve[8].aqi).toBe(500);
      expect(curve[8].pm25).toBeGreaterThan(curve[14].pm25);
      expect(curve[20].pm25).toBeGreaterThan(curve[14].pm25);
      expect(curve[12].label).toBe('12 PM');
      expect(curve.filter((p) => p.ventilationSafe).map((p) => p.hour)).toEqual([13, 14, 15]);
      expect(curve[14].label).toBe('2 PM');
      expect(curve[14].phaseLabel).toBe('Peak solar mixing · Best ventilation window');
      expect(curve[20].phaseLabel).toBe('Evening heating + nocturnal inversion');
      expect(curve[23].label).toBe('11 PM');
    });
  });

  describe('calculateImpactSummary', () => {
    it('returns baseline infiltration values when no actions are adopted and reduces on adoption', () => {
      expect(getBaselineInfiltrationFactor('Modern sealed apartment')).toBe(0.52);
      expect(getBaselineInfiltrationFactor('Historic brick tenement flat')).toBe(0.68);
      const summary = calculateImpactSummary(SAMPLE_ACTIONS, [], BASE_PROFILE);

      expect(summary.adoptedCount).toBe(0);
      expect(summary.totalCount).toBe(4);
      expect(summary.exposureReductionPct).toBe(0);
      expect(summary.weeklyCo2eAvoidedKg).toBe(0);
      expect(summary.weeklyPm25AvoidedGrams).toBe(0);
      expect(summary.estimatedIndoorPm25).toBe(Number((summary.outdoorPm25 * 0.68).toFixed(1)));

      const preset = REGIONAL_PRESETS[0];
      const partial = calculateImpactSummary(
        preset.actions,
        preset.defaultAdoptedIds,
        preset.profile,
      );
      expect(partial.adoptedCount).toBe(preset.defaultAdoptedIds.length);
      expect(partial.exposureReductionPct).toBeGreaterThan(0);
      expect(partial.exposureReductionPct).toBeLessThanOrEqual(82);
    });

    it('applies lower infiltration for modern housing, enforces 4.0 floor, and caps reduction at 82%', () => {
      const modernLowAqi = createTestProfile({ aqi: 20, housingType: 'Modern sealed apartment' });
      const heavyStack: AirAction[] = Array.from({ length: 8 }, (_, idx) =>
        createTestAction({
          id: `heavy-${idx}`,
          exposureReductionPct: 80,
          weeklyCo2eAvoidedKg: 1.15,
          weeklyPm25AvoidedGrams: 2.05,
        }),
      );

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

      expect(filterActions(SAMPLE_ACTIONS, 'routine', 'all', adopted, '').map((a) => a.id)).toEqual(
        ['routine-1', 'routine-2'],
      );
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
      expect(
        filterActions(SAMPLE_ACTIONS, 'community', 'all', adopted, 'zzzz-nonexistent'),
      ).toHaveLength(0);
    });
  });

  describe('validateProfileInput', () => {
    it('validates empty/short cities and invalid or out-of-range AQI values', () => {
      expect(validateProfileInput({ ...BASE_PROFILE, city: '   ', aqi: 100 }).city).toBeTruthy();
      expect(validateProfileInput({ ...BASE_PROFILE, city: 'A', aqi: 100 }).city).toBeTruthy();
      expect(validateProfileInput({ ...BASE_PROFILE, aqi: Number.NaN }).aqi).toBeTruthy();
      expect(validateProfileInput({ ...BASE_PROFILE, aqi: 0 }).aqi).toBeTruthy();
      expect(validateProfileInput({ ...BASE_PROFILE, aqi: 501 }).aqi).toBeTruthy();
      expect(validateProfileInput({ ...BASE_PROFILE, city: 'Boise', aqi: 1 })).toEqual({});
      expect(validateProfileInput({ ...BASE_PROFILE, city: 'Boise', aqi: 500 })).toEqual({});
    });
  });

  describe('buildLongTermExposureProjection', () => {
    it('clamps week bounds, scales seasonal savings with Week 1 ramp-up, and handles 0% baseline parity', () => {
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
      const w1 = maxProjection.points[0];
      const w1Ratio =
        (w1.baselineCumulativeMg - w1.projectedCumulativeMg) / w1.baselineCumulativeMg;

      expect(maxProjection.points).toHaveLength(24);
      expect(w1Ratio).toBeLessThan(activeImpact.exposureReductionPct / 100);
      expect(maxProjection.points[0].weekLabel).toBe('W1');
      expect(maxProjection.points[23].weekLabel).toBe('W24');
      expect(maxProjection.seasonalCo2eAvoidedKg).toBe(240);
      expect(maxProjection.seasonalPm25PreventedGrams).toBe(300);
      expect(maxProjection.totalAvoidedMg).toBeGreaterThan(0);
    });
  });
});
