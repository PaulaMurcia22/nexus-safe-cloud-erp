import type { Request,Response } from 'express';
import { contractSchema, idSchema, scopeSchema } from './schemas.js';
import * as repo from './repository.js';
import * as service from './service.js';
import { pool } from '../../config/database.js';

const parse=(schema:any,value:unknown)=>{const r=schema.safeParse(value);if(!r.success)throw Object.assign(new Error('Datos inválidos.'),{status:400,details:r.error.flatten()});return r.data;};
const actor=(res:Response)=>(res.locals.user as {id:string}).id;
export async function list(req:Request,res:Response){const customer=req.query.customerId?parse(idSchema,req.query.customerId):undefined;res.json({items:(await repo.listContracts(customer)).rows});}
export async function detail(req:Request,res:Response){const id=parse(idSchema,req.params.id);const result=await repo.contractDetail(id);if(!result.rowCount)return res.status(404).json({error:'Contrato no encontrado.'});const scope=await pool.query(`SELECT s.*,a.name AS asset_name,a.category,a.criticality FROM contract_scope_items s JOIN network_assets a ON a.id=s.asset_id WHERE contract_id=$1 ORDER BY a.name,s.signal_key`,[id]);res.json({...result.rows[0],scope:scope.rows});}
export async function create(req:Request,res:Response){res.status(201).json(await service.createContract(parse(contractSchema,req.body),actor(res)));}
export async function putScope(req:Request,res:Response){const id=parse(idSchema,req.params.id);const exists=await pool.query(`SELECT 1 FROM service_contracts WHERE id=$1`,[id]);if(!exists.rowCount)return res.status(404).json({error:'Contrato no encontrado.'});res.json({items:await service.replaceScope(id,parse(scopeSchema,req.body),actor(res))});}
export async function clientOverview(req:Request,res:Response){const id=parse(idSchema,req.params.id);const data=await repo.overview(id);if(!data.customer)return res.status(404).json({error:'Cliente no encontrado.'});res.json(data);}
