import type { GeneratedPlanPayload, HouseholdProfile } from '../types/air';

export interface AskAssistantApiRequest {
  question: string;
  profile: HouseholdProfile;
  adoptedTitles: string[];
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface AskAssistantApiResponse {
  answer: string;
  personalTakeaway?: string;
  communityTakeaway?: string;
}

const STATIC_HOST_PLAN_ERROR =
  'Live Gemini AI backend is unavailable on static hosting (such as GitHub Pages). Click "Apply Locally" to update the EPA exposure and 12-week models with your profile, or run the Express server with GEMINI_API_KEY.';

const STATIC_HOST_ASK_ERROR =
  'Live Gemini AI backend is unavailable on static hosting. Run the Express server with GEMINI_API_KEY configured to use interactive Q&A.';

/** Parses JSON API responses and detects static-hosting HTML fallbacks (e.g. GitHub Pages). */
async function parseJsonApiResponse<T>(
  response: Response,
  staticFallbackError: string,
  defaultError: string,
): Promise<T> {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(staticFallbackError);
  }

  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || defaultError);
  }
  return data;
}

/** Requests a Gemini-tailored 10-action winter smog plan from POST /api/plan. */
export async function requestTailoredPlan(
  profile: HouseholdProfile,
): Promise<GeneratedPlanPayload> {
  const response = await fetch('/api/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  });

  const data = await parseJsonApiResponse<Partial<GeneratedPlanPayload>>(
    response,
    STATIC_HOST_PLAN_ERROR,
    'Failed to generate tailored plan.',
  );

  if (!Array.isArray(data.actions) || data.actions.length === 0) {
    throw new Error('Assistant returned an empty action list. Please try again.');
  }

  return {
    bestVentilationWindow:
      data.bestVentilationWindow || '1:30 PM – 3:30 PM (peak afternoon dispersion)',
    impactNarrative:
      data.impactNarrative || `Tailored plan for ${profile.city} at AQI ${profile.aqi}.`,
    actions: data.actions,
  };
}

/** Sends a contextualized winter air-quality question to POST /api/ask. */
export async function requestAssistantAnswer(
  payload: AskAssistantApiRequest,
): Promise<AskAssistantApiResponse> {
  const response = await fetch('/api/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await parseJsonApiResponse<Partial<AskAssistantApiResponse>>(
    response,
    STATIC_HOST_ASK_ERROR,
    'Unable to get a response from ClearWinter assistant.',
  );

  return {
    answer: data.answer || '',
    personalTakeaway: data.personalTakeaway,
    communityTakeaway: data.communityTakeaway,
  };
}
