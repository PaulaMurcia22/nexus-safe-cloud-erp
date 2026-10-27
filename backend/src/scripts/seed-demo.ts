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
    const tables=['clients','sites','projects','users','service_contracts','contract_scope_items','findings','work_orders','time_entries','project_milestones','invoices'];
    const counts=await Promise.all(tables.map(async(table)=>[table,(await pool.query(`SELECT count(*)::int AS n FROM ${table} WHERE data_origin='SYNTHETIC'`)).rows[0].n] as const));
    console.log(`Dry-run de reinicio: ${counts.map(([table,count])=>`${table}=${count}`).join(', ')}; no se modificó la base.`);
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const manualDependencies=await client.query(`SELECT COUNT(*)::int AS count FROM (
      SELECT id FROM service_contracts WHERE data_origin<>'SYNTHETIC' AND (customer_id=$1 OR site_id=$2)
      UNION ALL SELECT id FROM projects WHERE data_origin<>'SYNTHETIC' AND customer_id=$1
      UNION ALL SELECT id FROM findings WHERE data_origin<>'SYNTHETIC' AND contract_id=$3
      UNION ALL SELECT id FROM work_orders WHERE data_origin<>'SYNTHETIC' AND (customer_id=$1 OR site_id=$2 OR contract_id=$3 OR project_id=$4)
      UNION ALL SELECT id FROM invoices WHERE data_origin<>'SYNTHETIC' AND customer_id=$1
      UNION ALL SELECT id FROM contract_scope_items WHERE data_origin<>'SYNTHETIC' AND contract_id=$3
      UNION ALL SELECT m.id FROM project_milestones m JOIN projects p ON p.id=m.project_id WHERE m.data_origin<>'SYNTHETIC' AND p.id=$4
    ) dependencies`,[demoCustomerId,demoSiteId,demoContractId,demoProjectId]);
    if(manualDependencies.rows[0].count>0)throw new Error('El reinicio se detuvo: hay filas no sintéticas que dependen de registros demo. No se modificó la base.');
    const importedTables=['import_batches','import_issues','network_assets','network_links','asset_controls','asset_interfaces','asset_ip_addresses','dhcp_pools','vlans','asset_vlan_membership','monitoring_technologies','monitoring_signal_catalog','catalog_type_mapping'];
    const importedBefore=new Map<string,number>();
    for(const table of importedTables){const hasOrigin=['vlans','asset_vlan_membership','monitoring_signal_catalog','catalog_type_mapping','clients','projects'].includes(table);const where=hasOrigin?` WHERE data_origin='IMPORTED'`:'';const result=await client.query(`SELECT count(*)::int AS n FROM ${table}${where}`);importedBefore.set(table,result.rows[0].n);}
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
    for(const table of importedTables){const hasOrigin=['vlans','asset_vlan_membership','monitoring_signal_catalog','catalog_type_mapping'].includes(table);const where=hasOrigin?` WHERE data_origin='IMPORTED'`:'';const result=await client.query(`SELECT count(*)::int AS n FROM ${table}${where}`);if(result.rows[0].n!==importedBefore.get(table))throw new Error(`El conteo importado cambió en ${table}; se revierte el reinicio.`);}
    await client.query('COMMIT');
    console.log(`Filas sintéticas eliminadas; asignaciones limpiadas con auditoría. Conteos importados antes/después conservados: ${[...importedBefore].map(([table,count])=>`${table}=${count}`).join(', ')}.`);
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
  const workOwners: string[] = [];
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
    workOwners.push(technicianIds[index % 2]);
  }

  const customerIds = [demoCustomerId, stableId(103), stableId(104), stableId(105), stableId(106)];
  const siteIds = [demoSiteId, stableId(202), stableId(203), stableId(204), stableId(205)];
  const projectIds = [demoProjectId, stableId(302), stableId(303), stableId(304), stableId(305)];
  const contractIds = [demoContractId, stableId(402), stableId(403), stableId(404), stableId(405)];
  const orderTitles = [
    'Revisión preventiva de conectividad', 'Ajuste de reglas de firewall', 'Validación de respaldos de configuración',
    'Revisión de capacidad de enlaces', 'Atención de alerta de monitoreo', 'Actualización de documentación de red',
    'Verificación de segmentación de VLAN', 'Prueba de continuidad del servicio', 'Revisión de acceso administrativo',
    'Ajuste de umbrales de monitoreo', 'Diagnóstico de pérdida de paquetes', 'Mantenimiento preventivo de infraestructura',
    'Revisión de inventario y ciclo de vida', 'Validación de cambios operativos', 'Cierre de informe mensual',
  ];
  const workStatuses = ['COMPLETED', 'IN_PROGRESS', 'OPEN', 'COMPLETED', 'BLOCKED'] as const;
  for (let index = 0; index < orderTitles.length; index++) {
    const account = (index % 4) + 1;
    const id = stableId(800 + index);
    const assigned = technicianIds[index % 2];
    const status = workStatuses[index % workStatuses.length];
    await pool.query(
      `INSERT INTO work_orders(id,code,customer_id,site_id,contract_id,project_id,assigned_user_id,title,description,status,estimated_hours,billable,data_origin)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true,'SYNTHETIC')
       ON CONFLICT(id) DO UPDATE SET customer_id=EXCLUDED.customer_id,site_id=EXCLUDED.site_id,contract_id=EXCLUDED.contract_id,
         project_id=EXCLUDED.project_id,assigned_user_id=EXCLUDED.assigned_user_id,title=EXCLUDED.title,description=EXCLUDED.description,
         status=EXCLUDED.status,estimated_hours=EXCLUDED.estimated_hours,billable=true,data_origin='SYNTHETIC',updated_at=now()`,
      [id, `DEMO-OT-2026-${String(index + 6).padStart(3, '0')}`, customerIds[account], siteIds[account], contractIds[account], projectIds[account], assigned,
        orderTitles[index], 'Orden sintética de operación administrada; no representa un incidente real confirmado.', status, index % 2 ? 12 : 8],
    );
    workIds.push(id);
    workOwners.push(assigned);
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

  // Registros sintéticos distribuidos en los meses del año para mostrar tendencia y carga operativa.
  for (let index = 0; index < 120; index++) {
    const month = index % 10;
    const day = 5 + Math.floor(index / 10);
    const date = new Date(Date.UTC(2026, month, day));
    const orderIndex = index % workIds.length;
    await pool.query(
      `INSERT INTO time_entries(id,work_order_id,user_id,entry_date,hours,description,data_origin)
       VALUES($1,$2,$3,$4,$5,$6,'SYNTHETIC')
       ON CONFLICT(id) DO UPDATE SET work_order_id=EXCLUDED.work_order_id,user_id=EXCLUDED.user_id,entry_date=EXCLUDED.entry_date,
         hours=EXCLUDED.hours,description=EXCLUDED.description,data_origin='SYNTHETIC'`,
      [stableId(2000 + index), workIds[orderIndex], workOwners[orderIndex], date.toISOString().slice(0, 10), [1.5, 2, 3, 4][index % 4],
        `Registro sintético de horas para operación y soporte ${date.toISOString().slice(0, 7)}.`],
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

  for (let month = 1; month <= 10; month++) {
      const issueDate = new Date(Date.UTC(2026, month, month === 10 ? 26 : 0));
      const daysInMonth = issueDate.getUTCDate();
    const dueDate = new Date(Date.UTC(2026, month, 15));
    for (let projectIndex = 0; projectIndex < projectIds.length; projectIndex++) {
      const milestoneId = stableId(1100 + projectIndex * 20 + month);
      const invoiceId = stableId(1300 + projectIndex * 20 + month);
      const invoiceNumber = `DEMO-2026-${String(projectIndex + 1).padStart(2, '0')}-${String(month).padStart(2, '0')}`;
      const shouldBePaid = month < 10 && (month + projectIndex) % 4 < 2;
      const paidAt = shouldBePaid ? new Date(Date.UTC(2026, month - 1, Math.min(20, daysInMonth), 16, 0, 0)).toISOString() : null;
      const subtotal = [1500000, 3200000, 3850000, 2300000, 2750000][projectIndex];
      await pool.query(
        `INSERT INTO invoices(id,customer_id,milestone_id,number,issue_date,due_date,subtotal,tax_rate,total,status,paid_at,e_invoice_status,data_origin)
         VALUES($1,$2,$3,$4,$5,$6,$7,0,$7,$8,$9,'SIMULATED_ACCEPTED','SYNTHETIC')
         ON CONFLICT(id) DO UPDATE SET customer_id=EXCLUDED.customer_id,milestone_id=EXCLUDED.milestone_id,number=EXCLUDED.number,
           issue_date=EXCLUDED.issue_date,due_date=EXCLUDED.due_date,subtotal=EXCLUDED.subtotal,total=EXCLUDED.total,
           status=EXCLUDED.status,paid_at=EXCLUDED.paid_at,e_invoice_status=EXCLUDED.e_invoice_status,data_origin='SYNTHETIC',updated_at=now()`,
        [invoiceId, customerIds[projectIndex], milestoneId, invoiceNumber, issueDate.toISOString().slice(0, 10), dueDate.toISOString().slice(0, 10), subtotal, shouldBePaid ? 'PAID' : 'ISSUED', paidAt],
      );
    }
  }

  const auditScopes: Array<[string, string, string, unknown[]]> = [
    ['users', 'users', `email LIKE '%@nexus.demo.invalid'`, []],
    ['clients', 'clients', `data_origin='SYNTHETIC'`, []],
    ['sites', 'sites', `data_origin='SYNTHETIC'`, []],
    ['projects', 'projects', `data_origin='SYNTHETIC'`, []],
    ['service_contracts', 'service_contracts', `data_origin='SYNTHETIC'`, []],
    ['contract_scope_items', 'contract_scope_items', `contract_id=$1`, [demoContractId]],
    ['project_milestones', 'project_milestones', `data_origin='SYNTHETIC'`, []],
    ['findings', 'findings', `contract_id=$1`, [demoContractId]],
    ['work_orders', 'work_orders', `data_origin='SYNTHETIC'`, []],
    ['time_entries', 'time_entries', `data_origin='SYNTHETIC'`, []],
    ['invoices', 'invoices', `data_origin='SYNTHETIC'`, []],
  ];
  for (const [entity, table, where, params] of auditScopes) {
    const rows = await pool.query<{id: string}>(`SELECT id FROM ${table} WHERE data_origin='SYNTHETIC' AND ${where}`, params);
    for (const row of rows.rows) await audit('UPSERT_SYNTHETIC', entity, row.id, { data_origin: 'SYNTHETIC' });
  }
  console.log(`Semilla demo lista: 76 activos asignados con auditoría; clientes, proyectos, contratos y facturación sintéticos distribuidos entre enero y octubre de 2026; 8 usuarios, hallazgos, órdenes y horas de soporte. Contraseña configurada sin mostrarla.`);
}

try {
  if (reset) await resetSynthetic();
  else await seed();
} finally {
  await pool.end();
}

