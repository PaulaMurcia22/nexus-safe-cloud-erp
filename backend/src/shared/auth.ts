import crypto from 'node:crypto'; import type { RequestHandler } from 'express';
export type Role='ADMIN'|'MANAGEMENT'|'COMMERCIAL'|'FINANCE'|'IT_OPERATIONS'|'PMO'|'TECHNICIAN';
export interface AuthUser { id:string; name:string; email:string; role:Role; status:'ACTIVE'|'INACTIVE'; }
const sessions=new Map<string,{user:AuthUser;expires:number}>();
export function hashPassword(password:string){return new Promise<string>((resolve,reject)=>{const salt=crypto.randomBytes(16).toString('hex');crypto.scrypt(password,salt,64,(err,key)=>err?reject(err):resolve(`${salt}:${key.toString('hex')}`));});}
export function verifyPassword(password:string,stored:string){return new Promise<boolean>((resolve,reject)=>{const [salt,hash]=stored.split(':');if(!salt||!hash)return resolve(false);crypto.scrypt(password,salt,64,(err,key)=>{if(err)return reject(err);const a=Buffer.from(hash,'hex'),b=Buffer.from(key);resolve(a.length===b.length&&crypto.timingSafeEqual(a,b));});});}
export function createSession(user:AuthUser){const token=crypto.randomBytes(32).toString('hex');sessions.set(token,{user,expires:Date.now()+8*60*60*1000});return token;}
export function destroySession(token?:string){if(token)sessions.delete(token);}
export function destroyUserSessions(userId:string){for(const [token,session] of sessions){if(session.user.id===userId)sessions.delete(token);}}
export function currentUser(req:{headers:{cookie?:string}}){const token=req.headers.cookie?.match(/nexus_session=([^;]+)/)?.[1];const session=token?sessions.get(token):undefined;if(!session||session.expires<Date.now()){if(token)sessions.delete(token);return undefined;}return session.user;}
export const requireAuth:RequestHandler=(req,res,next)=>{const user=currentUser(req);if(!user)return res.status(401).json({error:'Debes iniciar sesión para continuar.'});res.locals.user=user;next();};
export const requireRoles=(...roles:Role[]):RequestHandler=>(req,res,next)=>{const user=currentUser(req);if(!user)return res.status(401).json({error:'Debes iniciar sesión para continuar.'});if(!roles.includes(user.role))return res.status(403).json({error:'No tienes permisos para realizar esta operación.'});res.locals.user=user;next();};
export function sessionCookie(token:string){return `nexus_session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=28800${process.env.NODE_ENV==='production'?'; Secure':''}`;}
export const clearSessionCookie='nexus_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0';
