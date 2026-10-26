import type {RequestHandler} from 'express';
import {pool} from '../config/database.js';
import {createSession,currentUser,verifyPassword,sessionCookie,clearSessionCookie,destroySession} from '../shared/auth.js';
import {audit} from '../shared/audit.js';
import {parse,loginSchema} from '../shared/validation.js';

export const login:RequestHandler=async(req,res)=>{
  const attempted=typeof req.body?.email==='string'?req.body.email.slice(0,254):'<invalid>';
  let credentials;
  try{credentials=parse(loginSchema,req.body);}catch(error){
    const event=await pool.query(`INSERT INTO auth_events(email_attempted,success,ip,user_agent) VALUES($1,false,$2,$3) RETURNING id`,[attempted,req.ip,req.get('user-agent')??null]);
    await audit(null,'LOGIN_FAILED','auth_event',event.rows[0].id,null,{emailAttempted:attempted});throw error;
  }
  const row=(await pool.query(`SELECT id,name,email,role,status,password_hash FROM users WHERE email=lower($1)`,[credentials.email])).rows[0];
  if(!row||row.status!=='ACTIVE'||!(await verifyPassword(credentials.password,row.password_hash))){
    const event=await pool.query(`INSERT INTO auth_events(user_id,email_attempted,success,ip,user_agent) VALUES($1,$2,false,$3,$4) RETURNING id`,[row?.id??null,attempted,req.ip,req.get('user-agent')??null]);
    await audit(row?.id??null,'LOGIN_FAILED','auth_event',event.rows[0].id,null,{emailAttempted:attempted});
    return res.status(401).json({error:'Correo o contraseña incorrectos.'});
  }
  const user={id:row.id,name:row.name,email:row.email,role:row.role,status:row.status};
  const token=await createSession(user);
  const event=await pool.query(`INSERT INTO auth_events(user_id,email_attempted,success,ip,user_agent) VALUES($1,$2,true,$3,$4) RETURNING id`,[row.id,attempted,req.ip,req.get('user-agent')??null]);
  await audit(row.id,'LOGIN_SUCCESS','auth_event',event.rows[0].id,null,{emailAttempted:attempted});
  res.setHeader('Set-Cookie',sessionCookie(token));res.json({user});
};
export const me:RequestHandler=async(req,res)=>res.json({user:await currentUser(req)||null});
export const logout:RequestHandler=async(req,res)=>{const token=req.headers.cookie?.match(/nexus_session=([^;]+)/)?.[1];const user=await currentUser(req);await destroySession(token);if(user)await audit(user.id,'LOGOUT','user_session',user.id,null,{loggedOut:true});res.setHeader('Set-Cookie',clearSessionCookie);res.status(204).send();};
