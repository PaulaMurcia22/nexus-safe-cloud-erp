import {pool} from '../config/database.js'; import {hashPassword} from '../shared/auth.js';
const email='paus2207@gmail.com'; const password='Admin123*'; const name='admin pricipal';
const existing=await pool.query('SELECT id FROM users WHERE email=lower($1)',[email]);
if(existing.rowCount===0){const hash=await hashPassword(password);await pool.query("INSERT INTO users(name,email,password_hash,role,status) VALUES($1,lower($2),$3,'ADMIN','ACTIVE')",[name,email,hash]);console.log('Administrador inicial creado.');}else console.log('El administrador inicial ya existe; no se modificó.');
await pool.end();
