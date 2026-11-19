import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const MODEL_ID = 'gemini-4-hydrogen';

interface ProfileBody {
  city?: string;
  aqi?: number;
  householdType?: string;
  heatingSource?: string;
  commuteMode?: string;
  housingType?: string;
  priorities?: string[];
}

interface AskBody {
  question?: string;
  profile?: ProfileBody;
  adoptedTitles?: string[];
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

function createGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
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

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
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
      await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
    }
  }
  throw lastError;
}

function formatGeminiError(error: unknown): { status: number; message: string } {
  const raw = error instanceof Error ? error.message : 'Unexpected server error';
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
  return { status: 502, message: `Unable to reach Gemini service: ${raw}` };
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, model: MODEL_ID });
  });

  app.post('/api/plan', async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as ProfileBody;
    const city = typeof body.city === 'string' ? body.city.trim().slice(0, 100) : '';
    const aqi = Number(body.aqi);

    if (!city || city.length < 2) {
      res.status(400).json({ error: 'Please provide a valid city or neighborhood name.' });
      return;
    }
    if (!Number.isFinite(aqi) || aqi < 1 || aqi > 500) {
      res.status(400).json({ error: 'Please provide an AQI value between 1 and 500.' });
      return;
    }

    const householdType = body.householdType || 'Family household';
    const heatingSource = body.heatingSource || 'Standard home heating';
    const commuteMode = body.commuteMode || 'Mixed car and transit';
    const housingType = body.housingType || 'Apartment';
    const priorities = Array.isArray(body.priorities) && body.priorities.length > 0
      ? body.priorities.join(', ')
      : 'Protect indoor air quality and lower winter emissions';

    try {
      const ai = createGeminiClient();

      const prompt = [
        `Build a practical, scientifically grounded winter smog and urban air pollution action plan for this household:`,
        `- Location: ${city}`,
        `- Current / Typical Winter AQI: ${aqi}`,
        `- Household profile: ${householdType}`,
        `- Primary heating source: ${heatingSource}`,
        `- Daily commute mode: ${commuteMode}`,
        `- Housing type: ${housingType}`,
        `- Key priorities: ${priorities}`,
        ``,
        `Requirements:`,
        `1. Create 10 tailored actions total across three categories:`,
        `   - 4 actions in category "routine" (low-emission daily timing, school/commute adjustments, cooking & errands)`,
        `   - 3 actions in category "indoor" (indoor air quality hacks specific to their housing & heating type)`,
        `   - 3 actions in category "community" (sustainable neighborhood, transit, or shared alternatives)`,
        `2. Every action MUST clearly explain BOTH its direct personal health/exposure benefit AND its direct community/emissions impact, plus a concise 1-sentence scientific explanation ("whyItWorks").`,
        `3. Provide realistic numeric estimates per action: exposureReductionPct (integer 5-45), weeklyCo2eAvoidedKg (number 0.2-45), weeklyPm25AvoidedGrams (number 0.3-50).`,
        `4. Keep titles crisp (under 90 chars), steps practical (2 sentences), and avoid emojis or markdown symbols.`,
      ].join('\n');

      const response = await withRetry(() =>
        ai.models.generateContent({
          model: MODEL_ID,
          contents: prompt,
          config: {
            systemInstruction:
              'You are ClearWinter, an environmental health and urban air-quality engineer helping families and communities reduce winter smog exposure and local emissions with practical, measurable guidance.',
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
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
                        description: 'Short timing or room context using middot separator, e.g. "Sleeping Zones · Nighttime"',
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
            },
          },
        }),
      );

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText) as {
        bestVentilationWindow?: string;
        impactNarrative?: string;
        actions?: Array<Record<string, unknown>>;
      };

      const validCategories = new Set(['routine', 'indoor', 'community']);
      const validCostTiers = new Set(['Zero cost', 'Low cost', 'Shared investment']);

      const sanitizedActions = (parsed.actions ?? []).map((item, idx) => {
        const categoryRaw = String(item.category ?? 'routine').toLowerCase();
        const category = validCategories.has(categoryRaw) ? categoryRaw : 'routine';
        const costRaw = String(item.costTier ?? 'Low cost');
        const costTier = validCostTiers.has(costRaw) ? costRaw : 'Low cost';

        return {
          id: String(item.id || `ai-${idx + 1}`),
          category,
          title: String(item.title || 'Tailored smog action'),
          contextLabel: String(item.contextLabel || 'Daily Protocol'),
          costTier,
          steps: String(item.steps || ''),
          personalImpactSummary: String(item.personalImpactSummary || 'Lowers PM2.5 inhalation'),
          communityImpactSummary: String(item.communityImpactSummary || 'Cuts local emissions'),
          whyItWorks: String(item.whyItWorks || ''),
          exposureReductionPct: Math.min(45, Math.max(4, Math.round(Number(item.exposureReductionPct) || 15))),
          weeklyCo2eAvoidedKg: Number(Math.max(0.1, Number(item.weeklyCo2eAvoidedKg) || 1.2).toFixed(1)),
          weeklyPm25AvoidedGrams: Number(Math.max(0.2, Number(item.weeklyPm25AvoidedGrams) || 2.0).toFixed(1)),
        };
      });

      if (sanitizedActions.length === 0) {
        res.status(502).json({ error: 'Gemini returned an empty plan. Please try again.' });
        return;
      }

      res.json({
        bestVentilationWindow:
          parsed.bestVentilationWindow || '1:30 PM – 3:30 PM (peak afternoon dispersion)',
        impactNarrative:
          parsed.impactNarrative ||
          `Tailored plan for ${city} at AQI ${aqi}, balancing personal exposure protection with neighborhood emission reductions.`,
        actions: sanitizedActions,
      });
    } catch (error) {
      const formatted = formatGeminiError(error);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post('/api/ask', async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as AskBody;
    const question = typeof body.question === 'string' ? body.question.trim() : '';

    if (!question) {
      res.status(400).json({ error: 'Please enter a question to ask the assistant.' });
      return;
    }
    if (question.length > 1000) {
      res.status(400).json({ error: 'Question must be 1000 characters or fewer.' });
      return;
    }

    const profile = body.profile ?? {};
    const city = profile.city || 'their city';
    const aqi = Number(profile.aqi) || 200;
    const adoptedList =
      Array.isArray(body.adoptedTitles) && body.adoptedTitles.length > 0
        ? body.adoptedTitles.join('; ')
        : 'None adopted yet';

    const recentHistory = Array.isArray(body.history)
      ? body.history
          .slice(-4)
          .map((msg) => `${msg.role === 'user' ? 'Family' : 'Advisor'}: ${msg.content}`)
          .join('\n')
      : '';

    try {
      const ai = createGeminiClient();

      const prompt = [
        `Active Household Context:`,
        `- City: ${city} (Winter AQI ${aqi})`,
        `- Household: ${profile.householdType || 'Family'}`,
        `- Heating: ${profile.heatingSource || 'Standard heating'}`,
        `- Commute: ${profile.commuteMode || 'Mixed'}`,
        `- Housing: ${profile.housingType || 'Apartment'}`,
        `- Already adopted actions: ${adoptedList}`,
        recentHistory ? `\nRecent conversation:\n${recentHistory}` : '',
        `\nQuestion: ${question}`,
        `\nRespond with clear, actionable plain prose (no emojis, no markdown heading syntax). Explain both what to do right now and the direct personal + community impact.`,
      ]
        .filter(Boolean)
        .join('\n');

      const response = await withRetry(() =>
        ai.models.generateContent({
          model: MODEL_ID,
          contents: prompt,
          config: {
            systemInstruction:
              'You are ClearWinter, a concise environmental health and urban clean-air advisor. Give practical, low-cost, science-backed guidance tailored to the family profile and winter smog severity.',
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
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
            },
          },
        }),
      );

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText) as {
        answer?: string;
        personalTakeaway?: string;
        communityTakeaway?: string;
      };

      res.json({
        answer: parsed.answer || 'No response generated.',
        personalTakeaway: parsed.personalTakeaway || 'Reduces household particulate exposure.',
        communityTakeaway: parsed.communityTakeaway || 'Minimizes local winter combustion emissions.',
      });
    } catch (error) {
      const formatted = formatGeminiError(error);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  interface ServerAqiReading {
    city: string;
    aqi: number;
    pm25?: number;
    source: 'open-meteo' | 'station-feed';
    timestamp: string;
  }

  const aqiSubscribers = new Set<{ res: Response; city: string }>();
  const latestReadings = new Map<string, ServerAqiReading>();

  const normalizeCityKey = (city: string) =>
    city.split(',')[0].trim().toLowerCase().replace(/\s+/g, ' ');

  const citiesOverlap = (cityA: string, cityB: string) => {
    const a = normalizeCityKey(cityA);
    const b = normalizeCityKey(cityB);
    return Boolean(a && b && (a === b || a.includes(b) || b.includes(a)));
  };

  function broadcastAqiReading(reading: ServerAqiReading) {
    latestReadings.set(normalizeCityKey(reading.city), reading);
    const payload = `event: aqi:reading\ndata: ${JSON.stringify(reading)}\n\n`;
    for (const sub of aqiSubscribers) {
      if (citiesOverlap(sub.city, reading.city)) {
        sub.res.write(payload);
      }
    }
  }

  async function fetchLiveOpenMeteoAqi(city: string): Promise<ServerAqiReading | null> {
    const cleanCity = city.split(',')[0].trim();
    if (!cleanCity) return null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);

    try {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanCity)}&count=1&language=en&format=json`,
        { signal: controller.signal },
      );
      if (!geoRes.ok) return null;
      const geoData = (await geoRes.json()) as {
        results?: Array<{ latitude: number; longitude: number; name: string }>;
      };
      const match = geoData.results?.[0];
      if (!match) return null;

      const aqRes = await fetch(
        `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${match.latitude}&longitude=${match.longitude}&current=us_aqi,pm2_5`,
        { signal: controller.signal },
      );
      if (!aqRes.ok) return null;
      const aqData = (await aqRes.json()) as {
        current?: { us_aqi?: number; pm2_5?: number };
      };
      const usAqi = aqData.current?.us_aqi;
      if (typeof usAqi !== 'number' || !Number.isFinite(usAqi)) return null;

      return {
        city,
        aqi: Math.round(usAqi),
        pm25:
          typeof aqData.current?.pm2_5 === 'number'
            ? Number(aqData.current.pm2_5.toFixed(1))
            : undefined,
        source: 'open-meteo',
        timestamp: new Date().toISOString(),
      };
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  app.get('/api/aqi-stream', (req: Request, res: Response) => {
    const city = typeof req.query.city === 'string' ? req.query.city.trim() : '';
    if (!city) {
      res.status(400).json({ error: 'Query parameter "city" is required.' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const subscriber = { res, city };
    aqiSubscribers.add(subscriber);

    res.write(`event: aqi:connected\ndata: ${JSON.stringify({ city })}\n\n`);

    const existing = latestReadings.get(normalizeCityKey(city));
    if (existing) {
      res.write(`event: aqi:reading\ndata: ${JSON.stringify(existing)}\n\n`);
    } else {
      void fetchLiveOpenMeteoAqi(city).then((liveReading) => {
        if (liveReading && aqiSubscribers.has(subscriber)) {
          latestReadings.set(normalizeCityKey(city), liveReading);
          res.write(`event: aqi:reading\ndata: ${JSON.stringify(liveReading)}\n\n`);
        }
      });
    }

    const heartbeat = setInterval(() => {
      if (aqiSubscribers.has(subscriber)) {
        res.write(': keepalive\n\n');
      }
    }, 25000);

    req.on('close', () => {
      clearInterval(heartbeat);
      aqiSubscribers.delete(subscriber);
    });
  });

  app.get('/api/aqi-live', async (req: Request, res: Response) => {
    const city = typeof req.query.city === 'string' ? req.query.city.trim() : '';
    if (!city) {
      res.status(400).json({ error: 'Query parameter "city" is required.' });
      return;
    }

    const live = await fetchLiveOpenMeteoAqi(city);
    if (live) {
      broadcastAqiReading(live);
      res.json({ reading: live });
      return;
    }

    const cached = latestReadings.get(normalizeCityKey(city)) ?? null;
    res.json({ reading: cached });
  });

  app.post('/api/aqi-report', (req: Request, res: Response) => {
    const body = (req.body ?? {}) as {
      city?: string;
      aqi?: number;
      pm25?: number;
      source?: 'open-meteo' | 'station-feed';
    };
    const city = typeof body.city === 'string' ? body.city.trim() : '';
    const aqi = Number(body.aqi);

    if (!city || city.length < 2) {
      res.status(400).json({ error: 'Valid city is required.' });
      return;
    }
    if (!Number.isFinite(aqi) || aqi < 1 || aqi > 500) {
      res.status(400).json({ error: 'Valid AQI between 1 and 500 is required.' });
      return;
    }

    const reading: ServerAqiReading = {
      city,
      aqi: Math.round(aqi),
      pm25: typeof body.pm25 === 'number' ? Number(body.pm25.toFixed(1)) : undefined,
      source: body.source === 'open-meteo' ? 'open-meteo' : 'station-feed',
      timestamp: new Date().toISOString(),
    };

    broadcastAqiReading(reading);
    res.status(201).json({ reading, deliveredTo: aqiSubscribers.size });
  });

  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      const indexPath = path.join(distDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ClearWinter server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
