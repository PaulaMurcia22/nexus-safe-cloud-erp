import type { Request, Response } from 'express';
import * as service from './service.js';
import { idSchema, opportunityListSchema, opportunitySchema } from './schemas.js';

const parse = (schema: any, value: unknown) => {
  const result = schema.safeParse(value);
  if (!result.success) throw Object.assign(new Error('Revisa los datos de la oportunidad.'), { status: 400, details: result.error.flatten() });
  return result.data;
};
const actor = (res: Response) => (res.locals.user as { id: string }).id;

export async function list(req: Request, res: Response) {
  const query = parse(opportunityListSchema, req.query);
  res.json({ items: await service.list(query.search, query.stage) });
}
export async function detail(req: Request, res: Response) {
  const id = parse(idSchema, req.params.id);
  const result = await service.detail(id);
  if (!result) return res.status(404).json({ error: 'Oportunidad no encontrada.' });
  res.json(result);
}
export async function create(req: Request, res: Response) {
  res.status(201).json(await service.create(parse(opportunitySchema, req.body), actor(res)));
}
export async function update(req: Request, res: Response) {
  const id = parse(idSchema, req.params.id);
  const result = await service.update(id, parse(opportunitySchema, req.body), actor(res));
  if (!result) return res.status(404).json({ error: 'Oportunidad no encontrada.' });
  res.json(result);
}
export async function remove(req: Request, res: Response) {
  const result = await service.remove(parse(idSchema, req.params.id), actor(res));
  if (!result) return res.status(404).json({ error: 'Oportunidad no encontrada.' });
  res.status(204).end();
}
