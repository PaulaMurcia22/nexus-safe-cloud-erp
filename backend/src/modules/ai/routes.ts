import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { asyncHandler } from '../../middlewares/errors.js';
import { requireRoles } from '../../shared/auth.js';
import { explainCapture, explainFinding } from './service.js';

export const aiRouter = Router();
const idSchema = z.string().uuid();

aiRouter.post(
  '/findings/:id/explain',
  requireRoles('ADMIN', 'IT_OPERATIONS', 'PMO'),
  rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false }),
  asyncHandler(async (req, res) => {
    const parsed = idSchema.safeParse(req.params.id);
    if (!parsed.success) return res.status(400).json({ error: 'Identificador de hallazgo inválido.' });
    res.json(await explainFinding(parsed.data));
  }),
);

aiRouter.post(
  '/iot/captures/:id/explain',
  requireRoles('ADMIN', 'MANAGEMENT', 'IT_OPERATIONS', 'PMO'),
  rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false }),
  asyncHandler(async (req, res) => {
    const parsed = idSchema.safeParse(req.params.id);
    if (!parsed.success) return res.status(400).json({ error: 'Identificador de captura inválido.' });
    res.json(await explainCapture(parsed.data));
  }),
);
