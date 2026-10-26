import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { pool } from '../config/database.js';
import { hashPassword } from '../shared/auth.js';
import { bulkAssign } from '../modules/network/service.js';

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const reset = args.has('--reset-synthetic');
const confirmed = args.has('--confirm');
const password = process.env.DEMO_USERS_PASSWORD;
const demoCustomerId = '00000000-0000-4000-8000-000000000101';
const demoSiteId = '00000000-0000-4000-8000-000000000201';
const demoProjectId = '00000000-0000-4000-8000-000000000301';
const demoContractId = '00000000-0000-4000-8000-000000000401';
const demoActorId = '00000000-0000-4000-8000-000000000510';
const roles = ['ADMIN', 'MANAGEMENT', 'COMMERCIAL', 'FINANCE', 'IT_OPERATIONS', 'PMO', 'TECHNICIAN'] as const;
const signalKeys = ['SNMP', 'SYSLOG', 'NTP', 'NETFLOW', 'ICMP'];

function stableId(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
}

async function audit(action: string, entity: string, id: string, after: unknown) {
  await pool.query(
    `INSERT INTO audit_log(actor_id,action,entity,entity_id,after_data)
     VALUES($1,$2,$3,$4,$5::jsonb)`,
    [demoActorId, action, entity, id, JSON.stringify(after)],
  );
}

