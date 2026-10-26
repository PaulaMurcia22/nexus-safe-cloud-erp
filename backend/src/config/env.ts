import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  FRONTEND_ORIGIN: z.string().url().default('http://localhost:5173'),
  SESSION_SECRET: z.string().min(32).optional(),
  DB_HOST: z.string().min(1), DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_NAME: z.string().min(1), DB_USER: z.string().min(1), DB_PASSWORD: z.string()
});
const result = schema.safeParse(process.env);
if (!result.success) { console.error('Configuración inválida:', result.error.flatten().fieldErrors); throw new Error('Faltan variables de entorno requeridas.'); }
if (result.data.NODE_ENV === 'production' && !result.data.SESSION_SECRET) throw new Error('SESSION_SECRET debe configurarse en producción.');
export const env = {...result.data,SESSION_SECRET:result.data.SESSION_SECRET??'development-only-change-this-secret-value'};
