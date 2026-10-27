import type { Request, Response } from 'express';
import * as service from './service.js';
import { employeeQuerySchema, employeeSchema, idSchema } from './schemas.js';

function parse<T>(schema: {safeParse(value: unknown): {success: boolean; data?: T; error?: {flatten(): unknown}}}, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw Object.assign(new Error('Revisa los datos del empleado.'), {status:400,details:result.error?.flatten()});
  return result.data as T;
}
const actor = (res: Response) => (res.locals.user as {id:string}).id;

export async function list(req: Request, res: Response) {
  const filters=parse(employeeQuerySchema,req.query);
  res.json({items:await service.listEmployees(filters)});
}
export async function detail(req: Request, res: Response) {
  const result=await service.getEmployee(parse(idSchema,req.params.id));
  if(!result)return res.status(404).json({error:'Empleado no encontrado.'});
  res.json(result);
}
export async function create(req: Request, res: Response) {
  res.status(201).json(await service.createEmployee(parse(employeeSchema,req.body),actor(res)));
}
export async function update(req: Request, res: Response) {
  const result=await service.updateEmployee(parse(idSchema,req.params.id),parse(employeeSchema,req.body),actor(res));
  if(!result)return res.status(404).json({error:'Empleado no encontrado.'});
  res.json(result);
}
export async function deactivate(req: Request, res: Response) {
  const result=await service.deactivateEmployee(parse(idSchema,req.params.id),actor(res));
  if(!result)return res.status(404).json({error:'Empleado no encontrado.'});
  res.json(result);
}
