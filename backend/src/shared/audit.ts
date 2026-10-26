import { pool } from '../config/database.js';

export async function audit(actorId: string | null, action: string, entity: string, entityId: string, before: unknown, after: unknown) {
  await pool.query(
    `INSERT INTO audit_log(actor_id,action,entity,entity_id,before_data,after_data)
     VALUES($1,$2,$3,$4,$5::jsonb,$6::jsonb)`,
    [actorId, action, entity, entityId, before === null ? null : JSON.stringify(before), after === null ? null : JSON.stringify(after)],
  );
}
