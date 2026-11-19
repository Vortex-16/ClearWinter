import { describe, expect, it } from 'vitest';
import {
  citiesMatch,
  evaluateAqiWorsening,
  loadSavedBaseline,
  normalizeCityName,
  persistSavedBaseline,
  type StorageLike,
} from './aqiAlertRules';
import type { SavedLocationBaseline } from '../types/air';

describe('aqiAlertRules utility functions', () => {
  it('normalizes city names and matches regional suffixes', () => {
    expect(normalizeCityName('  Delhi NCR, India ')).toBe('delhi ncr');
    expect(citiesMatch('Delhi NCR, India', 'delhi ncr')).toBe(true);
    expect(citiesMatch('Salt Lake City, Utah', 'Salt Lake City')).toBe(true);
    expect(citiesMatch('Kraków, Poland', 'Lahore, Pakistan')).toBe(false);
    expect(citiesMatch('', 'Delhi')).toBe(false);
  });

  it('triggers an alert when severity tier escalates even on a small AQI bump', () => {
    const baseline: SavedLocationBaseline = {
      city: 'Salt Lake City, Utah',
      baselineAqi: 196,
      savedAt: '2026-11-19T10:00:00.000Z',
    };

    const alert = evaluateAqiWorsening({
      baseline,
      reading: {
        city: 'Salt Lake City',
        aqi: 204,
        source: 'station-feed',
        timestamp: '2026-11-19T11:00:00.000Z',
      },
      lastAlertedAqi: null,
    });

    expect(alert).not.toBeNull();
    expect(alert?.baselineSeverity).toBe('Unhealthy');
    expect(alert?.currentSeverity).toBe('Very Unhealthy');
    expect(alert?.delta).toBe(8);
  });

  it('triggers on >=15 point spike within same severe tier while ignoring minor jitter', () => {
    const baseline: SavedLocationBaseline = {
      city: 'Delhi NCR, India',
      baselineAqi: 312,
      savedAt: '2026-11-19T10:00:00.000Z',
    };

    const minorJitter = evaluateAqiWorsening({
      baseline,
      reading: {
        city: 'Delhi NCR, India',
        aqi: 320,
        source: 'open-meteo',
        timestamp: '2026-11-19T11:00:00.000Z',
      },
      lastAlertedAqi: null,
    });
    expect(minorJitter).toBeNull();

    const majorSpike = evaluateAqiWorsening({
      baseline,
      reading: {
        city: 'Delhi NCR, India',
        aqi: 350,
        source: 'station-feed',
        timestamp: '2026-11-19T11:05:00.000Z',
      },
      lastAlertedAqi: null,
    });
    expect(majorSpike).not.toBeNull();
    expect(majorSpike?.delta).toBe(38);
  });

  it('deduplicates repeat or lower readings after alerting and notifies on further escalation', () => {
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
    expect(duplicate).toBeNull();

    const escalation = evaluateAqiWorsening({
      baseline,
      reading: {
        city: 'Lahore',
        aqi: 365,
        source: 'station-feed',
        timestamp: '2026-11-19T11:15:00.000Z',
      },
      lastAlertedAqi: 335,
    });
    expect(escalation).not.toBeNull();
    expect(escalation?.currentAqi).toBe(365);
  });

  it('ignores unrelated cities, improved AQI, and out-of-range readings', () => {
    const baseline: SavedLocationBaseline = {
      city: 'Kraków, Poland',
      baselineAqi: 194,
      savedAt: '2026-11-19T10:00:00.000Z',
    };

    expect(
      evaluateAqiWorsening({
        baseline,
        reading: { city: 'Delhi NCR, India', aqi: 410, source: 'station-feed', timestamp: 't1' },
        lastAlertedAqi: null,
      }),
    ).toBeNull();

    expect(
      evaluateAqiWorsening({
        baseline,
        reading: { city: 'Kraków', aqi: 140, source: 'open-meteo', timestamp: 't2' },
        lastAlertedAqi: null,
      }),
    ).toBeNull();

    expect(
      evaluateAqiWorsening({
        baseline,
        reading: { city: 'Kraków', aqi: 0, source: 'open-meteo', timestamp: 't3' },
        lastAlertedAqi: null,
      }),
    ).toBeNull();

    expect(
      evaluateAqiWorsening({
        baseline,
        reading: { city: 'Kraków', aqi: 750, source: 'open-meteo', timestamp: 't4' },
        lastAlertedAqi: null,
      }),
    ).toBeNull();
  });

  it('round-trips saved baselines and recovers safely from corrupt JSON or storage errors', () => {
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

    expect(loadSavedBaseline(null, fallback)).toEqual(fallback);
    expect(loadSavedBaseline(mockStorage, fallback)).toEqual(fallback);

    const updated: SavedLocationBaseline = {
      city: 'Salt Lake City, Utah',
      baselineAqi: 168,
      savedAt: '2026-11-19T12:00:00.000Z',
    };
    persistSavedBaseline(mockStorage, updated);
    expect(loadSavedBaseline(mockStorage, fallback)).toEqual(updated);

    const corruptStorage: StorageLike = {
      getItem: () => '{bad-json',
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    expect(() => persistSavedBaseline(corruptStorage, updated)).not.toThrow();
    expect(loadSavedBaseline(corruptStorage, fallback)).toEqual(fallback);

    const invalidAqiStorage: StorageLike = {
      getItem: () => JSON.stringify({ city: 'Delhi NCR', baselineAqi: 900, savedAt: 'now' }),
      setItem: () => {},
    };
    expect(loadSavedBaseline(invalidAqiStorage, fallback)).toEqual(fallback);
  });
});