async function resetSynthetic() {
  if (!confirmed) throw new Error('El reinicio requiere --reset-synthetic --confirm.');
  if (dryRun) {
    const counts = await pool.query(`SELECT 'synthetic' AS group_name, count(*)::int AS count FROM (
      SELECT id FROM clients WHERE data_origin='SYNTHETIC'
      UNION ALL SELECT id FROM projects WHERE data_origin='SYNTHETIC'
      UNION ALL SELECT id FROM service_contracts WHERE data_origin='SYNTHETIC'
      UNION ALL SELECT id FROM findings WHERE data_origin='SYNTHETIC'
      UNION ALL SELECT id FROM work_orders WHERE data_origin='SYNTHETIC'
      UNION ALL SELECT id FROM time_entries WHERE data_origin='SYNTHETIC'
      UNION ALL SELECT id FROM invoices WHERE data_origin='SYNTHETIC'
    ) s`);
    console.log(`Dry-run de reinicio: ${counts.rows[0].count} registros sintéticos contabilizados; no se modificó la base.`);
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const assignments = await client.query(
      `SELECT id,site_id,customer_id,project_id FROM network_assets
       WHERE site_id=$1 OR customer_id=$2 OR project_id=$3`,
      [demoSiteId, demoCustomerId, demoProjectId],
    );
    for (const row of assignments.rows) {
      await client.query(
        `INSERT INTO audit_log(actor_id,action,entity,entity_id,before_data,after_data)
         VALUES($1,'RESET_SYNTHETIC_ASSIGNMENT','network_asset',$2,$3::jsonb,$4::jsonb)`,
        [demoActorId, row.id, JSON.stringify(row), JSON.stringify({ site_id: null, customer_id: null, project_id: null })],
      );
    }
    await client.query(
      `UPDATE network_assets SET site_id=NULL,customer_id=NULL,project_id=NULL,updated_at=now()
       WHERE site_id=$1 OR customer_id=$2 OR project_id=$3`,
      [demoSiteId, demoCustomerId, demoProjectId],
    );
    for (const table of ['invoices', 'time_entries', 'work_orders', 'findings', 'contract_scope_items', 'project_milestones', 'service_contracts', 'projects', 'sites', 'clients', 'users']) {
      await client.query(`DELETE FROM ${table} WHERE data_origin='SYNTHETIC'`);
    }
    await client.query('COMMIT');
    console.log('Filas sintéticas eliminadas; las asignaciones de activos importados se limpiaron con auditoría.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function seed() {
  if (!password || password.length < 12) {
    throw new Error('Define DEMO_USERS_PASSWORD con al menos 12 caracteres en el entorno; el valor nunca se muestra.');
  }
  if (dryRun) {
    const assets = await pool.query(`SELECT count(*)::int AS count FROM network_assets WHERE status='ACTIVE'`);
    console.log(`Dry-run: ${assets.rows[0].count} activos disponibles; ${roles.length} roles; ${roles.length + 1} usuarios demo contando el segundo técnico; sin cambios.`);
    return;
  }

  const seedSql = await readFile(fileURLToPath(new URL('../../../database/scripts/90_Insert_DatosPrueba.sql', import.meta.url)), 'utf8');
  const hash = await hashPassword(password);
  const actor = { id: demoActorId, role: 'ADMIN' };
  await pool.query(seedSql);
  const userIds = new Map<string, string>();
  for (const [index, role] of roles.entries()) {
    const id = stableId(510 + index);
    const email = `${role.toLowerCase()}@nexus.demo.invalid`;
    await pool.query(
      `INSERT INTO users(id,name,email,password_hash,role,status,data_origin)
       VALUES($1,$2,$3,$4,$5,'ACTIVE','SYNTHETIC')
       ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,email=EXCLUDED.email,password_hash=EXCLUDED.password_hash,role=EXCLUDED.role,status='ACTIVE',data_origin='SYNTHETIC'`,
      [id, `Usuario demo ${role}`, email, hash, role],
    );
    userIds.set(role, id);
  }
  const secondTechId = stableId(518);
  await pool.query(
    `INSERT INTO users(id,name,email,password_hash,role,status,data_origin)
     VALUES($1,'Técnico demo 2','tecnico2@nexus.demo.invalid',$2,'TECHNICIAN','ACTIVE','SYNTHETIC')
     ON CONFLICT(id) DO UPDATE SET password_hash=EXCLUDED.password_hash,status='ACTIVE',data_origin='SYNTHETIC'`,
    [secondTechId, hash],
  );
  await pool.query(`UPDATE users SET data_origin='SYNTHETIC' WHERE id=$1`, [demoActorId]);
  userIds.set('TECHNICIAN_2', secondTechId);

  const assets = await pool.query<{id: string; category: string; name: string; criticality: string}>(
    `SELECT id,category,name,criticality FROM network_assets WHERE status='ACTIVE' ORDER BY source_id NULLS LAST,id`,
  );
  if (assets.rowCount !== 76) throw new Error(`Esperaba 76 activos importados y encontré ${assets.rowCount}; no se asignó el inventario.`);
  await bulkAssign({ filter: { unassigned: false, status: 'ACTIVE' }, assignment: { siteId: demoSiteId, customerId: demoCustomerId, projectId: demoProjectId } }, actor);

  await pool.query(
    `INSERT INTO contract_scope_items(contract_id,asset_id,signal_key,included,data_origin)
     SELECT $1,a.id,signal_key,true,'SYNTHETIC'
     FROM network_assets a CROSS JOIN unnest($2::text[]) signal_key
     WHERE a.status='ACTIVE' AND (
       (a.category='NETWORK_INFRASTRUCTURE' AND signal_key=ANY($3::text[]))
       OR (a.category='CCTV_IOT' AND signal_key='ICMP')
     )
     ON CONFLICT(contract_id,asset_id,signal_key) DO UPDATE SET included=true,data_origin='SYNTHETIC'`,
    [demoContractId, signalKeys, signalKeys],
  );

  const missing = await pool.query<{id: string; asset_id: string; control: string; criticality: string; name: string}>(
    `SELECT c.id,a.id AS asset_id,c.control,a.criticality,a.name
     FROM asset_controls c JOIN network_assets a ON a.id=c.asset_id
     JOIN contract_scope_items s ON s.asset_id=a.id AND s.contract_id=$1 AND s.signal_key=c.control AND s.included
     WHERE c.status='NOT_DETECTED' ORDER BY a.criticality,a.name,c.control LIMIT 5`, [demoContractId],
  );
  if (missing.rowCount !== 5) throw new Error(`Se requieren cinco controles faltantes importados para originar OT; encontrados ${missing.rowCount}.`);
  const findingIds: string[] = [];
  for (const [index, row] of missing.rows.entries()) {
    const id = stableId(600 + index);
    const finding = await pool.query<{id: string}>(
      `INSERT INTO findings(id,asset_id,contract_id,kind,signal_key,severity,status,description,data_origin,extra)
       VALUES($1,$2,$3,'CONTROL_MISSING',$4,$5,'OPEN',$6,'SYNTHETIC',$7::jsonb)
       ON CONFLICT(asset_id,kind,signal_key) WHERE status IN ('OPEN','ACKNOWLEDGED','IN_PROGRESS')
       DO UPDATE SET contract_id=EXCLUDED.contract_id,severity=EXCLUDED.severity,status='OPEN',
         description=EXCLUDED.description,data_origin='SYNTHETIC',extra=EXCLUDED.extra RETURNING id`,
      [id, row.asset_id, demoContractId, row.control, row.criticality, `Brecha derivada de configuración importada: ${row.name} no reporta ${row.control}. No confirma una incidencia en vivo.`, JSON.stringify({ source: 'asset_controls', control_id: row.id })],
    );
    findingIds.push(finding.rows[0].id);
  }

  const technicianIds = [userIds.get('TECHNICIAN')!, userIds.get('TECHNICIAN_2')!];
  const workIds: string[] = [];
  for (let index = 0; index < 5; index++) {
    const id = stableId(650 + index);
    const title = `Revisar ${missing.rows[index].control} en ${missing.rows[index].name}`;
    await pool.query(
      `INSERT INTO work_orders(id,code,customer_id,site_id,contract_id,finding_id,project_id,assigned_user_id,title,description,status,estimated_hours,billable,data_origin)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'IN_PROGRESS',8,true,'SYNTHETIC')
       ON CONFLICT(id) DO UPDATE SET finding_id=EXCLUDED.finding_id,assigned_user_id=EXCLUDED.assigned_user_id,title=EXCLUDED.title,
         description=EXCLUDED.description,status='IN_PROGRESS',estimated_hours=8,data_origin='SYNTHETIC'`,
      [id, `DEMO-OT-${String(index + 1).padStart(3, '0')}`, demoCustomerId, demoSiteId, demoContractId, findingIds[index], demoProjectId, technicianIds[index % 2], title,
        'Orden sintética basada en una señal de configuración importada; requiere validación operativa.'],
    );
    workIds.push(id);
  }

  const anchor = new Date('2026-10-25T12:00:00Z');
  for (let index = 0; index < 15; index++) {
    const dayOffset = 2 + index;
    const date = new Date(anchor);
    date.setUTCDate(date.getUTCDate() - dayOffset);
    await pool.query(
      `INSERT INTO time_entries(id,work_order_id,user_id,entry_date,hours,description,data_origin)
       VALUES($1,$2,$3,$4,$5,$6,'SYNTHETIC')
       ON CONFLICT(id) DO UPDATE SET work_order_id=EXCLUDED.work_order_id,user_id=EXCLUDED.user_id,entry_date=EXCLUDED.entry_date,
         hours=EXCLUDED.hours,description=EXCLUDED.description,data_origin='SYNTHETIC'`,
      [stableId(700 + index), workIds[index % 5], technicianIds[index % 2], date.toISOString().slice(0, 10), index % 3 === 0 ? 1.5 : 2,
        `Registro sintético ${index + 1} de trabajo técnico.`],
    );
  }

  const invoices = [
    { id: stableId(750), number: 'DEMO-FAC-001', status: 'PAID', issued: '2026-10-05', due: '2026-10-20', paid: '2026-10-18' },
    { id: stableId(751), number: 'DEMO-FAC-002', status: 'ISSUED', issued: '2026-10-20', due: '2026-11-19', paid: null },
    { id: stableId(752), number: 'DEMO-FAC-003', status: 'ISSUED', issued: '2026-09-01', due: '2026-09-30', paid: null },
  ];
  for (let index = 0; index < invoices.length; index++) {
    const item = invoices[index];
    await pool.query(
      `INSERT INTO invoices(id,customer_id,milestone_id,number,issue_date,due_date,subtotal,tax_rate,total,status,paid_at,e_invoice_status,data_origin)
       VALUES($1,$2,$3,$4,$5,$6,$7,0,$7,$8,$9,'SIMULATED_ACCEPTED','SYNTHETIC')
       ON CONFLICT(id) DO UPDATE SET milestone_id=EXCLUDED.milestone_id,issue_date=EXCLUDED.issue_date,due_date=EXCLUDED.due_date,
         subtotal=EXCLUDED.subtotal,total=EXCLUDED.total,status=EXCLUDED.status,paid_at=EXCLUDED.paid_at,data_origin='SYNTHETIC'`,
      [item.id, demoCustomerId, stableId(701 + index), item.number, item.issued, item.due, [500000, 750000, 250000][index], item.status, item.paid],
    );
    await pool.query(`UPDATE project_milestones SET status='INVOICED' WHERE id=$1`, [stableId(701 + index)]);
  }

  const auditScopes: Array<[string, string, string, unknown[]]> = [
    ['users', 'users', `email LIKE '%@nexus.demo.invalid'`, []],
    ['clients', 'clients', `id IN ($1,$2)`, [demoCustomerId, '00000000-0000-4000-8000-000000000102']],
    ['sites', 'sites', `id=$1`, [demoSiteId]],
    ['projects', 'projects', `id=$1`, [demoProjectId]],
    ['service_contracts', 'service_contracts', `id=$1`, [demoContractId]],
    ['contract_scope_items', 'contract_scope_items', `contract_id=$1`, [demoContractId]],
    ['project_milestones', 'project_milestones', `project_id=$1`, [demoProjectId]],
    ['findings', 'findings', `contract_id=$1`, [demoContractId]],
    ['work_orders', 'work_orders', `contract_id=$1`, [demoContractId]],
    ['time_entries', 'time_entries', `work_order_id=ANY($1::uuid[])`, [workIds]],
    ['invoices', 'invoices', `customer_id=$1 AND number LIKE 'DEMO-FAC-%'`, [demoCustomerId]],
  ];
  for (const [entity, table, where, params] of auditScopes) {
    const rows = await pool.query<{id: string}>(`SELECT id FROM ${table} WHERE data_origin='SYNTHETIC' AND ${where}`, params);
    for (const row of rows.rows) await audit('UPSERT_SYNTHETIC', entity, row.id, { data_origin: 'SYNTHETIC' });
  }
  console.log(`Semilla demo lista: 76 activos asignados con auditoría, 2 clientes, 8 usuarios, 1 contrato, 5 hallazgos/OT y 15 horas. Contraseña configurada sin mostrarla.`);
}

try {
  if (reset) await resetSynthetic();
  else await seed();
} finally {
  await pool.end();
}

