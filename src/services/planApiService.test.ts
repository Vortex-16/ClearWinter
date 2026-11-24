import { describe, expect, it, vi } from 'vitest';
import { requestAssistantAnswer, requestTailoredPlan } from './planApiService';
import type { HouseholdProfile } from '../types/air';

const SAMPLE_PROFILE: HouseholdProfile = {
  city: 'Delhi NCR, India',
  aqi: 312,
  householdType: 'Family with young children & elders',
  heatingSource: 'Portable electric room heaters',
  commuteMode: 'Metro + short car school drop-off',
  housingType: 'Older apartment with drafty windows',
  priorities: ['Protect children & elders'],
};

describe('planApiService', () => {
  it('requestTailoredPlan returns sanitized plan payload on valid JSON response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          actions: [
            {
              id: 'act-1',
              category: 'routine',
              title: 'Afternoon errands',
              contextLabel: 'Daily',
              costTier: 'Zero cost',
              steps: 'Walk at 2 PM.',
              personalImpactSummary: '-30% dose',
              communityImpactSummary: 'No idling',
              whyItWorks: 'Solar mixing lowers smog.',
              exposureReductionPct: 30,
              weeklyCo2eAvoidedKg: 2.0,
              weeklyPm25AvoidedGrams: 3.1,
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    const plan = await requestTailoredPlan(SAMPLE_PROFILE);
    expect(plan.actions).toHaveLength(1);
    expect(plan.bestVentilationWindow).toContain('1:30 PM');
    expect(plan.impactNarrative).toContain('Delhi NCR, India');
  });

  it('requestTailoredPlan throws descriptive errors for static HTML, HTTP errors, and empty actions', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('<!doctype html>', { status: 404, headers: { 'content-type': 'text/html' } }),
    );
    await expect(requestTailoredPlan(SAMPLE_PROFILE)).rejects.toThrow(
      /Live Gemini AI backend is unavailable on static hosting/i,
    );

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Rate limit reached.' }), {
        status: 429,
        headers: { 'content-type': 'application/json' },
      }),
    );
    await expect(requestTailoredPlan(SAMPLE_PROFILE)).rejects.toThrow('Rate limit reached.');

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ actions: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    await expect(requestTailoredPlan(SAMPLE_PROFILE)).rejects.toThrow(
      /Assistant returned an empty action list/i,
    );
  });

  it('requestAssistantAnswer returns parsed guidance and throws on static HTML or backend error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          answer: 'Run HEPA filter continuously.',
          personalTakeaway: 'Protects sleeping lungs.',
          communityTakeaway: 'Zero indoor combustion.',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    const ok = await requestAssistantAnswer({
      question: 'Best filter speed?',
      profile: SAMPLE_PROFILE,
      adoptedTitles: ['Bedroom sanctuary'],
      history: [],
    });
    expect(ok.answer).toBe('Run HEPA filter continuously.');
    expect(ok.personalTakeaway).toBe('Protects sleeping lungs.');

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('<html>404</html>', { status: 404, headers: { 'content-type': 'text/html' } }),
    );
    await expect(
      requestAssistantAnswer({
        question: 'Best filter speed?',
        profile: SAMPLE_PROFILE,
        adoptedTitles: [],
        history: [],
      }),
    ).rejects.toThrow(/Live Gemini AI backend is unavailable on static hosting/i);
  });
});
