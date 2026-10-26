import type {RequestHandler} from 'express';
import {env} from '../config/env.js';

export const verifyOrigin:RequestHandler=(req,res,next)=>{
  if(!['POST','PUT','PATCH','DELETE'].includes(req.method))return next();
  const origin=req.get('origin');
  if(origin&&origin!==env.FRONTEND_ORIGIN)return res.status(403).json({error:'Origen de solicitud no permitido.'});
  next();
};
