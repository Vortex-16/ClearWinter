export interface SanitizedProfile {
  city: string;
  aqi: number;
  householdType: string;
  heatingSource: string;
  commuteMode: string;
  housingType: string;
  priorities: string[];
}

export interface SanitizedAskPayload {
  question: string;
  profile: {
    city: string;
    aqi: number;
    householdType: string;
    heatingSource: string;
    commuteMode: string;
    housingType: string;
  };
  adoptedTitles: string[];
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface SanitizedAqiReport {
  city: string;
  aqi: number;
  pm25?: number;
  source: 'open-meteo' | 'station-feed';
}

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

/** Removes ASCII control characters and collapses runs of whitespace to keep inputs single-line safe. */
export function stripControlChars(input: string): string {
  return input.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
}

function cleanBoundedText(value: unknown, fallback: string, maxLen: number): string {
  if (typeof value !== 'string') return fallback;
  const cleaned = stripControlChars(value).slice(0, maxLen);
  return cleaned || fallback;
}

/** Validates and normalizes household profile payloads submitted to POST /api/plan. */
export function sanitizeProfileBody(raw: unknown): ValidationResult<SanitizedProfile> {
  const body = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const city = typeof body.city === 'string' ? stripControlChars(body.city).slice(0, 100) : '';
  const aqi = Number(body.aqi);

  if (!city || city.length < 2) {
    return { ok: false, error: 'Please provide a valid city or neighborhood name.' };
  }
  if (!Number.isFinite(aqi) || aqi < 1 || aqi > 500) {
    return { ok: false, error: 'Please provide an AQI value between 1 and 500.' };
  }

  const rawPriorities = Array.isArray(body.priorities) ? body.priorities : [];
  const priorities = rawPriorities
    .filter((item): item is string => typeof item === 'string')
    .map((item) => stripControlChars(item).slice(0, 80))
    .filter(Boolean)
    .slice(0, 8);

  return {
    ok: true,
    value: {
      city,
      aqi: Math.round(aqi),
      householdType: cleanBoundedText(body.householdType, 'Family household', 100),
      heatingSource: cleanBoundedText(body.heatingSource, 'Standard home heating', 100),
      commuteMode: cleanBoundedText(body.commuteMode, 'Mixed car and transit', 100),
      housingType: cleanBoundedText(body.housingType, 'Apartment', 100),
      priorities:
        priorities.length > 0
          ? priorities
          : ['Protect indoor air quality and lower winter emissions'],
    },
  };
}

/** Validates assistant Q&A questions, bounded conversation history, and profile context. */
export function sanitizeAskBody(raw: unknown): ValidationResult<SanitizedAskPayload> {
  const body = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const question = typeof body.question === 'string' ? stripControlChars(body.question) : '';

  if (!question) {
    return { ok: false, error: 'Please enter a question to ask the assistant.' };
  }
  if (question.length > 1000) {
    return { ok: false, error: 'Question must be 1000 characters or fewer.' };
  }

  const profileObj = (
    body.profile && typeof body.profile === 'object' ? body.profile : {}
  ) as Record<string, unknown>;
  const rawAqi = Number(profileObj.aqi);
  const safeAqi = Number.isFinite(rawAqi) && rawAqi >= 1 && rawAqi <= 500 ? Math.round(rawAqi) : 200;

  const adoptedTitles = (Array.isArray(body.adoptedTitles) ? body.adoptedTitles : [])
    .filter((item): item is string => typeof item === 'string')
    .map((item) => stripControlChars(item).slice(0, 120))
    .filter(Boolean)
    .slice(0, 15);

  const history = (Array.isArray(body.history) ? body.history : [])
    .filter(
      (msg): msg is { role: 'user' | 'assistant'; content: string } =>
        Boolean(msg) &&
        typeof msg === 'object' &&
        ((msg as { role?: unknown }).role === 'user' ||
          (msg as { role?: unknown }).role === 'assistant') &&
        typeof (msg as { content?: unknown }).content === 'string',
    )
    .slice(-6)
    .map((msg) => ({
      role: msg.role,
      content: stripControlChars(msg.content).slice(0, 800),
    }))
    .filter((msg) => msg.content.length > 0);

  return {
    ok: true,
    value: {
      question,
      profile: {
        city: cleanBoundedText(profileObj.city, 'their city', 100),
        aqi: safeAqi,
        householdType: cleanBoundedText(profileObj.householdType, 'Family', 100),
        heatingSource: cleanBoundedText(profileObj.heatingSource, 'Standard heating', 100),
        commuteMode: cleanBoundedText(profileObj.commuteMode, 'Mixed', 100),
        housingType: cleanBoundedText(profileObj.housingType, 'Apartment', 100),
      },
      adoptedTitles,
      history,
    },
  };
}

/** Validates live station AQI report payloads submitted to POST /api/aqi-report. */
export function sanitizeAqiReportBody(raw: unknown): ValidationResult<SanitizedAqiReport> {
  const body = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const city = typeof body.city === 'string' ? stripControlChars(body.city).slice(0, 100) : '';
  const aqi = Number(body.aqi);

  if (!city || city.length < 2) {
    return { ok: false, error: 'Valid city is required.' };
  }
  if (!Number.isFinite(aqi) || aqi < 1 || aqi > 500) {
    return { ok: false, error: 'Valid AQI between 1 and 500 is required.' };
  }

  let pm25: number | undefined;
  if (body.pm25 !== undefined) {
    const numPm = Number(body.pm25);
    if (!Number.isFinite(numPm) || numPm < 0 || numPm > 1000) {
      return { ok: false, error: 'PM2.5 must be between 0 and 1000 µg/m³.' };
    }
    pm25 = Number(numPm.toFixed(1));
  }

  return {
    ok: true,
    value: {
      city,
      aqi: Math.round(aqi),
      pm25,
      source: body.source === 'open-meteo' ? 'open-meteo' : 'station-feed',
    },
  };
}

export interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  maxKeys?: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Creates a bounded in-memory sliding-window rate limiter per client key.
 * Evicts the oldest entry when `maxKeys` is reached to cap memory under burst traffic.
 */
export function createRateLimiter({
  windowMs,
  maxRequests,
  maxKeys = 2000,
}: RateLimiterOptions) {
  const buckets = new Map<string, { count: number; resetAt: number }>();

  return function checkLimit(key: string, nowMs = Date.now()): RateLimitDecision {
    const safeKey = key || 'unknown';
    const current = buckets.get(safeKey);

    if (!current || nowMs >= current.resetAt) {
      if (buckets.size >= maxKeys) {
        const oldestKey = buckets.keys().next().value;
        if (oldestKey !== undefined) {
          buckets.delete(oldestKey);
        }
      }
      buckets.set(safeKey, { count: 1, resetAt: nowMs + windowMs });
      return {
        allowed: true,
        remaining: Math.max(0, maxRequests - 1),
        retryAfterSeconds: Math.ceil(windowMs / 1000),
      };
    }

    if (current.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - nowMs) / 1000)),
      };
    }

    current.count += 1;
    return {
      allowed: true,
      remaining: Math.max(0, maxRequests - current.count),
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - nowMs) / 1000)),
    };
  };
}
