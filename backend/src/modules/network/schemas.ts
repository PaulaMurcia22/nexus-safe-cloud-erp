import { z } from 'zod';

const id = z.string().uuid();
const nullableText = z.string().trim().max(500).nullable().optional();
export const assetQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  search: z.string().trim().max(200).optional(),
  siteId: id.optional(), status: z.string().trim().max(40).optional(),
  assetType: z.string().trim().max(80).optional(), criticality: z.enum(['CRITICAL','HIGH','MEDIUM','LOW']).optional(),
  customerId: id.optional(), unassigned: z.coerce.boolean().optional(),
});
export const assetCreateSchema = z.object({
  serialNumber: z.string().trim().min(1).max(200), assetType: z.string().trim().min(1).max(80),
  vendor: nullableText, model: nullableText, hostname: nullableText, status: z.string().trim().max(40).default('ACTIVE'),
  siteId: id.nullable().optional(), customerId: id.nullable().optional(), projectId: id.nullable().optional(),
  vlanId: id.nullable().optional(), notes: nullableText,
});
// Serial is the importer's natural upsert key; editing it would orphan the source identity.
export const assetUpdateSchema = assetCreateSchema.partial().omit({ serialNumber: true });
export const linkSchema = z.object({ sourceAssetId: id, targetAssetId: id, linkType: z.string().trim().min(1).max(80),
  sourcePort: z.string().trim().max(160).nullable().optional(), targetPort: z.string().trim().max(160).nullable().optional(), notes: nullableText });
export const poolSchema = z.object({ assetId:id.nullable().optional(),name:z.string().trim().min(1).max(160),network:z.string().trim().max(64).nullable().optional(),netmask:z.string().trim().max(64).nullable().optional(),gateway:z.string().trim().max(64).nullable().optional(),dns:z.array(z.string().trim().max(64)).optional(),active:z.boolean().optional() });
export const bulkAssignmentSchema = z.object({ filter: z.object({ siteId: id.optional(), status: z.string().trim().max(40).optional(), assetType: z.string().trim().max(80).optional(), unassigned: z.boolean().default(true) }).default({ unassigned: true }), assignment: z.object({ siteId: id.nullable().optional(), customerId: id.nullable().optional(), projectId: id.nullable().optional() }).refine(v => Object.keys(v).length > 0) });
export const customFieldSchema = z.object({ key: z.string().trim().regex(/^[a-z][a-z0-9_]{1,63}$/), label: z.string().trim().min(1).max(120), valueType: z.enum(['TEXT','NUMBER','DATE','LIST']), options: z.array(z.string().max(100)).optional(), required: z.boolean().default(false), active: z.boolean().default(true) });
export const extraValuesSchema = z.record(z.string(), z.unknown());
export const collectorConfirmSchema = z.object({ host: z.string().trim().min(1).max(253), port: z.coerce.number().int().min(1).max(65535) });
export const listQuerySchema = z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(200).default(50) });
export const idParamSchema = z.object({ id });
