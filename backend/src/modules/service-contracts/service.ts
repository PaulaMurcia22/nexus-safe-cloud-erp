import { pool } from '../../config/database.js';
import { audit } from '../../shared/audit.js';
import type { z } from 'zod';
import type { contractSchema, scopeSchema } from './schemas.js';

export async function createContract(d:z.infer<typeof contractSchema>, actorId:string) {
  const result=await pool.query(`INSERT INTO service_contracts(customer_id,site_id,code,status,starts_on,ends_on,monthly_fee)
    VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[d.customerId,d.siteId??null,d.code,d.status,d.startsOn,d.endsOn??null,d.monthlyFee]);
  await audit(actorId,'CREATE','service_contract',result.rows[0].id,null,result.rows[0]);return result.rows[0];
}
export async function replaceScope(contractId:string,d:z.infer<typeof scopeSchema>,actorId:string) {
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const before=await client.query(`SELECT * FROM contract_scope_items WHERE contract_id=$1 ORDER BY asset_id,signal_key`,[contractId]);
    for(const item of d.items) await client.query(`INSERT INTO contract_scope_items(contract_id,asset_id,signal_key,included)
      VALUES($1,$2,$3,$4) ON CONFLICT(contract_id,asset_id,signal_key) DO UPDATE SET included=EXCLUDED.included,data_origin='MANUAL'`,[contractId,item.assetId,item.signalKey,item.included]);
    const after=await client.query(`SELECT * FROM contract_scope_items WHERE contract_id=$1 ORDER BY asset_id,signal_key`,[contractId]);
    await audit(actorId,'REPLACE_SCOPE','contract_scope',contractId,before.rows,after.rows);
    await client.query('COMMIT');return after.rows;
  } catch(e) { await client.query('ROLLBACK');throw e; } finally { client.release(); }
}
