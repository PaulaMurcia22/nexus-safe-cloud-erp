import { z } from 'zod';

export const idSchema = z.string().uuid();
export const employeeSchema = z.object({
  employeeNumber: z.string().trim().min(2).max(24).regex(/^[A-Za-z0-9_-]+$/),
  fullName: z.string().trim().min(2).max(160),
  workEmail: z.string().trim().email().max(254),
  jobTitle: z.string().trim().min(2).max(120),
  department: z.string().trim().min(2).max(80),
  officeLocation: z.enum(['MEDELLIN','BOGOTA','REMOTE_SHARED']),
  startDate: z.string().date(),
  status: z.enum(['ACTIVE','ON_LEAVE','INACTIVE']).default('ACTIVE'),
  contractType: z.enum(['FULL_TIME','FIXED_TERM','CONTRACTOR','PART_TIME']),
});
export const employeeQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  status: z.enum(['ACTIVE','ON_LEAVE','INACTIVE']).optional(),
  department: z.string().trim().max(80).optional(),
});
