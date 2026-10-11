import type {RequestHandler} from 'express'; import * as repo from '../repositories/client.repository.js'; import {parse,clientSchema} from '../shared/validation.js';
export const list:RequestHandler=async(req,res)=>res.json(await repo.list(typeof req.query.search==='string'?req.query.search:undefined));
export const detail:RequestHandler=async(req,res)=>{const c=await repo.findById(String(req.params.id));if(!c)return res.status(404).json({error:'Cliente no encontrado.'});res.json(c);};
export const create:RequestHandler=async(req,res)=>res.status(201).json(await repo.create(parse(clientSchema,req.body)));
export const update:RequestHandler=async(req,res)=>{const c=await repo.update(String(req.params.id),parse(clientSchema,req.body));if(!c)return res.status(404).json({error:'Cliente no encontrado.'});res.json(c);};
