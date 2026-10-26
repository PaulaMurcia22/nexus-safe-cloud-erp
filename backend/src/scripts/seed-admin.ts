import {pool} from '../config/database.js'; import {hashPassword} from '../shared/auth.js';
const email=process.env.ADMIN_EMAIL?.trim(); const password=process.env.ADMIN_PASSWORD; const name=process.env.ADMIN_NAME?.trim()||'Administrador';
try {
  if(!email||!password||password.length<12) throw new Error('Configura ADMIN_EMAIL y ADMIN_PASSWORD (mínimo 12 caracteres) en el entorno local.');
  const existing=await pool.query('SELECT id FROM users WHERE email=lower($1)',[email]);
  if(existing.rowCount===0){const hash=await hashPassword(password);await pool.query("INSERT INTO users(name,email,password_hash,role,status) VALUES($1,lower($2),$3,'ADMIN','ACTIVE')",[name,email,hash]);console.log('Administrador inicial creado.');}else console.log('El administrador inicial ya existe; no se modificó.');
} finally { await pool.end(); }
