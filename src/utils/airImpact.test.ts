import { describe, expect, it } from 'vitest';
import {
  buildHourlyInversionCurve,
  buildLongTermExposureProjection,
  calculateImpactSummary,
  classifyAqiBand,
  estimatePm25FromAqi,
  filterActions,
  validateProfileInput,
} from './airImpact';
import { REGIONAL_PRESETS } from '../data/presets';

describe('airImpact utility functions', () => {
  describe('classifyAqiBand', () => {
    it('maps every EPA AQI threshold and boundary transition accurately', () => {
      expect(classifyAqiBand(-10).severity).toBe('Good');
      expect(classifyAqiBand(50).severity).toBe('Good');
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
    });

    it('provides matching styling classes and non-empty advisories for each severity', () => {
      const severe = classifyAqiBand(312);
      expect(severe.textColorClass).toContain('text-red');
      expect(severe.surfaceClass).toContain('bg-red');
      expect(severe.advisory.length).toBeGreaterThan(20);
    });
  });

  describe('estimatePm25FromAqi', () => {
    it('calculates realistic EPA breakpoint concentrations and clamps out-of-range inputs', () => {
      expect(estimatePm25FromAqi(-5)).toBe(0);
      expect(estimatePm25FromAqi(0)).toBe(0);
      expect(estimatePm25FromAqi(50)).toBe(12);
      const severePm = estimatePm25FromAqi(312);
      expect(severePm).toBeGreaterThan(250);
      expect(severePm).toBeLessThan(275);
      expect(estimatePm25FromAqi(500)).toBe(500.4);
      expect(estimatePm25FromAqi(850)).toBe(500.4);
    });
  });

  describe('buildHourlyInversionCurve', () => {
    it('returns 24 hourly points with midday ventilation window and morning rush peak', () => {
      const curve = buildHourlyInversionCurve(280);
      expect(curve).toHaveLength(24);
      const safeHours = curve.filter((p) => p.ventilationSafe).map((p) => p.hour);
      expect(safeHours).toEqual([13, 14, 15]);
      expect(curve[8].pm25).toBeGreaterThan(curve[14].pm25);
      expect(curve[20].pm25).toBeGreaterThan(curve[14].pm25);
      expect(curve[0].label).toBe('12 AM');
      expect(curve[12].label).toBe('12 PM');
      expect(curve[14].phaseLabel).toContain('Best ventilation window');
    });

    it('caps estimated hourly AQI at 500 during extreme smog events', () => {
      const extremeCurve = buildHourlyInversionCurve(480);
      expect(extremeCurve.every((point) => point.aqi <= 500)).toBe(true);
    });
  });

  describe('calculateImpactSummary', () => {
    it('returns zero reduction and baseline indoor infiltration when nothing is adopted', () => {
      const preset = REGIONAL_PRESETS[0];
      const emptyImpact = calculateImpactSummary(preset.actions, [], preset.profile);
      expect(emptyImpact.adoptedCount).toBe(0);
      expect(emptyImpact.exposureReductionPct).toBe(0);
      expect(emptyImpact.weeklyCo2eAvoidedKg).toBe(0);
      expect(emptyImpact.weeklyPm25AvoidedGrams).toBe(0);
      expect(emptyImpact.estimatedIndoorPm25).toBeGreaterThan(0);
    });

    it('aggregates adopted actions and reduces indoor PM2.5 below baseline', () => {
      const preset = REGIONAL_PRESETS[0];
      const emptyImpact = calculateImpactSummary(preset.actions, [], preset.profile);
      const partialImpact = calculateImpactSummary(
        preset.actions,
        preset.defaultAdoptedIds,
        preset.profile,
      );
      expect(partialImpact.adoptedCount).toBe(preset.defaultAdoptedIds.length);
      expect(partialImpact.exposureReductionPct).toBeGreaterThan(0);
      expect(partialImpact.exposureReductionPct).toBeLessThanOrEqual(82);
      expect(partialImpact.estimatedIndoorPm25).toBeLessThan(emptyImpact.estimatedIndoorPm25);
      expect(partialImpact.weeklyCo2eAvoidedKg).toBeGreaterThan(0);
      expect(partialImpact.weeklyPm25AvoidedGrams).toBeGreaterThan(0);
    });

    it('enforces the 82% reduction cap and distinguishes modern vs older housing infiltration', () => {
      const baseProfile = REGIONAL_PRESETS[0].profile;
      const heavyActions = Array.from({ length: 12 }, (_, idx) => ({
        ...REGIONAL_PRESETS[0].actions[0],
        id: `heavy-${idx}`,
        exposureReductionPct: 45,
      }));

      const older = calculateImpactSummary(
        heavyActions,
        heavyActions.map((a) => a.id),
        { ...baseProfile, housingType: 'Older apartment with drafty windows' },
      );
      const modern = calculateImpactSummary(
        heavyActions,
        heavyActions.map((a) => a.id),
        { ...baseProfile, housingType: 'Modern sealed apartment' },
      );

      expect(older.exposureReductionPct).toBe(82);
      expect(modern.exposureReductionPct).toBe(82);
      expect(modern.estimatedIndoorPm25).toBeLessThanOrEqual(older.estimatedIndoorPm25);
    });
  });

  describe('buildLongTermExposureProjection', () => {
    it('projects 12-week cumulative dose savings with Week 1 ramp-up and week bounds', () => {
      const preset = REGIONAL_PRESETS[0];
      const zeroImpact = calculateImpactSummary(preset.actions, [], preset.profile);
      const zeroProj = buildLongTermExposureProjection(zeroImpact, preset.profile);
      expect(zeroProj.points).toHaveLength(12);
      expect(zeroProj.totalAvoidedMg).toBe(0);
      expect(zeroProj.totalProjectedMg).toBe(zeroProj.totalBaselineMg);

      const activeImpact = calculateImpactSummary(
        preset.actions,
        preset.defaultAdoptedIds,
        preset.profile,
      );
      const activeProj = buildLongTermExposureProjection(activeImpact, preset.profile);
      expect(activeProj.points).toHaveLength(12);
      expect(activeProj.totalAvoidedMg).toBeGreaterThan(0);
      expect(activeProj.totalProjectedMg).toBeLessThan(activeProj.totalBaselineMg);
      expect(activeProj.seasonalCo2eAvoidedKg).toBeGreaterThan(activeImpact.weeklyCo2eAvoidedKg * 10);

      const w1 = activeProj.points[0];
      const w1Ratio = (w1.baselineCumulativeMg - w1.projectedCumulativeMg) / w1.baselineCumulativeMg;
      expect(w1Ratio).toBeLessThan(activeImpact.exposureReductionPct / 100);

      expect(buildLongTermExposureProjection(activeImpact, preset.profile, 1).points).toHaveLength(4);
      expect(buildLongTermExposureProjection(activeImpact, preset.profile, 40).points).toHaveLength(24);
    });
  });

  describe('filterActions', () => {
    it('filters by category, adoption status, and search query', () => {
      const preset = REGIONAL_PRESETS[0];
      const indoorAll = filterActions(preset.actions, 'indoor', 'all', preset.defaultAdoptedIds, '');
      expect(indoorAll.every((item) => item.category === 'indoor')).toBe(true);

      const indoorAdopted = filterActions(
        preset.actions,
        'indoor',
        'adopted',
        preset.defaultAdoptedIds,
        '',
      );
      expect(indoorAdopted).toHaveLength(1);
      expect(indoorAdopted[0].id).toBe('i-1');

      const pendingRoutine = filterActions(
        preset.actions,
        'routine',
        'pending',
        preset.defaultAdoptedIds,
        '',
      );
      expect(pendingRoutine.every((item) => !preset.defaultAdoptedIds.includes(item.id))).toBe(true);

      const queryMatch = filterActions(
        preset.actions,
        'indoor',
        'all',
        preset.defaultAdoptedIds,
        'INCENSE',
      );
      expect(queryMatch).toHaveLength(1);
      expect(queryMatch[0].id).toBe('i-3');

      const noMatch = filterActions(
        preset.actions,
        'community',
        'all',
        preset.defaultAdoptedIds,
        'zzzz-nonexistent',
      );
      expect(noMatch).toHaveLength(0);
    });
  });

  describe('validateProfileInput', () => {
    it('flags empty/short cities and out-of-range AQI values while accepting valid profiles', () => {
      const preset = REGIONAL_PRESETS[0];
      const invalid = validateProfileInput({ ...preset.profile, city: '   ', aqi: 700 });
      expect(invalid.city).toBeTruthy();
      expect(invalid.aqi).toBeTruthy();

      const shortCity = validateProfileInput({ ...preset.profile, city: 'A', aqi: 0 });
      expect(shortCity.city).toBeTruthy();
      expect(shortCity.aqi).toBeTruthy();

      const nanAqi = validateProfileInput({ ...preset.profile, aqi: Number.NaN });
      expect(nanAqi.aqi).toBeTruthy();

      expect(validateProfileInput(preset.profile)).toEqual({});
    });
  });
});
