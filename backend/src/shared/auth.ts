import crypto from 'node:crypto';
import type {RequestHandler} from 'express';
import {pool} from '../config/database.js';
import {env} from '../config/env.js';

export type Role='ADMIN'|'MANAGEMENT'|'COMMERCIAL'|'FINANCE'|'IT_OPERATIONS'|'PMO'|'TECHNICIAN';
export interface AuthUser{id:string;name:string;email:string;role:Role;status:'ACTIVE'|'INACTIVE'}
const tokenDigest=(token:string)=>crypto.createHmac('sha256',env.SESSION_SECRET).update(token).digest('hex');
export const hashSessionToken=tokenDigest;
export const roleAllowed=(role:Role|undefined,allowed:Role[])=>!!role&&allowed.includes(role);
export function hashPassword(password:string){return new Promise<string>((resolve,reject)=>{const salt=crypto.randomBytes(16).toString('hex');crypto.scrypt(password,salt,64,(err,key)=>err?reject(err):resolve(`${salt}:${key.toString('hex')}`));});}
export function verifyPassword(password:string,stored:string){return new Promise<boolean>((resolve,reject)=>{const [salt,hash]=stored.split(':');if(!salt||!hash)return resolve(false);crypto.scrypt(password,salt,64,(err,key)=>{if(err)return reject(err);const a=Buffer.from(hash,'hex'),b=Buffer.from(key);resolve(a.length===b.length&&crypto.timingSafeEqual(a,b));});});}
export async function createSession(user:AuthUser){const token=crypto.randomBytes(32).toString('hex');await pool.query(`INSERT INTO user_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '8 hours')`,[tokenDigest(token),user.id]);return token;}
export async function destroySession(token?:string){if(token)await pool.query(`DELETE FROM user_sessions WHERE token_hash=$1`,[tokenDigest(token)]);}
export async function destroyUserSessions(userId:string){await pool.query(`DELETE FROM user_sessions WHERE user_id=$1`,[userId]);}
export async function currentUser(req:{headers:{cookie?:string}}):Promise<AuthUser|undefined>{const token=req.headers.cookie?.match(/nexus_session=([^;]+)/)?.[1];if(!token)return undefined;const result=await pool.query<AuthUser>(`SELECT u.id,u.name,u.email,u.role,u.status FROM user_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.status='ACTIVE'`,[tokenDigest(token)]);if(!result.rowCount)await pool.query(`DELETE FROM user_sessions WHERE token_hash=$1 AND expires_at<=now()`,[tokenDigest(token)]);return result.rows[0];}
export const requireAuth:RequestHandler=(req,res,next)=>{currentUser(req).then(user=>{if(!user)return res.status(401).json({error:'Debes iniciar sesión para continuar.'});res.locals.user=user;next();}).catch(next);};
export const requireRoles=(...roles:Role[]):RequestHandler=>(req,res,next)=>{currentUser(req).then(user=>{if(!user)return res.status(401).json({error:'Debes iniciar sesión para continuar.'});if(!roleAllowed(user.role,roles))return res.status(403).json({error:'No tienes permisos para realizar esta operación.'});res.locals.user=user;next();}).catch(next);};
export function sessionCookie(token:string){return `nexus_session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=28800${env.NODE_ENV==='production'?'; Secure':''}`;}
export const clearSessionCookie='nexus_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0';
