import { z } from 'zod';

export const idSchema = z.string().uuid();
const fields = {
  customerId: idSchema.nullable().optional(),
  companyName: z.string().trim().min(2).max(200),
  title: z.string().trim().min(2).max(180),
  stage: z.enum(['LEAD','QUALIFIED','PROPOSAL','NEGOTIATION','WON','LOST']),
  expectedMrr: z.number().nonnegative().max(999999999999.99),
  probability: z.number().int().min(0).max(100),
  closeDate: z.string().date().nullable().optional(),
  source: z.enum(['WEBSITE','REFERRAL','PARTNER','OUTBOUND','EVENT','OTHER']),
  notes: z.string().trim().max(4000).nullable().optional(),
};
export const opportunitySchema = z.object(fields);
export const opportunityListSchema = z.object({
  search: z.string().trim().max(120).optional(),
  stage: z.enum(['LEAD','QUALIFIED','PROPOSAL','NEGOTIATION','WON','LOST']).optional(),
});
