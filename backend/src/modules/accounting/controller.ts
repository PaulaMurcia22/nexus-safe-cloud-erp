import type { Request,Response } from 'express';
import * as service from './service.js';
import {accountInput,id,journalEntry,reportRange} from './schemas.js';

const actor=(res:Response)=>(res.locals.user as {id:string}).id;
function parse<T>(schema:{safeParse(v:unknown):{success:true;data:T}|{success:false;error:{flatten:()=>unknown}}},value:unknown):T{
  const result=schema.safeParse(value);if(!result.success)throw Object.assign(new Error('Revisa los datos contables.'),{status:400,details:result.error.flatten()});return result.data;
}
export async function accounts(_req:Request,res:Response){res.json({items:await service.accounts()});}
export async function createAccount(req:Request,res:Response){res.status(201).json(await service.saveAccount(parse(accountInput,req.body),actor(res)));}
export async function updateAccount(req:Request,res:Response){const result=await service.saveAccount(parse(accountInput,req.body),actor(res),parse(id,req.params.id));if(!result)return res.status(404).json({error:'Cuenta contable no encontrada.'});res.json(result);}
export async function entries(req:Request,res:Response){res.json({items:await service.entries({from:typeof req.query.from==='string'?req.query.from:undefined,to:typeof req.query.to==='string'?req.query.to:undefined,status:typeof req.query.status==='string'?req.query.status:undefined})});}
export async function entry(req:Request,res:Response){const result=await service.entry(parse(id,req.params.id));if(!result)return res.status(404).json({error:'Asiento no encontrado.'});res.json(result);}
export async function createEntry(req:Request,res:Response){res.status(201).json(await service.saveEntry(parse(journalEntry,req.body),actor(res)));}
export async function updateEntry(req:Request,res:Response){const result=await service.saveEntry(parse(journalEntry,req.body),actor(res),parse(id,req.params.id));if(!result)return res.status(404).json({error:'Asiento no encontrado.'});res.json(result);}
export async function deleteEntry(req:Request,res:Response){const result=await service.deleteEntry(parse(id,req.params.id),actor(res));if(!result)return res.status(404).json({error:'Asiento no encontrado.'});res.status(204).end();}
export async function postEntry(req:Request,res:Response){const result=await service.postEntry(parse(id,req.params.id),actor(res));if(!result)return res.status(404).json({error:'Asiento no encontrado.'});res.json(result);}
export async function voidEntry(req:Request,res:Response){const body=req.body as {reason?:unknown};const reason=typeof body?.reason==='string'?body.reason.trim():'';if(reason.length<4||reason.length>500)throw Object.assign(new Error('Indica una razón de anulación de 4 a 500 caracteres.'),{status:400});const result=await service.voidEntry(parse(id,req.params.id),reason,actor(res));if(!result)return res.status(404).json({error:'Asiento no encontrado.'});res.json(result);}
export async function trialBalance(req:Request,res:Response){const range=parse(reportRange,req.query);res.json(await service.trialBalance(range.from,range.to));}
export async function profitLoss(req:Request,res:Response){const range=parse(reportRange,req.query);res.json(await service.profitLoss(range.from,range.to));}
