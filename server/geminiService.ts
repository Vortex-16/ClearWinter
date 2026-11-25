import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import type { GeneratedPlanPayload } from '../src/types/air';
import { formatGeminiError, sanitizeGeneratedActions, withRetry } from './geminiErrors.ts';
import { buildAskPrompt, buildPlanPrompt } from './geminiPrompts.ts';
import {
  ASK_RESPONSE_SCHEMA,
  PLAN_RESPONSE_SCHEMA,
  type AskAssistantResponse,
} from './geminiSchemas.ts';
import type { SanitizedAskPayload, SanitizedProfile } from './security.ts';

export { formatGeminiError, sanitizeGeneratedActions, withRetry };
export type { AskAssistantResponse } from './geminiSchemas.ts';

const MODEL_ID = 'gemini-4-hydrogen';

export const HEALTH_MODEL_ID = MODEL_ID;

/** Instantiates a configured Gemini SDK client, failing fast when API key is missing or placeholder. */
export function createGeminiClient(apiKey = process.env.GEMINI_API_KEY): GoogleGenAI {
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please check the Settings > Secrets panel in AI Studio.',
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

/** Generates a structured 10-action winter smog mitigation plan with XML data boundaries around user inputs. */
export async function generateTailoredPlan(
  profile: SanitizedProfile,
  clientFactory: () => GoogleGenAI = createGeminiClient,
): Promise<GeneratedPlanPayload> {
  const ai = clientFactory();
  const prompt = buildPlanPrompt(profile);

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: MODEL_ID,
      contents: prompt,
      config: {
        systemInstruction:
          'You are ClearWinter, an environmental health and urban air-quality engineer helping families and communities reduce winter smog exposure and local emissions with practical, measurable guidance.',
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: PLAN_RESPONSE_SCHEMA,
      },
    }),
  );

  const rawText = (response.text ?? '{}').trim();
  const parsed = JSON.parse(rawText) as {
    bestVentilationWindow?: string;
    impactNarrative?: string;
    actions?: Array<Record<string, unknown>>;
  };

  const actions = sanitizeGeneratedActions(parsed.actions ?? []);
  if (actions.length === 0) {
    throw new Error('EMPTY_PLAN_GENERATED');
  }

  return {
    bestVentilationWindow:
      parsed.bestVentilationWindow || '1:30 PM – 3:30 PM (peak afternoon dispersion)',
    impactNarrative:
      parsed.impactNarrative ||
      `Tailored plan for ${profile.city} at AQI ${profile.aqi}, balancing personal exposure protection with neighborhood emission reductions.`,
    actions,
  };
}

/** Answers a household winter air question using XML-delimited context and JSON schema output. */
export async function answerAirQuestion(
  payload: SanitizedAskPayload,
  clientFactory: () => GoogleGenAI = createGeminiClient,
): Promise<AskAssistantResponse> {
  const ai = clientFactory();
  const prompt = buildAskPrompt(payload);

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: MODEL_ID,
      contents: prompt,
      config: {
        systemInstruction:
          'You are ClearWinter, a concise environmental health and urban clean-air advisor. Give practical, low-cost, science-backed guidance tailored to the family profile and winter smog severity.',
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: ASK_RESPONSE_SCHEMA,
      },
    }),
  );

  const rawText = (response.text ?? '{}').trim();
  const parsed = JSON.parse(rawText) as Partial<AskAssistantResponse>;

  return {
    answer: parsed.answer || 'No response generated.',
    personalTakeaway: parsed.personalTakeaway || 'Reduces household particulate exposure.',
    communityTakeaway: parsed.communityTakeaway || 'Minimizes local winter combustion emissions.',
  };
}
