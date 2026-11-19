import test from 'node:test';
import assert from 'node:assert/strict';
import {
  citiesMatch,
  evaluateAqiWorsening,
  loadSavedBaseline,
  persistSavedBaseline,
  type StorageLike,
} from './aqiAlertRules';
import type { SavedLocationBaseline } from '../types/air';

test('citiesMatch normalizes region suffixes and casing', () => {
  assert.equal(citiesMatch('Delhi NCR, India', 'delhi ncr'), true);
  assert.equal(citiesMatch('Salt Lake City, Utah', 'Salt Lake City'), true);
  assert.equal(citiesMatch('Kraków, Poland', 'Lahore, Pakistan'), false);
});

test('evaluateAqiWorsening triggers when severity tier escalates even on small AQI bump', () => {
  const baseline: SavedLocationBaseline = {
    city: 'Salt Lake City, Utah',
    baselineAqi: 196, // Unhealthy
    savedAt: '2026-11-19T10:00:00.000Z',
  };

  const alert = evaluateAqiWorsening({
    baseline,
    reading: {
      city: 'Salt Lake City',
      aqi: 204, // Very Unhealthy (+8 AQI, crosses tier)
      source: 'station-feed',
      timestamp: '2026-11-19T11:00:00.000Z',
    },
    lastAlertedAqi: null,
  });

  assert.ok(alert);
  assert.equal(alert.baselineSeverity, 'Unhealthy');
  assert.equal(alert.currentSeverity, 'Very Unhealthy');
  assert.equal(alert.delta, 8);
});

test('evaluateAqiWorsening triggers on >=15 point spike within same severe tier', () => {
  const baseline: SavedLocationBaseline = {
    city: 'Delhi NCR, India',
    baselineAqi: 312, // Hazardous
    savedAt: '2026-11-19T10:00:00.000Z',
  };

  const minorJitter = evaluateAqiWorsening({
    baseline,
    reading: {
      city: 'Delhi NCR, India',
      aqi: 320, // +8 within Hazardous
      source: 'open-meteo',
      timestamp: '2026-11-19T11:00:00.000Z',
    },
    lastAlertedAqi: null,
  });
  assert.equal(minorJitter, null);

  const majorSpike = evaluateAqiWorsening({
    baseline,
    reading: {
      city: 'Delhi NCR, India',
      aqi: 350, // +38 spike
      source: 'station-feed',
      timestamp: '2026-11-19T11:05:00.000Z',
    },
    lastAlertedAqi: null,
  });
  assert.ok(majorSpike);
  assert.equal(majorSpike.delta, 38);
});

test('evaluateAqiWorsening deduplicates repeat or lower readings after alerting', () => {
  const baseline: SavedLocationBaseline = {
    city: 'Lahore, Pakistan',
    baselineAqi: 285,
    savedAt: '2026-11-19T10:00:00.000Z',
  };

  const duplicate = evaluateAqiWorsening({
    baseline,
    reading: {
      city: 'Lahore',
      aqi: 330,
      source: 'station-feed',
      timestamp: '2026-11-19T11:10:00.000Z',
    },
    lastAlertedAqi: 335,
  });
  assert.equal(duplicate, null);

  const furtherEscalation = evaluateAqiWorsening({
    baseline,
    reading: {
      city: 'Lahore',
      aqi: 365,
      source: 'station-feed',
      timestamp: '2026-11-19T11:15:00.000Z',
    },
    lastAlertedAqi: 335,
  });
  assert.ok(furtherEscalation);
  assert.equal(furtherEscalation.currentAqi, 365);
});

test('evaluateAqiWorsening ignores readings from unrelated cities', () => {
  const baseline: SavedLocationBaseline = {
    city: 'Kraków, Poland',
    baselineAqi: 194,
    savedAt: '2026-11-19T10:00:00.000Z',
  };

  const alert = evaluateAqiWorsening({
    baseline,
    reading: {
      city: 'Delhi NCR, India',
      aqi: 410,
      source: 'station-feed',
      timestamp: '2026-11-19T11:00:00.000Z',
    },
    lastAlertedAqi: null,
  });
  assert.equal(alert, null);
});

test('loadSavedBaseline and persistSavedBaseline round-trip safely', () => {
  const store = new Map<string, string>();
  const mockStorage: StorageLike = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, val) => {
      store.set(key, val);
    },
  };

  const fallback: SavedLocationBaseline = {
    city: 'Delhi NCR, India',
    baselineAqi: 312,
    savedAt: '2026-11-19T10:00:00.000Z',
  };

  assert.deepEqual(loadSavedBaseline(mockStorage, fallback), fallback);

  const updated: SavedLocationBaseline = {
    city: 'Salt Lake City, Utah',
    baselineAqi: 168,
    savedAt: '2026-11-19T12:00:00.000Z',
  };
  persistSavedBaseline(mockStorage, updated);
  assert.deepEqual(loadSavedBaseline(mockStorage, fallback), updated);
});
