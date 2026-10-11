import { Pool } from 'pg';
import { env } from './env.js';
export const pool = new Pool({ host: env.DB_HOST, port: env.DB_PORT, database: env.DB_NAME, user: env.DB_USER, password: env.DB_PASSWORD, max: 10 });
export async function checkDatabase(): Promise<void> { await pool.query('SELECT 1'); }
