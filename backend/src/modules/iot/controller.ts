import type { Request, Response } from 'express';
import * as service from './capture-service.js';

export async function list(_req: Request, res: Response) { res.json({ items: await service.listCaptures() }); }
export async function detail(req: Request, res: Response) {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'Identificador de captura inválido.' });
  const result = await service.getCapture(id);
  if (!result) return res.status(404).json({ error: 'Captura no encontrada.' });
  res.json(result);
}
export async function upload(req: Request, res: Response) {
  const body = req.body as Buffer;
  if (!Buffer.isBuffer(body) || !body.length) return res.status(400).json({ error: 'Adjunta un archivo Excel .xlsx.' });
  if (body.length > 10 * 1024 * 1024) return res.status(413).json({ error: 'El archivo supera el límite de 10 MB.' });
  let name = String(req.header('x-file-name') || 'captura-iot.xlsx');
  try { name = decodeURIComponent(name); } catch { /* Mantener el nombre recibido si no está codificado. */ }
  if (!name.toLowerCase().endsWith('.xlsx')) return res.status(415).json({ error: 'Solo se aceptan libros .xlsx.' });
  const user = res.locals.user as { id: string };
  const result = await service.importCapture(body, name, user.id);
  res.status(result.duplicate ? 200 : 201).json(result);
}
