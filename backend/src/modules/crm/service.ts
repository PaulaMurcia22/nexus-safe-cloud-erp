import { pool } from '../../config/database.js';
import { audit } from '../../shared/audit.js';
import type { z } from 'zod';
import type { opportunitySchema } from './schemas.js';

type OpportunityInput = z.infer<typeof opportunitySchema>;
const columns = `o.id,o.customer_id AS "customerId",o.company_name AS "companyName",o.title,o.stage,
  o.expected_mrr AS "expectedMrr",o.probability,o.close_date AS "closeDate",o.source,o.notes,
  c.legal_name AS "customerName",o.created_at AS "createdAt",o.updated_at AS "updatedAt"`;

export async function list(search?: string, stage?: string) {
  const result = await pool.query(`SELECT ${columns} FROM crm_opportunities o LEFT JOIN clients c ON c.id=o.customer_id
    WHERE ($1::text IS NULL OR o.stage=$1) AND ($2::text IS NULL OR
      o.company_name ILIKE '%'||$2||'%' OR o.title ILIKE '%'||$2||'%' OR c.legal_name ILIKE '%'||$2||'%')
    ORDER BY CASE o.stage WHEN 'NEGOTIATION' THEN 1 WHEN 'PROPOSAL' THEN 2 WHEN 'QUALIFIED' THEN 3 WHEN 'LEAD' THEN 4 WHEN 'WON' THEN 5 ELSE 6 END,
      o.close_date NULLS LAST,o.created_at DESC`, [stage ?? null, search || null]);
  return result.rows;
}

export async function detail(id: string) {
  const result = await pool.query(`SELECT ${columns} FROM crm_opportunities o LEFT JOIN clients c ON c.id=o.customer_id WHERE o.id=$1`, [id]);
  return result.rows[0] ?? null;
}

export async function create(d: OpportunityInput, actorId: string) {
  const result = await pool.query(`INSERT INTO crm_opportunities(customer_id,company_name,title,stage,expected_mrr,probability,close_date,source,notes)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
  [d.customerId ?? null,d.companyName,d.title,d.stage,d.expectedMrr,d.probability,d.closeDate ?? null,d.source,d.notes ?? null]);
  const row = await detail(result.rows[0].id);
  await audit(actorId,'CREATE','crm_opportunity',row.id,null,row);
  return row;
}

export async function update(id: string, d: OpportunityInput, actorId: string) {
  const before = await detail(id);
  if (!before) return null;
  await pool.query(`UPDATE crm_opportunities SET customer_id=$2,company_name=$3,title=$4,stage=$5,expected_mrr=$6,
    probability=$7,close_date=$8,source=$9,notes=$10,updated_at=now() WHERE id=$1`,
  [id,d.customerId ?? null,d.companyName,d.title,d.stage,d.expectedMrr,d.probability,d.closeDate ?? null,d.source,d.notes ?? null]);
  const after = await detail(id);
  await audit(actorId,'UPDATE','crm_opportunity',id,before,after);
  return after;
}

export async function remove(id: string, actorId: string) {
  const before = await detail(id);
  if (!before) return null;
  const result = await pool.query(`DELETE FROM crm_opportunities WHERE id=$1 RETURNING id`, [id]);
  await audit(actorId,'DELETE','crm_opportunity',id,before,null);
  return result.rowCount ? { id } : null;
}
