import {z} from 'zod';
export const id=z.string().uuid();export const issue=z.object({dueDate:z.string().date(),taxRate:z.number().min(0).max(100).default(0)});export const payment=z.object({paidAt:z.string().datetime().optional()});
export const milestone=z.object({projectId:id,name:z.string().trim().min(2).max(180),description:z.string().max(2000).optional(),amount:z.number().nonnegative().max(999999999999.99)});
