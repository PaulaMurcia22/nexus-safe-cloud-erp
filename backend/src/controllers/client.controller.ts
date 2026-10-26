import type {RequestHandler} from 'express'; import * as repo from '../repositories/client.repository.js'; import {parse,clientSchema} from '../shared/validation.js';
import {pageParams} from '../shared/pagination.js';
import {audit} from '../shared/audit.js';
export const list:RequestHandler=async(req,res)=>{const search=typeof req.query.search==='string'?req.query.search:undefined;const page=pageParams(req);res.json(page?await repo.listPage(search,page.page,page.pageSize):await repo.list(search));};
export const detail:RequestHandler=async(req,res)=>{const c=await repo.findById(String(req.params.id));if(!c)return res.status(404).json({error:'Cliente no encontrado.'});res.json(c);};
export const create:RequestHandler=async(req,res)=>{const c=await repo.create(parse(clientSchema,req.body));await audit(res.locals.user.id,'CREATE','client',c.id,null,c);res.status(201).json(c);};
export const update:RequestHandler=async(req,res)=>{const id=String(req.params.id),before=await repo.findById(id);if(!before)return res.status(404).json({error:'Cliente no encontrado.'});const c=await repo.update(id,parse(clientSchema,req.body));if(!c)return res.status(404).json({error:'Cliente no encontrado.'});await audit(res.locals.user.id,'UPDATE','client',id,before,c);res.json(c);};
