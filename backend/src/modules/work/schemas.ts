import {z} from 'zod';
export const id=z.string().uuid();
export const orderStatus=z.object({status:z.enum(['OPEN','IN_PROGRESS','BLOCKED','COMPLETED','CANCELLED'])});
export const timeEntry=z.object({entryDate:z.string().date(),hours:z.number().positive().max(24),description:z.string().trim().min(2).max(2000)});
export const workOrder=z.object({customerId:id,siteId:id.nullable().optional(),contractId:id.nullable().optional(),findingId:id.nullable().optional(),projectId:id.nullable().optional(),assignedUserId:id.nullable().optional(),title:z.string().trim().min(3).max(180),description:z.string().trim().max(5000).optional(),status:z.enum(['OPEN','IN_PROGRESS','BLOCKED','COMPLETED','CANCELLED']).default('OPEN'),estimatedHours:z.number().nonnegative().max(10000).nullable().optional(),billable:z.boolean().default(true)});
