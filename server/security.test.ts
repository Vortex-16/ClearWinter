import { describe, expect, it } from 'vitest';
import {
  createRateLimiter,
  sanitizeAqiReportBody,
  sanitizeAskBody,
  sanitizeProfileBody,
  stripControlChars,
} from './security';

describe('server/security sanitization and rate limiting', () => {
  it('stripControlChars removes control bytes and collapses whitespace', () => {
    const dirty = 'Delhi\u0000\u0007 NCR\n\t  India\u001f';
    expect(stripControlChars(dirty)).toBe('Delhi NCR India');
  });

  it('sanitizeProfileBody validates bounds and sanitizes string fields', () => {
    expect(sanitizeProfileBody({ city: 'X', aqi: 200 }).ok).toBe(false);
    expect(sanitizeProfileBody({ city: 'Lahore', aqi: 650 }).ok).toBe(false);

    const longCity = 'A'.repeat(160);
    const valid = sanitizeProfileBody({
      city: `${longCity}\n`,
      aqi: 245.6,
      householdType: 'Family\twith kids',
      priorities: Array.from({ length: 12 }, (_, idx) => `Priority ${idx}`),
    });

    expect(valid.ok).toBe(true);
    if (valid.ok) {
      expect(valid.value.city).toHaveLength(100);
      expect(valid.value.aqi).toBe(246);
      expect(valid.value.householdType).toBe('Family with kids');
      expect(valid.value.priorities).toHaveLength(8);
    }
  });

  it('sanitizeAskBody rejects empty or oversized questions and bounds history', () => {
    expect(sanitizeAskBody({ question: '   \n ' }).ok).toBe(false);
    expect(sanitizeAskBody({ question: 'q'.repeat(1001) }).ok).toBe(false);

    const valid = sanitizeAskBody({
      question: 'When should we ventilate?\u0000',
      profile: { city: 'Krakow', aqi: 999 },
      adoptedTitles: Array.from({ length: 20 }, (_, i) => `Habit ${i}`),
      history: Array.from({ length: 10 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
      })),
    });

    expect(valid.ok).toBe(true);
    if (valid.ok) {
      expect(valid.value.question).toBe('When should we ventilate?');
      expect(valid.value.profile.aqi).toBe(200);
      expect(valid.value.adoptedTitles).toHaveLength(15);
      expect(valid.value.history).toHaveLength(6);
    }
  });

  it('sanitizeAqiReportBody validates city, AQI, PM2.5, and source enum', () => {
    expect(sanitizeAqiReportBody({ city: '', aqi: 180 }).ok).toBe(false);
    expect(sanitizeAqiReportBody({ city: 'Milan', aqi: 0 }).ok).toBe(false);
    expect(sanitizeAqiReportBody({ city: 'Milan', aqi: 180, pm25: 1500 }).ok).toBe(false);

    const valid = sanitizeAqiReportBody({
      city: 'Milan, Italy',
      aqi: 182.4,
      pm25: 112.46,
      source: 'open-meteo',
    });
    expect(valid.ok).toBe(true);
    if (valid.ok) {
      expect(valid.value.aqi).toBe(182);
      expect(valid.value.pm25).toBe(112.5);
      expect(valid.value.source).toBe('open-meteo');
    }

    const coerced = sanitizeAqiReportBody({
      city: 'Milan',
      aqi: 190,
      source: 'arbitrary-source',
    });
    expect(coerced.ok).toBe(true);
    if (coerced.ok) {
      expect(coerced.value.source).toBe('station-feed');
    }
  });

  it('createRateLimiter enforces per-key quota, resets after window, and bounds key cache', () => {
    const check = createRateLimiter({ windowMs: 10_000, maxRequests: 2, maxKeys: 3 });

    const r1 = check('10.0.0.1', 1000);
    const r2 = check('10.0.0.1', 2000);
    const r3 = check('10.0.0.1', 3000);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(1);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(0);
    expect(r3.allowed).toBe(false);
    expect(r3.retryAfterSeconds).toBeGreaterThanOrEqual(8);

    const afterReset = check('10.0.0.1', 11_001);
    expect(afterReset.allowed).toBe(true);

    check('ip-a', 20_000);
    check('ip-b', 20_000);
    check('ip-c', 20_000);
    const fourth = check('ip-d', 20_000);
    expect(fourth.allowed).toBe(true);
  });
});
