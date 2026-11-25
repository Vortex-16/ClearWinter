import { Router, type Request, type Response } from 'express';
import { answerAirQuestion, formatGeminiError, generateTailoredPlan } from '../geminiService.ts';
import { createRateLimiter, sanitizeAskBody, sanitizeProfileBody } from '../security.ts';
import { enforceRateLimit } from './rateLimitHelper.ts';

/**
 * Registers AI-powered routes (`POST /plan` and `POST /ask`) with strict
 * request-body validation and AI-specific rate limiting.
 */
export function createAssistantRouter(): Router {
  const router = Router();
  const checkAiRateLimit = createRateLimiter({ windowMs: 60_000, maxRequests: 25 });

  router.post('/plan', async (req: Request, res: Response) => {
    if (
      !enforceRateLimit(
        checkAiRateLimit,
        req,
        res,
        'Too many plan requests. Please wait a moment and try again.',
      )
    ) {
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

  router.post('/ask', async (req: Request, res: Response) => {
    if (
      !enforceRateLimit(
        checkAiRateLimit,
        req,
        res,
        'Too many questions sent. Please wait a moment and try again.',
      )
    ) {
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

  return router;
}
