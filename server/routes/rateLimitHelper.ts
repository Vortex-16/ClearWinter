import type { Request, Response } from 'express';
import { stripControlChars, type createRateLimiter } from '../security.ts';

/** Enforces per-IP rate limiting and sets `Retry-After` when capacity is exceeded. */
export function enforceRateLimit(
  checkLimit: ReturnType<typeof createRateLimiter>,
  req: Request,
  res: Response,
  limitMessage: string,
): boolean {
  const rate = checkLimit(req.ip || 'local');
  if (rate.allowed) return true;
  res.setHeader('Retry-After', String(rate.retryAfterSeconds));
  res.status(429).json({ error: limitMessage });
  return false;
}

/** Sanitizes the `?city=` query string parameter. */
export function parseCityQuery(raw: unknown): string {
  return typeof raw === 'string' ? stripControlChars(raw).slice(0, 100) : '';
}
