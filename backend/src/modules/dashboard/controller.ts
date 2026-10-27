import type { Request, Response } from 'express';
import * as service from './service.js';

export async function summary(_req: Request, res: Response) {
  const user = res.locals.user as { id: string; role: string };
  res.json(await service.summary(user.id, user.role));
}
