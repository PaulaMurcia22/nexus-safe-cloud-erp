import type {Request,Response} from 'express';
import {pool} from '../../config/database.js';
import * as repo from './repository.js';
import * as service from './service.js';
import {generateSchema,idSchema,listSchema,statusSchema} from './schemas.js';
const parse=(s:any,v:unknown)=>{const r=s.safeParse(v);if(!r.success)throw Object.assign(new Error('Datos inválidos.'),{status:400});return r.data;};
const actor=(res:Response)=>(res.locals.user as {id:string}).id;
export async function list(req:Request,res:Response){const q=parse(listSchema,req.query);res.json({items:(await repo.list(q.status,q.severity)).rows});}
export async function generate(req:Request,res:Response){const d=parse(generateSchema,req.query);res.json(await service.generate(d.contractId,actor(res)));}
export async function status(req:Request,res:Response){const id=parse(idSchema,req.params.id),d=parse(statusSchema,req.body);const result=await service.updateStatus(id,d.status,actor(res));if(!result)return res.status(404).json({error:'Hallazgo no encontrado.'});res.json(result);}
export async function workOrder(req:Request,res:Response){const id=parse(idSchema,req.params.id);const result=await service.createWorkOrder(id,actor(res));if(!result)return res.status(404).json({error:'Hallazgo no encontrado.'});res.status(201).json(result);}
