import { Type, type Schema } from '@google/genai';

/** Structured response payload returned by POST /api/ask. */
export interface AskAssistantResponse {
  answer: string;
  personalTakeaway: string;
  communityTakeaway: string;
}

/** Strict JSON schema enforced for Gemini 10-action winter smog plan generation. */
export const PLAN_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    bestVentilationWindow: {
      type: Type.STRING,
      description:
        'Short recommended daytime window for brief cross-ventilation, e.g. "1:30 PM - 3:30 PM (peak solar mixing)".',
    },
    impactNarrative: {
      type: Type.STRING,
      description:
        '2-3 sentence summary explaining how winter inversion affects this city and the combined impact of the plan.',
    },
    actions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          category: {
            type: Type.STRING,
            description: 'Must be exactly one of: routine, indoor, community',
          },
          title: { type: Type.STRING },
          contextLabel: {
            type: Type.STRING,
            description:
              'Short timing or room context using middot separator, e.g. "Sleeping Zones · Nighttime"',
          },
          costTier: {
            type: Type.STRING,
            description: 'Must be one of: Zero cost, Low cost, Shared investment',
          },
          steps: { type: Type.STRING },
          personalImpactSummary: { type: Type.STRING },
          communityImpactSummary: { type: Type.STRING },
          whyItWorks: { type: Type.STRING },
          exposureReductionPct: { type: Type.INTEGER },
          weeklyCo2eAvoidedKg: { type: Type.NUMBER },
          weeklyPm25AvoidedGrams: { type: Type.NUMBER },
        },
        required: [
          'id',
          'category',
          'title',
          'contextLabel',
          'costTier',
          'steps',
          'personalImpactSummary',
          'communityImpactSummary',
          'whyItWorks',
          'exposureReductionPct',
          'weeklyCo2eAvoidedKg',
          'weeklyPm25AvoidedGrams',
        ],
      },
    },
  },
  required: ['bestVentilationWindow', 'impactNarrative', 'actions'],
};

/** Strict JSON schema enforced for Gemini contextual household Q&A answers. */
export const ASK_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    answer: {
      type: Type.STRING,
      description: 'Clear 2-4 sentence direct recommendation in plain prose without emojis.',
    },
    personalTakeaway: {
      type: Type.STRING,
      description: 'One-line explanation of direct personal/family health impact.',
    },
    communityTakeaway: {
      type: Type.STRING,
      description: 'One-line explanation of direct neighborhood/emission impact.',
    },
  },
  required: ['answer', 'personalTakeaway', 'communityTakeaway'],
};
