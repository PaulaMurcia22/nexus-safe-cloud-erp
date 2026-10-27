import type { Request,Response } from 'express';
import { pool } from '../../config/database.js';
import * as service from './service.js';
import { idSchema,subscriptionSchema } from './schemas.js';

const parse=(schema:any,value:unknown)=>{const result=schema.safeParse(value);if(!result.success)throw Object.assign(new Error('Datos inválidos.'),{status:400,details:result.error.flatten()});return result.data;};
const actor=(res:Response)=>(res.locals.user as {id:string}).id;
export async function plans(_req:Request,res:Response){res.json({items:(await pool.query(`SELECT id,code,name,description,monthly_price,extra_seat_price,annual_discount_pct,currency,included_seats,features,active FROM saas_plans ORDER BY monthly_price`)).rows});}
export async function list(req:Request,res:Response){const search=typeof req.query.search==='string'?req.query.search:undefined;const status=typeof req.query.status==='string'&&req.query.status!=='ALL'?req.query.status:undefined;res.json({items:await service.listSubscriptions(search,status)});}
export async function detail(req:Request,res:Response){const result=await service.getSubscription(parse(idSchema,req.params.id));if(!result)return res.status(404).json({error:'Suscripción no encontrada.'});res.json(result);}
export async function create(req:Request,res:Response){res.status(201).json(await service.createSubscription(parse(subscriptionSchema,req.body),actor(res)));}
export async function update(req:Request,res:Response){const result=await service.updateSubscription(parse(idSchema,req.params.id),parse(subscriptionSchema,req.body),actor(res));if(!result)return res.status(404).json({error:'Suscripción no encontrada.'});res.json(result);}
export async function cancel(req:Request,res:Response){const result=await service.cancelSubscription(parse(idSchema,req.params.id),actor(res));if(!result)return res.status(404).json({error:'Suscripción no encontrada.'});res.json(result);}
export async function reactivate(req:Request,res:Response){const result=await service.reactivateSubscription(parse(idSchema,req.params.id),actor(res));if(!result)return res.status(404).json({error:'Suscripción no encontrada.'});res.json(result);}
