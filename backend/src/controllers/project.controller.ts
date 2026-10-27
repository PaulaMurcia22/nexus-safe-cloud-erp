import type {RequestHandler} from 'express'; import * as repo from '../repositories/project.repository.js'; import {parse,projectSchema} from '../shared/validation.js';
import {pageParams} from '../shared/pagination.js';
import {audit} from '../shared/audit.js'; import {pool} from '../config/database.js';
export const list:RequestHandler=async(req,res)=>{const filters={customerId:typeof req.query.customerId==='string'?req.query.customerId:undefined,status:typeof req.query.status==='string'?req.query.status:undefined,location:typeof req.query.location==='string'?req.query.location:undefined};const page=pageParams(req);res.json(page?await repo.listPage(filters,page.page,page.pageSize):await repo.list(filters));};
export const create:RequestHandler=async(req,res)=>{const p=await repo.create(parse(projectSchema,req.body));await audit(res.locals.user.id,'CREATE','project',p.id,null,p);res.status(201).json(p);};
export const update:RequestHandler=async(req,res)=>{const id=String(req.params.id),before=await repo.findById(id);if(!before)return res.status(404).json({error:'Proyecto no encontrado.'});const p=await repo.update(id,parse(projectSchema,req.body));if(!p)return res.status(404).json({error:'Proyecto no encontrado.'});await audit(res.locals.user.id,'UPDATE','project',id,before,p);res.json(p);};

export const responsibles:RequestHandler=async(_req,res)=>{const result=await pool.query(`SELECT id,name,role FROM users WHERE status='ACTIVE' ORDER BY name`);res.json({items:result.rows});};
