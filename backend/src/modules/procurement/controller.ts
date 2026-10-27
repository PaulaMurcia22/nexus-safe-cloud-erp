import type { Request, Response } from 'express';
import * as service from './service.js';
import { expense, id, purchaseOrder, supplier } from './schemas.js';

const parse = (schema: {safeParse: (value: unknown) => {success: boolean; data?: unknown}}, value: unknown) => {
  const result = schema.safeParse(value); if (!result.success) throw Object.assign(new Error('Datos inválidos.'), {status:400}); return result.data as never;
};
const actor = (res: Response) => (res.locals.user as {id:string}).id;

export async function listSuppliers(_req:Request,res:Response){res.json({items:await service.suppliers()});}
export async function createSupplier(req:Request,res:Response){res.status(201).json(await service.createSupplier(parse(supplier,req.body),actor(res)));}
export async function updateSupplier(req:Request,res:Response){const result=await service.updateSupplier(parse(id,req.params.id),parse(supplier,req.body),actor(res));if(!result)return res.status(404).json({error:'Proveedor no encontrado.'});res.json(result);}
export async function deleteSupplier(req:Request,res:Response){if(!await service.deleteSupplier(parse(id,req.params.id),actor(res)))return res.status(404).json({error:'Proveedor no encontrado.'});res.status(204).send();}
export async function listOrders(_req:Request,res:Response){res.json({items:await service.purchaseOrders()});}
export async function createOrder(req:Request,res:Response){res.status(201).json(await service.savePurchaseOrder(parse(purchaseOrder,req.body),actor(res)));}
export async function updateOrder(req:Request,res:Response){const result=await service.savePurchaseOrder(parse(purchaseOrder,req.body),actor(res),parse(id,req.params.id));if(!result)return res.status(404).json({error:'Orden de compra no encontrada.'});res.json(result);}
export async function deleteOrder(req:Request,res:Response){if(!await service.deletePurchaseOrder(parse(id,req.params.id),actor(res)))return res.status(404).json({error:'Orden de compra no encontrada.'});res.status(204).send();}
export async function orderStatus(req:Request,res:Response){const status=(req.body as {status?:unknown})?.status;if(!['SUBMITTED','APPROVED','RECEIVED','CANCELLED'].includes(String(status)))throw Object.assign(new Error('Estado inválido.'),{status:400});const result=await service.setPurchaseOrderStatus(parse(id,req.params.id),status as 'SUBMITTED'|'APPROVED'|'RECEIVED'|'CANCELLED',actor(res));if(!result)return res.status(404).json({error:'Orden de compra no encontrada.'});res.json(result);}
export async function listExpenses(_req:Request,res:Response){res.json({items:await service.expenses()});}
export async function createExpense(req:Request,res:Response){res.status(201).json(await service.saveExpense(parse(expense,req.body),actor(res)));}
export async function updateExpense(req:Request,res:Response){const result=await service.saveExpense(parse(expense,req.body),actor(res),parse(id,req.params.id));if(!result)return res.status(404).json({error:'Gasto no encontrado.'});res.json(result);}
export async function deleteExpense(req:Request,res:Response){if(!await service.deleteExpense(parse(id,req.params.id),actor(res)))return res.status(404).json({error:'Gasto no encontrado.'});res.status(204).send();}
