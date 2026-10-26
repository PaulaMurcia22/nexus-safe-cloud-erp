import type {RequestHandler} from 'express'; import * as repo from '../repositories/project.repository.js'; import {parse,projectSchema} from '../shared/validation.js';
import {pageParams} from '../shared/pagination.js';
export const list:RequestHandler=async(req,res)=>{const filters={customerId:typeof req.query.customerId==='string'?req.query.customerId:undefined,status:typeof req.query.status==='string'?req.query.status:undefined,location:typeof req.query.location==='string'?req.query.location:undefined};const page=pageParams(req);res.json(page?await repo.listPage(filters,page.page,page.pageSize):await repo.list(filters));};
export const create:RequestHandler=async(req,res)=>res.status(201).json(await repo.create(parse(projectSchema,req.body)));
export const update:RequestHandler=async(req,res)=>{const p=await repo.update(String(req.params.id),parse(projectSchema,req.body));if(!p)return res.status(404).json({error:'Proyecto no encontrado.'});res.json(p);};
