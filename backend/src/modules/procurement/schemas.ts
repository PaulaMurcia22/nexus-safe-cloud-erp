import { z } from 'zod';

export const id = z.string().uuid();
export const supplier = z.object({
  name: z.string().trim().min(2).max(180), taxId: z.string().trim().max(40).nullable().optional(),
  category: z.enum(['CLOUD_HOSTING','SOFTWARE','SECURITY','CONNECTIVITY','CONSULTING','EQUIPMENT','OTHER']),
  contactName: z.string().trim().max(140).nullable().optional(), email: z.string().email().max(254).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(), website: z.string().url().max(255).nullable().optional(),
  paymentTermsDays: z.number().int().min(0).max(365).default(30), status: z.enum(['ACTIVE','INACTIVE']).default('ACTIVE'),
});
const line = z.object({ description: z.string().trim().min(2).max(240), quantity: z.number().positive().max(10000000), unitPrice: z.number().nonnegative().max(999999999999.99) });
export const purchaseOrder = z.object({
  supplierId: id, description: z.string().trim().min(3).max(300), orderedOn: z.string().date(), expectedOn: z.string().date().nullable().optional(),
  currency: z.enum(['COP','USD']).default('COP'), taxRate: z.number().min(0).max(100).default(0), notes: z.string().max(4000).nullable().optional(),
  lines: z.array(line).min(1).max(100),
});
export const expense = z.object({
  supplierId: id.nullable().optional(), description: z.string().trim().min(3).max(240),
  category: z.enum(['CLOUD_INFRASTRUCTURE','SOFTWARE_LICENSES','SECURITY_TOOLS','CONNECTIVITY','PAYROLL','MARKETING','OFFICE','PROFESSIONAL_SERVICES','OTHER']),
  expenseDate: z.string().date(), currency: z.enum(['COP','USD']).default('COP'), amount: z.number().positive().max(999999999999.99),
  status: z.enum(['RECORDED','APPROVED','PAID','VOID']).default('RECORDED'), paymentReference: z.string().trim().max(100).nullable().optional(), notes: z.string().max(4000).nullable().optional(),
});
