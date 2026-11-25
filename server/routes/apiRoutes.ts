import { Router, type Request, type Response } from 'express';
import { HEALTH_MODEL_ID } from '../geminiService.ts';
import { createAqiRouter } from './aqiRoutes.ts';
import { createAssistantRouter } from './assistantRoutes.ts';

/**
 * Registers all ClearWinter JSON and SSE API routes under `/api/*`.
 */
export function createApiRouter(): Router {
  const router = Router();

  router.get('/health', (_req: Request, res: Response) => {
    res.json({ ok: true, model: HEALTH_MODEL_ID });
  });

  router.use(createAssistantRouter());
  router.use(createAqiRouter());

  return router;
}
