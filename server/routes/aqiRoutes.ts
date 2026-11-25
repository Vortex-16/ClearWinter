import { Router, type Request, type Response } from 'express';
import {
  createAqiFeedHub,
  fetchLiveOpenMeteoAqi,
  MAX_SSE_SUBSCRIBERS,
  type ServerAqiReading,
} from '../aqiFeedService.ts';
import { createRateLimiter, sanitizeAqiReportBody } from '../security.ts';
import { enforceRateLimit, parseCityQuery } from './rateLimitHelper.ts';

/**
 * Registers live AQI telemetry routes (`GET /aqi-stream`, `GET /aqi-live`, `POST /aqi-report`)
 * backed by an in-memory SSE hub and Open-Meteo station polling.
 */
export function createAqiRouter(): Router {
  const router = Router();
  const checkFeedRateLimit = createRateLimiter({ windowMs: 60_000, maxRequests: 60 });
  const aqiHub = createAqiFeedHub();

  router.get('/aqi-stream', (req: Request, res: Response) => {
    if (
      !enforceRateLimit(
        checkFeedRateLimit,
        req,
        res,
        'Too many stream connections. Please retry shortly.',
      )
    ) {
      return;
    }

    const city = parseCityQuery(req.query.city);
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

  router.get('/aqi-live', async (req: Request, res: Response) => {
    if (
      !enforceRateLimit(checkFeedRateLimit, req, res, 'Rate limit exceeded for live AQI checks.')
    ) {
      return;
    }

    const city = parseCityQuery(req.query.city);
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

  router.post('/aqi-report', (req: Request, res: Response) => {
    if (
      !enforceRateLimit(checkFeedRateLimit, req, res, 'Rate limit exceeded for station reports.')
    ) {
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

  return router;
}
