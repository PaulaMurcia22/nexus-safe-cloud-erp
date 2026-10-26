import { z } from 'zod';

export const idSchema = z.string().uuid();
export const contractSchema = z.object({
  customerId: idSchema,
  siteId: idSchema.nullable().optional(),
  code: z.string().trim().min(2).max(40),
  status: z.enum(['DRAFT','ACTIVE','ENDED']).default('DRAFT'),
  startsOn: z.string().date(),
  endsOn: z.string().date().nullable().optional(),
  monthlyFee: z.number().nonnegative().max(999999999999.99),
});
export const scopeSchema = z.object({items:z.array(z.object({assetId:idSchema,signalKey:z.string().trim().min(1).max(120),included:z.boolean()})).max(2000)});
