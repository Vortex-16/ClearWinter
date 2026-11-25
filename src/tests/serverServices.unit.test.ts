import { describe, expect, it, vi } from 'vitest';
import {
  citiesOverlap,
  createAqiFeedHub,
  fetchLiveOpenMeteoAqi,
  MAX_CACHED_CITIES,
  normalizeCityKey,
} from '../../server/aqiFeedService';
import {
  answerAirQuestion,
  createGeminiClient,
  formatGeminiError,
  generateTailoredPlan,
  sanitizeGeneratedActions,
  withRetry,
} from '../../server/geminiService';

describe('server/geminiService and server/aqiFeedService unit tests', () => {
  describe('geminiService', () => {
    it('throws helpful config error when GEMINI_API_KEY is missing or placeholder', () => {
      expect(() => createGeminiClient('')).toThrow(/GEMINI_API_KEY is not configured/i);
      expect(() => createGeminiClient('MY_GEMINI_API_KEY')).toThrow(
        /GEMINI_API_KEY is not configured/i,
      );
    });

    it('formats Gemini errors safely without leaking raw upstream error details on 502', () => {
      expect(formatGeminiError(new Error('GEMINI_API_KEY is not configured'))).toEqual({
        status: 500,
        message: 'GEMINI_API_KEY is not configured',
      });
      expect(formatGeminiError(new Error('403 PERMISSION_DENIED secret'))).toMatchObject({
        status: 403,
      });
      expect(formatGeminiError(new Error('429 RESOURCE_EXHAUSTED'))).toMatchObject({
        status: 429,
      });
      const internal = formatGeminiError(new Error('ECONNREFUSED 10.0.0.14:443 internal-host'));
      expect(internal.status).toBe(502);
      expect(internal.message).not.toContain('10.0.0.14');
      expect(internal.message).toBe(
        'Unable to reach the Gemini service right now. Please try again in a moment.',
      );
    });

    it('retries transient 503 errors and stops immediately on non-retryable 400 errors', async () => {
      const transientFn = vi
        .fn<() => Promise<string>>()
        .mockRejectedValueOnce(new Error('503 UNAVAILABLE'))
        .mockResolvedValueOnce('recovered');

      await expect(withRetry(transientFn, 2, 1)).resolves.toBe('recovered');
      expect(transientFn).toHaveBeenCalledTimes(2);

      const fatalFn = vi
        .fn<() => Promise<string>>()
        .mockRejectedValue(new Error('400 Bad Request'));
      await expect(withRetry(fatalFn, 2, 1)).rejects.toThrow('400 Bad Request');
      expect(fatalFn).toHaveBeenCalledTimes(1);
    });

    it('sanitizes generated actions and invokes Gemini client cleanly for plans and Q&A', async () => {
      const sanitized = sanitizeGeneratedActions([
        {
          id: '',
          category: 'invalid-category',
          costTier: 'invalid-tier',
          title: 'Test action',
          steps: 'Do this',
          exposureReductionPct: 99,
          weeklyCo2eAvoidedKg: -5,
          weeklyPm25AvoidedGrams: 0,
        },
      ]);
      expect(sanitized[0]).toMatchObject({
        id: 'ai-1',
        category: 'routine',
        costTier: 'Low cost',
        exposureReductionPct: 45,
        weeklyCo2eAvoidedKg: 0.1,
        weeklyPm25AvoidedGrams: 2,
      });

      const generateContent = vi.fn().mockResolvedValue({
        text: JSON.stringify({
          bestVentilationWindow: '2:00 PM - 3:00 PM',
          impactNarrative: 'Solar mixing lowers afternoon particulates.',
          actions: [
            {
              id: 'r-1',
              category: 'routine',
              title: 'Walk at 2 PM',
              contextLabel: 'Daily',
              costTier: 'Zero cost',
              steps: 'Walk after solar mixing.',
              personalImpactSummary: '-25% dose',
              communityImpactSummary: 'No idling',
              whyItWorks: 'Dispersion reduces ground soot.',
              exposureReductionPct: 25,
              weeklyCo2eAvoidedKg: 2.4,
              weeklyPm25AvoidedGrams: 3.2,
            },
          ],
        }),
      });
      const fakeClient = { models: { generateContent } } as unknown as ReturnType<
        typeof createGeminiClient
      >;

      const plan = await generateTailoredPlan(
        {
          city: 'Delhi NCR',
          aqi: 312,
          householdType: 'Family',
          heatingSource: 'Electric',
          commuteMode: 'Metro',
          housingType: 'Older apartment',
          priorities: ['Protect elders'],
        },
        () => fakeClient,
      );
      expect(plan.bestVentilationWindow).toBe('2:00 PM - 3:00 PM');
      expect(plan.actions).toHaveLength(1);
      expect(generateContent.mock.calls[0][0].contents).toContain('<household_profile>');

      generateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          answer: 'Use MERV-13 filter box.',
          personalTakeaway: 'Cuts indoor PM2.5.',
          communityTakeaway: 'Low electricity draw.',
        }),
      });
      const reply = await answerAirQuestion(
        {
          question: 'How to filter bedroom?',
          profile: {
            city: 'Delhi NCR',
            aqi: 312,
            householdType: 'Family',
            heatingSource: 'Electric',
            commuteMode: 'Metro',
            housingType: 'Older apartment',
          },
          adoptedTitles: [],
          history: [{ role: 'user', content: 'Previous question' }],
        },
        () => fakeClient,
      );
      expect(reply.answer).toBe('Use MERV-13 filter box.');
      expect(generateContent.mock.calls[1][0].contents).toContain('<user_question>');
    });
  });

  describe('aqiFeedService', () => {
    it('normalizes city keys, matches overlapping names, bounds cache size, and broadcasts to matching SSE subscribers', () => {
      expect(normalizeCityKey('  New  Delhi , India ')).toBe('new delhi');
      expect(citiesOverlap('Delhi NCR, India', 'delhi')).toBe(true);
      expect(citiesOverlap('Delhi', 'Krakow')).toBe(false);

      const hub = createAqiFeedHub();
      for (let i = 0; i < MAX_CACHED_CITIES + 5; i++) {
        hub.cacheReading({
          city: `City ${i}`,
          aqi: 120,
          source: 'station-feed',
          timestamp: '2026-11-19T10:00:00.000Z',
        });
      }
      expect(hub.latestReadings.size).toBe(MAX_CACHED_CITIES);

      const delhiRes = { write: vi.fn() };
      const krakowRes = { write: vi.fn() };
      hub.subscribers.add({ res: delhiRes as never, city: 'Delhi NCR, India' });
      hub.subscribers.add({ res: krakowRes as never, city: 'Krakow, Poland' });

      hub.broadcastReading({
        city: 'Delhi NCR',
        aqi: 340,
        pm25: 290.1,
        source: 'station-feed',
        timestamp: '2026-11-19T12:00:00.000Z',
      });

      expect(delhiRes.write).toHaveBeenCalledTimes(1);
      expect(krakowRes.write).not.toHaveBeenCalled();
      expect(hub.getCachedReading('delhi ncr, india')?.aqi).toBe(340);
    });

    it('fetchLiveOpenMeteoAqi handles valid responses, missing results, and network errors cleanly', async () => {
      const mockFetch = vi.fn<typeof fetch>().mockImplementation(async (input) => {
        const url = String(input);
        if (url.includes('geocoding-api')) {
          return new Response(
            JSON.stringify({ results: [{ latitude: 50.06, longitude: 19.94 }] }),
            {
              status: 200,
            },
          );
        }
        return new Response(JSON.stringify({ current: { us_aqi: 194.2, pm2_5: 138.44 } }), {
          status: 200,
        });
      });

      const ok = await fetchLiveOpenMeteoAqi('Krakow, Poland', mockFetch);
      expect(ok).toMatchObject({
        city: 'Krakow, Poland',
        aqi: 194,
        pm25: 138.4,
        source: 'open-meteo',
      });

      const failingFetch = vi.fn<typeof fetch>().mockRejectedValue(new Error('timeout'));
      expect(await fetchLiveOpenMeteoAqi('Krakow', failingFetch)).toBeNull();
      expect(await fetchLiveOpenMeteoAqi('   ', mockFetch)).toBeNull();
    });
  });
});
