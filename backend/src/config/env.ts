import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  FRONTEND_ORIGIN: z.string().url().default('http://localhost:5173'),
  SESSION_SECRET: z.string().min(32).optional(),
  OLLAMA_BASE_URL: z.string().url().default('http://localhost:11434'),
  OLLAMA_MODEL: z.string().trim().min(1).default('qwen2.5:3b'),
  OLLAMA_API_KEY: z.string().trim().default(''),
  RABBITMQ_ENABLED: z.enum(['true','false']).default('false').transform(v=>v==='true'),
  RABBITMQ_URL: z.string().url().default('amqp://localhost:5672'),
  RABBITMQ_MAX_CONSUMER_RETRIES: z.coerce.number().int().nonnegative().default(3),
  DB_HOST: z.string().min(1), DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_SSL_MODE: z.enum(['disable','require']).default('disable'),
  DB_NAME: z.string().min(1), DB_USER: z.string().min(1), DB_PASSWORD: z.string()
});
const result = schema.safeParse(process.env);
if (!result.success) { console.error('Configuración inválida:', result.error.flatten().fieldErrors); throw new Error('Faltan variables de entorno requeridas.'); }
if (result.data.NODE_ENV === 'production' && !result.data.SESSION_SECRET) throw new Error('SESSION_SECRET debe configurarse en producción.');
export const env = {...result.data,SESSION_SECRET:result.data.SESSION_SECRET??'development-only-change-this-secret-value'};
