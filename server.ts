import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  answerAirQuestion,
  formatGeminiError,
  generateTailoredPlan,
  HEALTH_MODEL_ID,
} from './server/geminiService.ts';
import {
  createAqiFeedHub,
  fetchLiveOpenMeteoAqi,
  MAX_SSE_SUBSCRIBERS,
  type ServerAqiReading,
} from './server/aqiFeedService.ts';
import {
  createRateLimiter,
  sanitizeAqiReportBody,
  sanitizeAskBody,
  sanitizeProfileBody,
  stripControlChars,
} from './server/security.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    next();
  });

  app.use(express.json({ limit: '100kb' }));

  const checkAiRateLimit = createRateLimiter({ windowMs: 60_000, maxRequests: 25 });
  const checkFeedRateLimit = createRateLimiter({ windowMs: 60_000, maxRequests: 60 });
  const aqiHub = createAqiFeedHub();

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, model: HEALTH_MODEL_ID });
  });

  app.post('/api/plan', async (req: Request, res: Response) => {
    const rate = checkAiRateLimit(req.ip || 'local');
    if (!rate.allowed) {
      res.setHeader('Retry-After', String(rate.retryAfterSeconds));
      res.status(429).json({ error: 'Too many plan requests. Please wait a moment and try again.' });
      return;
    }

    const validation = sanitizeProfileBody(req.body);
    if (!validation.ok) {
      res.status(400).json({ error: validation.error });
      return;
    }

    try {
      const plan = await generateTailoredPlan(validation.value);
      res.json(plan);
    } catch (error) {
      if (error instanceof Error && error.message === 'EMPTY_PLAN_GENERATED') {
        res.status(502).json({ error: 'Gemini returned an empty plan. Please try again.' });
        return;
      }
      const formatted = formatGeminiError(error);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post('/api/ask', async (req: Request, res: Response) => {
    const rate = checkAiRateLimit(req.ip || 'local');
    if (!rate.allowed) {
      res.setHeader('Retry-After', String(rate.retryAfterSeconds));
      res.status(429).json({ error: 'Too many questions sent. Please wait a moment and try again.' });
      return;
    }

    const validation = sanitizeAskBody(req.body);
    if (!validation.ok) {
      res.status(400).json({ error: validation.error });
      return;
    }

    try {
      const reply = await answerAirQuestion(validation.value);
      res.json(reply);
    } catch (error) {
      const formatted = formatGeminiError(error);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.get('/api/aqi-stream', (req: Request, res: Response) => {
    const rate = checkFeedRateLimit(req.ip || 'local');
    if (!rate.allowed) {
      res.setHeader('Retry-After', String(rate.retryAfterSeconds));
      res.status(429).json({ error: 'Too many stream connections. Please retry shortly.' });
      return;
    }

    const city =
      typeof req.query.city === 'string' ? stripControlChars(req.query.city).slice(0, 100) : '';
    if (city.length < 2) {
      res.status(400).json({ error: 'Query parameter "city" is required.' });
      return;
    }
    if (aqiHub.subscribers.size >= MAX_SSE_SUBSCRIBERS) {
      res.status(503).json({ error: 'Live stream capacity reached. Please retry shortly.' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const subscriber = { res, city };
    aqiHub.subscribers.add(subscriber);
    res.write(`event: aqi:connected\ndata: ${JSON.stringify({ city })}\n\n`);

    const existing = aqiHub.getCachedReading(city);
    if (existing) {
      res.write(`event: aqi:reading\ndata: ${JSON.stringify(existing)}\n\n`);
    } else {
      void fetchLiveOpenMeteoAqi(city).then((liveReading) => {
        if (liveReading && aqiHub.subscribers.has(subscriber)) {
          aqiHub.cacheReading(liveReading);
          res.write(`event: aqi:reading\ndata: ${JSON.stringify(liveReading)}\n\n`);
        }
      });
    }

    const heartbeat = setInterval(() => {
      if (aqiHub.subscribers.has(subscriber)) {
        res.write(': keepalive\n\n');
      }
    }, 25_000);

    req.on('close', () => {
      clearInterval(heartbeat);
      aqiHub.subscribers.delete(subscriber);
    });
  });

  app.get('/api/aqi-live', async (req: Request, res: Response) => {
    const rate = checkFeedRateLimit(req.ip || 'local');
    if (!rate.allowed) {
      res.setHeader('Retry-After', String(rate.retryAfterSeconds));
      res.status(429).json({ error: 'Rate limit exceeded for live AQI checks.' });
      return;
    }

    const city =
      typeof req.query.city === 'string' ? stripControlChars(req.query.city).slice(0, 100) : '';
    if (city.length < 2) {
      res.status(400).json({ error: 'Query parameter "city" is required.' });
      return;
    }

    const live = await fetchLiveOpenMeteoAqi(city);
    if (live) {
      aqiHub.broadcastReading(live);
      res.json({ reading: live });
      return;
    }

    res.json({ reading: aqiHub.getCachedReading(city) });
  });

  app.post('/api/aqi-report', (req: Request, res: Response) => {
    const rate = checkFeedRateLimit(req.ip || 'local');
    if (!rate.allowed) {
      res.setHeader('Retry-After', String(rate.retryAfterSeconds));
      res.status(429).json({ error: 'Rate limit exceeded for station reports.' });
      return;
    }

    const validation = sanitizeAqiReportBody(req.body);
    if (!validation.ok) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const reading: ServerAqiReading = {
      city: validation.value.city,
      aqi: validation.value.aqi,
      pm25: validation.value.pm25,
      source: validation.value.source,
      timestamp: new Date().toISOString(),
    };

    aqiHub.broadcastReading(reading);
    res.status(201).json({ reading, deliveredTo: aqiHub.subscribers.size });
  });

  if (process.env.NODE_ENV !== 'production') {
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
