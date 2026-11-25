import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAqiBandStub, createTestBaseline } from '../test/factories';
import type { AqiClassification, AqiReadingEvent, SavedLocationBaseline } from '../types/air';

const { mockClassifyAqiBand, mockEstimatePm25FromAqi } = vi.hoisted(() => ({
  mockClassifyAqiBand: vi.fn<(aqi: number) => AqiClassification>(),
  mockEstimatePm25FromAqi: vi.fn<(aqi: number) => number>(),
}));

vi.mock('../utils/airImpact', () => ({
  classifyAqiBand: mockClassifyAqiBand,
  estimatePm25FromAqi: mockEstimatePm25FromAqi,
}));

import {
  BASELINE_STORAGE_KEY,
  citiesMatch,
  evaluateAqiWorsening,
  loadSavedBaseline,
  normalizeCityName,
  persistSavedBaseline,
  type StorageLike,
} from '../utils/aqiAlertRules';

const BASELINE = createTestBaseline({ baselineAqi: 180 });

describe('src/utils/aqiAlertRules unit tests (mocked airImpact)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClassifyAqiBand.mockImplementation((aqi) => createAqiBandStub(aqi));
    mockEstimatePm25FromAqi.mockImplementation((aqi) => Number((aqi * 0.9).toFixed(1)));
  });

  describe('normalizeCityName and citiesMatch', () => {
    it('strips regional comma suffixes, collapses whitespace, and matches case-insensitively', () => {
      expect(normalizeCityName('  New   Delhi , India ')).toBe('new delhi');
      expect(citiesMatch('Delhi NCR, India', 'delhi ncr')).toBe(true);
      expect(citiesMatch('Salt Lake City, Utah', 'Salt Lake City')).toBe(true);
      expect(citiesMatch('Kraków, Poland', 'Lahore, Pakistan')).toBe(false);
      expect(citiesMatch('', 'Delhi')).toBe(false);
    });
  });

  describe('evaluateAqiWorsening', () => {
    it('returns null on city mismatch, invalid AQI, non-positive delta, or sub-threshold drift', () => {
      const mismatch: AqiReadingEvent = {
        city: 'Lahore, Pakistan',
        aqi: 310,
        source: 'station-feed',
        timestamp: '2026-11-19T09:00:00.000Z',
      };
      expect(
        evaluateAqiWorsening({ baseline: BASELINE, reading: mismatch, lastAlertedAqi: null }),
      ).toBeNull();
      expect(
        evaluateAqiWorsening({
          baseline: BASELINE,
          reading: { ...mismatch, city: 'Delhi NCR', aqi: 0 },
          lastAlertedAqi: null,
        }),
      ).toBeNull();
      expect(
        evaluateAqiWorsening({
          baseline: BASELINE,
          reading: { ...mismatch, city: 'Delhi NCR', aqi: 501 },
          lastAlertedAqi: null,
        }),
      ).toBeNull();
      expect(
        evaluateAqiWorsening({
          baseline: BASELINE,
          reading: { ...mismatch, city: 'Delhi NCR', aqi: 175 },
          lastAlertedAqi: null,
        }),
      ).toBeNull();
      expect(
        evaluateAqiWorsening({
          baseline: BASELINE,
          reading: { ...mismatch, city: 'Delhi NCR', aqi: 188 },
          lastAlertedAqi: null,
        }),
      ).toBeNull();
    });

    it('creates escalation alert when severity worsens even with delta < 15 and derives fallback PM2.5', () => {
      const baseline195 = createTestBaseline({ baselineAqi: 195 });
      const reading: AqiReadingEvent = {
        city: 'Delhi NCR',
        aqi: 204,
        source: 'open-meteo',
        timestamp: '2026-11-19T10:00:00.000Z',
      };

      const toast = evaluateAqiWorsening({
        baseline: baseline195,
        reading,
        lastAlertedAqi: null,
      });

      expect(toast).not.toBeNull();
      expect(toast?.baselineSeverity).toBe('Unhealthy');
      expect(toast?.currentSeverity).toBe('Very Unhealthy');
      expect(toast?.delta).toBe(9);
      expect(toast?.pm25).toBe(183.6);
      expect(mockEstimatePm25FromAqi).toHaveBeenCalledWith(204);
      expect(toast?.reason).toContain('Status escalated from Unhealthy to Very Unhealthy');
    });

    it('triggers same-band alert when delta >= 15 and respects idempotency against lastAlertedAqi', () => {
      const hazardousBaseline = createTestBaseline({ baselineAqi: 312 });
      const spikeReading: AqiReadingEvent = {
        city: 'Delhi NCR',
        aqi: 340,
        pm25: 290.5,
        source: 'station-feed',
        timestamp: '2026-11-19T11:00:00.000Z',
      };

      const first = evaluateAqiWorsening({
        baseline: hazardousBaseline,
        reading: spikeReading,
        lastAlertedAqi: null,
      });
      expect(first?.pm25).toBe(290.5);
      expect(mockEstimatePm25FromAqi).not.toHaveBeenCalled();
      expect(first?.reason).toContain('Local AQI climbed +28 points');

      const suppressed = evaluateAqiWorsening({
        baseline: hazardousBaseline,
        reading: { ...spikeReading, aqi: 335 },
        lastAlertedAqi: 340,
      });
      expect(suppressed).toBeNull();
    });
  });

  describe('loadSavedBaseline and persistSavedBaseline', () => {
    it('loads valid baselines, handles corrupt/invalid records, and swallows storage errors', () => {
      const store = new Map<string, string>();
      const memoryStorage: StorageLike = {
        getItem: (key) => store.get(key) ?? null,
        setItem: (key, value) => {
          store.set(key, value);
        },
      };

      expect(loadSavedBaseline(null, BASELINE)).toEqual(BASELINE);
      expect(loadSavedBaseline(memoryStorage, BASELINE)).toEqual(BASELINE);

      store.set(BASELINE_STORAGE_KEY, '{broken-json');
      expect(loadSavedBaseline(memoryStorage, BASELINE)).toEqual(BASELINE);

      store.set(BASELINE_STORAGE_KEY, JSON.stringify({ city: 'X', baselineAqi: 200 }));
      expect(loadSavedBaseline(memoryStorage, BASELINE)).toEqual(BASELINE);

      store.set(BASELINE_STORAGE_KEY, JSON.stringify({ city: 'Lahore', baselineAqi: 999 }));
      expect(loadSavedBaseline(memoryStorage, BASELINE)).toEqual(BASELINE);

      const updated: SavedLocationBaseline = {
        city: 'Salt Lake City, Utah',
        baselineAqi: 168.4,
        savedAt: '2026-11-19T12:00:00.000Z',
      };
      persistSavedBaseline(memoryStorage, updated);
      expect(loadSavedBaseline(memoryStorage, BASELINE)).toEqual({
        city: 'Salt Lake City, Utah',
        baselineAqi: 168,
        savedAt: '2026-11-19T12:00:00.000Z',
      });

      const brokenStorage: StorageLike = {
        getItem: () => null,
        setItem: () => {
          throw new Error('QuotaExceededError');
        },
      };
      expect(() => persistSavedBaseline(null, updated)).not.toThrow();
      expect(() => persistSavedBaseline(brokenStorage, updated)).not.toThrow();
    });
  });
});
