import type { AirAction } from '../src/types/air';

/** Retries transient Gemini API failures (429/503) using linear backoff. */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  baseDelayMs = 600,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const isRetryable =
        message.includes('429') ||
        message.includes('503') ||
        message.includes('UNAVAILABLE') ||
        message.includes('RESOURCE_EXHAUSTED');
      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * (attempt + 1)));
    }
  }
  throw lastError;
}

/** Maps internal Gemini SDK errors to safe, client-facing HTTP status codes and sanitized messages. */
export function formatGeminiError(error: unknown): { status: number; message: string } {
  const raw = error instanceof Error ? error.message : '';
  if (raw.includes('GEMINI_API_KEY is not configured')) {
    return { status: 500, message: raw };
  }
  if (raw.includes('API_KEY_INVALID') || raw.includes('PERMISSION_DENIED') || raw.includes('403')) {
    return {
      status: 403,
      message:
        'Gemini API key was rejected or lacks permission. Please verify your key in Settings > Secrets.',
    };
  }
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
    return {
      status: 429,
      message: 'Rate limit reached on the Gemini API. Please wait a few seconds and try again.',
    };
  }
  return {
    status: 502,
    message: 'Unable to reach the Gemini service right now. Please try again in a moment.',
  };
}

/** Normalizes and clamps LLM-generated actions so numeric fields and enums remain strictly bounded. */
export function sanitizeGeneratedActions(rawActions: Array<Record<string, unknown>>): AirAction[] {
  const validCategories = new Set<AirAction['category']>(['routine', 'indoor', 'community']);
  const validCostTiers = new Set<AirAction['costTier']>([
    'Zero cost',
    'Low cost',
    'Shared investment',
  ]);

  return rawActions.map((item, idx) => {
    const categoryRaw = String(item.category ?? 'routine').toLowerCase() as AirAction['category'];
    const category = validCategories.has(categoryRaw) ? categoryRaw : 'routine';
    const costRaw = String(item.costTier ?? 'Low cost') as AirAction['costTier'];
    const costTier = validCostTiers.has(costRaw) ? costRaw : 'Low cost';

    return {
      id: String(item.id || `ai-${idx + 1}`),
      category,
      title: String(item.title || 'Tailored smog action').slice(0, 120),
      contextLabel: String(item.contextLabel || 'Daily Protocol').slice(0, 100),
      costTier,
      steps: String(item.steps || '').slice(0, 600),
      personalImpactSummary: String(item.personalImpactSummary || 'Lowers PM2.5 inhalation').slice(
        0,
        200,
      ),
      communityImpactSummary: String(item.communityImpactSummary || 'Cuts local emissions').slice(
        0,
        200,
      ),
      whyItWorks: String(item.whyItWorks || '').slice(0, 400),
      exposureReductionPct: Math.min(
        45,
        Math.max(4, Math.round(Number(item.exposureReductionPct) || 15)),
      ),
      weeklyCo2eAvoidedKg: Number(
        Math.max(0.1, Number(item.weeklyCo2eAvoidedKg) || 1.2).toFixed(1),
      ),
      weeklyPm25AvoidedGrams: Number(
        Math.max(0.2, Number(item.weeklyPm25AvoidedGrams) || 2.0).toFixed(1),
      ),
    };
  });
}
