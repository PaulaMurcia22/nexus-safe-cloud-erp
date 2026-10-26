import {z} from 'zod';
export const id=z.string().uuid();
export const orderStatus=z.object({status:z.enum(['OPEN','IN_PROGRESS','BLOCKED','COMPLETED','CANCELLED'])});
export const timeEntry=z.object({entryDate:z.string().date(),hours:z.number().positive().max(24),description:z.string().trim().min(2).max(2000)});
