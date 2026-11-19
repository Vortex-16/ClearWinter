import test from 'node:test';
import assert from 'node:assert/strict';
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

test('classifyAqiBand maps AQI thresholds to accurate severity bands', () => {
  assert.equal(classifyAqiBand(35).severity, 'Good');
  assert.equal(classifyAqiBand(85).severity, 'Moderate');
  assert.equal(classifyAqiBand(132).severity, 'Sensitive');
  assert.equal(classifyAqiBand(175).severity, 'Unhealthy');
  assert.equal(classifyAqiBand(285).severity, 'Very Unhealthy');
  assert.equal(classifyAqiBand(410).severity, 'Hazardous');
});

test('estimatePm25FromAqi calculates realistic EPA concentration values', () => {
  assert.equal(estimatePm25FromAqi(0), 0);
  assert.equal(estimatePm25FromAqi(50), 12);
  const severePm = estimatePm25FromAqi(312);
  assert.ok(severePm > 250 && severePm < 275);
});

test('buildHourlyInversionCurve returns 24 hours with safe midday ventilation window', () => {
  const curve = buildHourlyInversionCurve(280);
  assert.equal(curve.length, 24);
  const safeHours = curve.filter((point) => point.ventilationSafe).map((point) => point.hour);
  assert.deepEqual(safeHours, [13, 14, 15]);
  assert.ok(curve[8].pm25 > curve[14].pm25, 'Morning peak should exceed midday mixing dip');
});

test('calculateImpactSummary aggregates adopted actions and reduces indoor PM2.5', () => {
  const preset = REGIONAL_PRESETS[0];
  const emptyImpact = calculateImpactSummary(preset.actions, [], preset.profile);
  assert.equal(emptyImpact.adoptedCount, 0);
  assert.equal(emptyImpact.exposureReductionPct, 0);
  assert.equal(emptyImpact.weeklyCo2eAvoidedKg, 0);

  const partialImpact = calculateImpactSummary(
    preset.actions,
    preset.defaultAdoptedIds,
    preset.profile,
  );
  assert.equal(partialImpact.adoptedCount, preset.defaultAdoptedIds.length);
  assert.ok(partialImpact.exposureReductionPct > 0 && partialImpact.exposureReductionPct <= 82);
  assert.ok(partialImpact.estimatedIndoorPm25 < emptyImpact.estimatedIndoorPm25);
  assert.ok(partialImpact.weeklyCo2eAvoidedKg > 0);
  assert.ok(partialImpact.weeklyPm25AvoidedGrams > 0);
});

test('buildLongTermExposureProjection projects 12-week cumulative dose savings based on adopted habits', () => {
  const preset = REGIONAL_PRESETS[0];
  const zeroImpact = calculateImpactSummary(preset.actions, [], preset.profile);
  const zeroProj = buildLongTermExposureProjection(zeroImpact, preset.profile);
  assert.equal(zeroProj.points.length, 12);
  assert.equal(zeroProj.totalAvoidedMg, 0);
  assert.equal(zeroProj.totalProjectedMg, zeroProj.totalBaselineMg);

  const activeImpact = calculateImpactSummary(
    preset.actions,
    preset.defaultAdoptedIds,
    preset.profile,
  );
  const activeProj = buildLongTermExposureProjection(activeImpact, preset.profile);
  assert.equal(activeProj.points.length, 12);
  assert.ok(activeProj.totalAvoidedMg > 0);
  assert.ok(activeProj.totalProjectedMg < activeProj.totalBaselineMg);
  assert.ok(activeProj.seasonalCo2eAvoidedKg > activeImpact.weeklyCo2eAvoidedKg * 10);
});

test('filterActions filters by category, adoption status, and search query', () => {
  const preset = REGIONAL_PRESETS[0];
  const indoorAll = filterActions(preset.actions, 'indoor', 'all', preset.defaultAdoptedIds, '');
  assert.ok(indoorAll.every((item) => item.category === 'indoor'));

  const indoorAdopted = filterActions(
    preset.actions,
    'indoor',
    'adopted',
    preset.defaultAdoptedIds,
    '',
  );
  assert.equal(indoorAdopted.length, 1);
  assert.equal(indoorAdopted[0].id, 'i-1');

  const queryMatch = filterActions(preset.actions, 'indoor', 'all', preset.defaultAdoptedIds, 'incense');
  assert.equal(queryMatch.length, 1);
  assert.equal(queryMatch[0].id, 'i-3');
});

test('validateProfileInput catches empty city and out-of-range AQI', () => {
  const preset = REGIONAL_PRESETS[0];
  const invalid = validateProfileInput({ ...preset.profile, city: '   ', aqi: 700 });
  assert.ok(invalid.city);
  assert.ok(invalid.aqi);

  const valid = validateProfileInput(preset.profile);
  assert.deepEqual(valid, {});
});
