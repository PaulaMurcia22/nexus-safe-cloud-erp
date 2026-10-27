import { z } from 'zod';

export const idSchema = z.string().uuid();
export const subscriptionSchema = z.object({
  customerId: idSchema,
  planId: idSchema,
  code: z.string().trim().min(3).max(40).regex(/^[A-Za-z0-9_-]+$/),
  billingInterval: z.enum(['MONTHLY','YEARLY']),
  seats: z.number().int().min(1).max(100000),
  startsOn: z.string().date(),
  trialEndsOn: z.string().date().nullable().optional(),
  notes: z.string().trim().max(2000).default(''),
});
