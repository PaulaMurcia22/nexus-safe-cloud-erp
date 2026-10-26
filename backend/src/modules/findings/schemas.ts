import {z} from 'zod';
export const generateSchema=z.object({contractId:z.string().uuid()});
export const listSchema=z.object({status:z.enum(['OPEN','ACKNOWLEDGED','IN_PROGRESS','RESOLVED','WONT_FIX']).optional(),severity:z.enum(['CRITICAL','HIGH','MEDIUM','LOW']).optional()});
export const statusSchema=z.object({status:z.enum(['OPEN','ACKNOWLEDGED','IN_PROGRESS','RESOLVED','WONT_FIX'])});
export const idSchema=z.string().uuid();
