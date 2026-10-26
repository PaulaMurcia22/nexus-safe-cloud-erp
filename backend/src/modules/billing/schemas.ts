import {z} from 'zod';
export const id=z.string().uuid();export const issue=z.object({dueDate:z.string().date(),taxRate:z.number().min(0).max(100).default(0)});export const payment=z.object({paidAt:z.string().datetime().optional()});
