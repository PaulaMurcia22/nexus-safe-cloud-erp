import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  FRONTEND_ORIGIN: z.string().url().default('http://localhost:5173'),
  SESSION_SECRET: z.string().min(16).default('development-only-change-this-secret'),
  DB_HOST: z.string().min(1), DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_NAME: z.string().min(1), DB_USER: z.string().min(1), DB_PASSWORD: z.string()
});
const result = schema.safeParse(process.env);
if (!result.success) { console.error('Configuración inválida:', result.error.flatten().fieldErrors); throw new Error('Faltan variables de entorno requeridas.'); }
export const env = result.data;
