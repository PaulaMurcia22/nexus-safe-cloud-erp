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
const runDate = new Date();
const runYear = runDate.getFullYear();
const runMonth = runDate.getMonth() + 1;
const dateString = (value: Date) => value.toISOString().slice(0, 10);
const demoCustomerId = '00000000-0000-4000-8000-000000000101';
const demoSiteId = '00000000-0000-4000-8000-000000000201';
const demoProjectId = '00000000-0000-4000-8000-000000000301';
const demoContractId = '00000000-0000-4000-8000-000000000401';
const demoActorId = '00000000-0000-4000-8000-000000000510';
const roles = ['ADMIN', 'MANAGEMENT', 'COMMERCIAL', 'FINANCE', 'IT_OPERATIONS', 'PMO', 'TECHNICIAN'] as const;
const demoPeople = [['Camila Restrepo','camila.restrepo'],['Valentina Rojas','valentina.rojas'],['Daniela Peña','daniela.pena'],['Laura Montoya','laura.montoya'],['Andrés Ospina','andres.ospina'],['Felipe Marín','felipe.marin'],['Juan Pablo Gómez','juan.gomez']] as const;
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
    const tables=['clients','sites','projects','users','service_contracts','contract_scope_items','findings','work_orders','time_entries','project_milestones','invoices','crm_opportunities','saas_subscriptions','suppliers','purchase_orders','expenses','hr_employees','journal_entries'];
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
      UNION ALL SELECT id FROM saas_subscriptions WHERE data_origin<>'SYNTHETIC' AND customer_id=$1
      UNION ALL SELECT id FROM crm_opportunities WHERE data_origin<>'SYNTHETIC' AND customer_id=$1
      UNION ALL SELECT id FROM purchase_orders WHERE data_origin<>'SYNTHETIC' AND supplier_id IN (SELECT id FROM suppliers WHERE data_origin='SYNTHETIC')
      UNION ALL SELECT id FROM expenses WHERE data_origin<>'SYNTHETIC' AND supplier_id IN (SELECT id FROM suppliers WHERE data_origin='SYNTHETIC')
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
    for (const table of ['journal_entries','hr_employees','invoices','expenses','purchase_orders','suppliers','saas_subscriptions','crm_opportunities','time_entries','work_orders','findings','contract_scope_items','project_milestones','service_contracts','projects','sites','clients','users']) {
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
    const [name,emailName] = demoPeople[index];
    const email = `${emailName}@nexus.example.com`;
    await pool.query(
      `INSERT INTO users(id,name,email,password_hash,role,status,data_origin)
       VALUES($1,$2,$3,$4,$5,'ACTIVE','SYNTHETIC')
       ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,email=EXCLUDED.email,password_hash=EXCLUDED.password_hash,role=EXCLUDED.role,status='ACTIVE',data_origin='SYNTHETIC'`,
      [id, name, email, hash, role],
    );
    userIds.set(role, id);
  }
  const secondTechId = stableId(518);
  await pool.query(
    `INSERT INTO users(id,name,email,password_hash,role,status,data_origin)
     VALUES($1,'Sebastián Ramírez','sebastian.ramirez@nexus.example.com',$2,'TECHNICIAN','ACTIVE','SYNTHETIC')
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
      [id, row.asset_id, demoContractId, row.control, row.criticality, `El inventario no registra configuración de ${row.control} para ${row.name}.`, JSON.stringify({ source: 'asset_controls', control_id: row.id })],
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
      [id, `NXS-OT-${runYear}-${String(index + 1).padStart(3, '0')}`, demoCustomerId, demoSiteId, demoContractId, findingIds[index], demoProjectId, technicianIds[index % 2], title,
        'Revisión operativa de una señal de configuración no registrada en el inventario.'],
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
      [id, `NXS-OT-${runYear}-${String(index + 6).padStart(3, '0')}`, customerIds[account], siteIds[account], contractIds[account], projectIds[account], assigned,
        orderTitles[index], 'Actividad de operación de la plataforma y continuidad de red.', status, index % 2 ? 12 : 8],
    );
    workIds.push(id);
    workOwners.push(assigned);
  }

  const anchor = new Date();
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
    const month = index % runMonth;
    const day = 5 + Math.floor(index / 10);
    const date = new Date(Date.UTC(runYear, month, day));
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

  const monthStart = new Date(Date.UTC(runYear, runMonth - 1, 1));
  const previousMonthEnd = new Date(Date.UTC(runYear, runMonth - 1, 0));
  const paidIssueDate = new Date(Date.UTC(runYear, runMonth - 1, Math.min(5, runDate.getDate())));
  const paidDate = new Date(Date.UTC(runYear, runMonth - 1, Math.min(18, runDate.getDate())));
  const overdueDueDate = new Date(Date.UTC(runYear, runMonth - 1, 0));
  const invoices = [
    { id: stableId(750), number: `NXS-FAC-${runYear}-001`, status: 'PAID', issued: dateString(paidIssueDate), due: dateString(new Date(Date.UTC(runYear, runMonth - 1, 20))), paid: dateString(paidDate) },
    { id: stableId(751), number: `NXS-FAC-${runYear}-002`, status: 'ISSUED', issued: dateString(runDate), due: dateString(new Date(Date.UTC(runYear, runMonth - 1, runDate.getDate() + 30))), paid: null },
    { id: stableId(752), number: `NXS-FAC-${runYear}-003`, status: 'ISSUED', issued: dateString(previousMonthEnd), due: dateString(overdueDueDate), paid: null },
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

  for (let month = 1; month <= runMonth; month++) {
      const daysInMonth = new Date(Date.UTC(runYear, month, 0)).getUTCDate();
      const issueDate = new Date(Date.UTC(runYear, month - 1, month === runMonth ? runDate.getDate() : daysInMonth));
    const dueDate = new Date(Date.UTC(runYear, month, 15));
    for (let projectIndex = 0; projectIndex < projectIds.length; projectIndex++) {
      const milestoneId = stableId(1100 + projectIndex * 20 + month);
      const invoiceId = stableId(1300 + projectIndex * 20 + month);
      const invoiceNumber = `NXS-RC-${runYear}-${String(projectIndex + 1).padStart(2, '0')}-${String(month).padStart(2, '0')}`;
      const shouldBePaid = month < runMonth && (month + projectIndex) % 4 < 2;
      const paidAt = shouldBePaid ? new Date(Date.UTC(runYear, month - 1, Math.min(20, daysInMonth), 16, 0, 0)).toISOString() : null;
      const subtotal = [1500000, 3200000, 3850000, 2300000, 2750000][projectIndex];
      await pool.query(
        `INSERT INTO invoices(id,customer_id,milestone_id,number,issue_date,due_date,subtotal,tax_rate,total,status,paid_at,e_invoice_status,data_origin)
         VALUES($1,$2,$3,$4,$5,$6,$7,0,$7,$8,$9,'SIMULATED_ACCEPTED','SYNTHETIC')
         ON CONFLICT(id) DO UPDATE SET customer_id=EXCLUDED.customer_id,milestone_id=EXCLUDED.milestone_id,number=EXCLUDED.number,
           issue_date=EXCLUDED.issue_date,due_date=EXCLUDED.due_date,subtotal=EXCLUDED.subtotal,total=EXCLUDED.total,
           status=EXCLUDED.status,paid_at=EXCLUDED.paid_at,e_invoice_status=EXCLUDED.e_invoice_status,data_origin='SYNTHETIC',updated_at=now()`,
        [invoiceId, customerIds[projectIndex], milestoneId, invoiceNumber, dateString(issueDate), dateString(dueDate), subtotal, shouldBePaid ? 'PAID' : 'ISSUED', paidAt],
      );
    }
  }

  const opportunities = [
    ['Nexus Observability – Grupo Salud','Observabilidad multisede','PROPOSAL',2400000,70,'PARTNER',103],
    ['Nexus CloudOps – Red Financiera','Automatización y telemetría cloud','NEGOTIATION',3850000,80,'REFERRAL',104],
    ['Nexus Network – Campus Universitario','Monitoreo de campus','QUALIFIED',1600000,45,'EVENT',105],
    ['Nexus Secure – Logística Cordillera','Alertas de seguridad y disponibilidad','PROPOSAL',2750000,60,'OUTBOUND',106],
    ['Nexus Essential – Pyme Norte','Monitoreo de red esencial','LEAD',299000,15,'WEBSITE',null],
    ['Nexus Enterprise – Operador Regional','Operación NOC multicliente','QUALIFIED',7200000,35,'PARTNER',null],
    ['Nexus CloudOps – Fintech Bogotá','Gestión de servicios y SLA','WON',1800000,100,'REFERRAL',104],
    ['Nexus Secure – Integrador Andino','Gestión de vulnerabilidades','LOST',1250000,0,'OTHER',null],
  ] as const;
  for (const [index, item] of opportunities.entries()) {
    const [companyName,title,stage,expectedMrr,probability,source,customerNumber]=item;
    const closeDate=dateString(new Date(Date.UTC(runYear,runMonth-1,Math.min(runDate.getDate()+20,28))));
    await pool.query(`INSERT INTO crm_opportunities(id,customer_id,company_name,title,stage,expected_mrr,probability,close_date,source,notes,data_origin)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'SYNTHETIC')
      ON CONFLICT(id) DO UPDATE SET customer_id=EXCLUDED.customer_id,company_name=EXCLUDED.company_name,title=EXCLUDED.title,
        stage=EXCLUDED.stage,expected_mrr=EXCLUDED.expected_mrr,probability=EXCLUDED.probability,close_date=EXCLUDED.close_date,
        source=EXCLUDED.source,notes=EXCLUDED.notes,data_origin='SYNTHETIC',updated_at=now()`,
    [stableId(4500+index),customerNumber===null?null:stableId(customerNumber),companyName,title,stage,expectedMrr,probability,closeDate,source,
      'Proyección comercial para la plataforma SaaS de observabilidad y operación de redes.']);
  }

  const plans=(await pool.query(`SELECT id,code,monthly_price,extra_seat_price,included_seats,annual_discount_pct,currency FROM saas_plans WHERE active=true`)).rows;
  const planByCode=new Map<string,typeof plans[number]>(plans.map(p=>[p.code,p]));
  const subscriptionSpecs=[
    {customer:101,plan:'ENTERPRISE',interval:'YEARLY',seats:35,status:'ACTIVE',startMonth:1},
    {customer:103,plan:'PROFESSIONAL',interval:'MONTHLY',seats:12,status:'ACTIVE',startMonth:2},
    {customer:104,plan:'ENTERPRISE',interval:'MONTHLY',seats:8,status:'ACTIVE',startMonth:3},
    {customer:105,plan:'ESSENTIAL',interval:'MONTHLY',seats:4,status:'PAST_DUE',startMonth:4},
    {customer:106,plan:'PROFESSIONAL',interval:'MONTHLY',seats:6,status:'TRIAL',startMonth:runMonth},
    {customer:102,plan:'ESSENTIAL',interval:'MONTHLY',seats:2,status:'CANCELED',startMonth:1},
  ] as const;
  for (const [index,spec] of subscriptionSpecs.entries()) {
    const plan=planByCode.get(spec.plan);
    if(!plan)throw new Error(`Falta el plan SaaS ${spec.plan}; aplica la migración 15 antes de sembrar.`);
    const monthlyValue=(Number(plan.monthly_price)+Math.max(0,spec.seats-Number(plan.included_seats))*Number(plan.extra_seat_price))*(spec.interval==='YEARLY'?1-Number(plan.annual_discount_pct)/100:1);
    const recurringAmount=spec.interval==='YEARLY'?monthlyValue*12:monthlyValue;
    const startsOn=dateString(new Date(Date.UTC(runYear,spec.startMonth-1,1)));
    const currentStart=spec.interval==='YEARLY'?`${runYear}-01-01`:`${runYear}-${String(runMonth).padStart(2,'0')}-01`;
    const periodEndDate=spec.status==='TRIAL'?new Date(Date.UTC(runYear,runMonth-1,runDate.getDate()+14)):
      spec.interval==='YEARLY'?new Date(Date.UTC(runYear+1,0,1)):new Date(Date.UTC(runYear,runMonth,1));
    const trialEnd=spec.status==='TRIAL'?dateString(periodEndDate):null;
    const periodEnd=spec.status==='PAST_DUE'?dateString(new Date(Date.UTC(runYear,runMonth-1,1))):dateString(periodEndDate);
    const nextRenewal=spec.status==='CANCELED'?null:spec.status==='PAST_DUE'?dateString(new Date(Date.UTC(runYear,runMonth-1,Math.max(1,runDate.getDate()-5)))):dateString(periodEndDate);
    const canceledAt=spec.status==='CANCELED'?new Date().toISOString():null;
    await pool.query(`INSERT INTO saas_subscriptions(id,customer_id,plan_id,code,billing_interval,status,seats,recurring_amount,monthly_value,currency,
        starts_on,trial_ends_on,current_period_start,current_period_end,next_renewal_on,canceled_at,notes,data_origin)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'SYNTHETIC')
      ON CONFLICT(id) DO UPDATE SET customer_id=EXCLUDED.customer_id,plan_id=EXCLUDED.plan_id,code=EXCLUDED.code,
        billing_interval=EXCLUDED.billing_interval,status=EXCLUDED.status,seats=EXCLUDED.seats,recurring_amount=EXCLUDED.recurring_amount,
        monthly_value=EXCLUDED.monthly_value,currency=EXCLUDED.currency,starts_on=EXCLUDED.starts_on,trial_ends_on=EXCLUDED.trial_ends_on,
        current_period_start=EXCLUDED.current_period_start,current_period_end=EXCLUDED.current_period_end,next_renewal_on=EXCLUDED.next_renewal_on,
        canceled_at=EXCLUDED.canceled_at,notes=EXCLUDED.notes,data_origin='SYNTHETIC',updated_at=now()`,
    [stableId(4700+index),stableId(spec.customer),plan.id,`NS-${runYear}-${String(index+1).padStart(3,'0')}`,spec.interval,spec.status,spec.seats,
      recurringAmount,monthlyValue,plan.currency,startsOn,trialEnd,currentStart,periodEnd,nextRenewal,canceledAt,
      'Suscripción a la plataforma SaaS de monitoreo y operación de redes.']);
  }

  const supplierSpecs=[
    ['Nube Andina S.A.S.','CLOUD_HOSTING','Servicios Cloud','nube-andina.example.com'],
    ['Seguridad Digital Colombia','SECURITY','Mesa de licencias','seguridaddigital.example.com'],
    ['Licencias Empresariales','SOFTWARE','Renovaciones SaaS','licencias.example.com'],
    ['Conectividad Empresarial','CONNECTIVITY','Atención corporativa','conectividad.example.com'],
  ] as const;
  for(const [index,[name,category,contactName,domain]] of supplierSpecs.entries()) await pool.query(`INSERT INTO suppliers(id,name,category,contact_name,email,website,payment_terms_days,status,data_origin)
      VALUES($1,$2,$3,$4,$5,$6,$7,'ACTIVE','SYNTHETIC')
      ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,category=EXCLUDED.category,contact_name=EXCLUDED.contact_name,
        email=EXCLUDED.email,website=EXCLUDED.website,payment_terms_days=EXCLUDED.payment_terms_days,status='ACTIVE',data_origin='SYNTHETIC',updated_at=now()`,
    [stableId(5000+index),name,category,contactName,`proveedores@${domain}`,`https://${domain}`,index%2===0?30:45]);

  const orderSpecs=[
    {supplier:0,status:'RECEIVED',ordered:new Date(Date.UTC(runYear,runMonth-2,10)),expectedOffset:20,description:'Capacidad de cómputo y almacenamiento para monitoreo',lines:[['Nodos de observabilidad',3,1850000],['Retención de métricas y respaldos',1,920000]]},
    {supplier:1,status:'APPROVED',ordered:new Date(Date.UTC(runYear,runMonth-1,3)),expectedOffset:25,description:'Renovación de herramientas de ciberseguridad',lines:[['Licencias de análisis',12,245000],['Protección de endpoints',25,78000]]},
    {supplier:2,status:'SUBMITTED',ordered:new Date(Date.UTC(runYear,runMonth-1,8)),expectedOffset:30,description:'Licencias de productividad y colaboración',lines:[['Licencia de administración',18,119000]]},
    {supplier:3,status:'DRAFT',ordered:runDate,expectedOffset:14,description:'Enlaces redundantes para ambientes de producción',lines:[['Enlace empresarial 500 Mbps',2,1450000]]},
  ] as const;
  for(const [index,order] of orderSpecs.entries()) {
    const id=stableId(5500+index),orderedOn=dateString(order.ordered),expectedOn=dateString(new Date(order.ordered.getTime()+order.expectedOffset*86400000));
    const subtotal=order.lines.reduce((sum,line)=>sum+line[1]*line[2],0),taxRate=19,total=subtotal*(1+taxRate/100);
    await pool.query(`INSERT INTO purchase_orders(id,order_number,supplier_id,description,ordered_on,expected_on,currency,subtotal,tax_rate,total,status,notes,requested_by,data_origin)
      VALUES($1,$2,$3,$4,$5,$6,'COP',$7,$8,$9,$10,$11,$12,'SYNTHETIC')
      ON CONFLICT(id) DO UPDATE SET supplier_id=EXCLUDED.supplier_id,description=EXCLUDED.description,ordered_on=EXCLUDED.ordered_on,
        expected_on=EXCLUDED.expected_on,subtotal=EXCLUDED.subtotal,tax_rate=EXCLUDED.tax_rate,total=EXCLUDED.total,status=EXCLUDED.status,
        notes=EXCLUDED.notes,requested_by=EXCLUDED.requested_by,data_origin='SYNTHETIC',updated_at=now()`,
    [id,`OC-${runYear}-${String(index+1).padStart(3,'0')}`,stableId(5000+order.supplier),order.description,orderedOn,expectedOn,subtotal,taxRate,total,
      order.status,'Compra operativa para infraestructura de la plataforma.',userIds.get('FINANCE')]);
    for(const [lineIndex,line] of order.lines.entries()) await pool.query(`INSERT INTO purchase_order_lines(id,purchase_order_id,description,quantity,unit_price)
      VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO UPDATE SET purchase_order_id=EXCLUDED.purchase_order_id,description=EXCLUDED.description,quantity=EXCLUDED.quantity,unit_price=EXCLUDED.unit_price`,
    [stableId(6000+index*10+lineIndex),id,line[0],line[1],line[2]]);
  }
  const expenseSpecs=[
    {supplier:0,description:'Consumo mensual de infraestructura cloud',category:'CLOUD_INFRASTRUCTURE',base:4200000},
    {supplier:1,description:'Licencias de seguridad y análisis',category:'SECURITY_TOOLS',base:1380000},
    {supplier:2,description:'Licencias de desarrollo y colaboración',category:'SOFTWARE_LICENSES',base:960000},
  ] as const;
  for(let month=1;month<=runMonth;month++) for(const [kind,expense] of expenseSpecs.entries()) {
    const index=(month-1)*expenseSpecs.length+kind;
    const expenseDate=dateString(new Date(Date.UTC(runYear,month-1,month===runMonth?Math.min(runDate.getDate(),28):24)));
    const status=month<runMonth?'PAID':kind===0?'APPROVED':'RECORDED';
    await pool.query(`INSERT INTO expenses(id,supplier_id,description,category,expense_date,currency,amount,status,payment_reference,notes,recorded_by,data_origin)
      VALUES($1,$2,$3,$4,$5,'COP',$6,$7,$8,$9,$10,'SYNTHETIC')
      ON CONFLICT(id) DO UPDATE SET supplier_id=EXCLUDED.supplier_id,description=EXCLUDED.description,category=EXCLUDED.category,
        expense_date=EXCLUDED.expense_date,amount=EXCLUDED.amount,status=EXCLUDED.status,payment_reference=EXCLUDED.payment_reference,
        notes=EXCLUDED.notes,recorded_by=EXCLUDED.recorded_by,data_origin='SYNTHETIC',updated_at=now()`,
    [stableId(7000+index),stableId(5000+expense.supplier),expense.description,expense.category,expenseDate,expense.base+month*18000,status,
      status==='PAID'?`PAG-${runYear}-${String(month).padStart(2,'0')}-${kind+1}`:null,
      `Costos de operación de la plataforma, periodo ${runYear}-${String(month).padStart(2,'0')}.`,userIds.get('FINANCE')]);
  }

  const employeeSpecs=[
    ['NX-0001','Camila Restrepo','Gerente general','Dirección','MEDELLIN','2022-02-14','FULL_TIME'],
    ['NX-0002','Valentina Rojas','Directora comercial','Comercial','BOGOTA','2022-06-06','FULL_TIME'],
    ['NX-0003','Daniela Peña','Líder de finanzas','Finanzas','MEDELLIN','2023-01-16','FULL_TIME'],
    ['NX-0004','Laura Montoya','Líder de producto','Producto e ingeniería','REMOTE_SHARED','2023-04-03','FULL_TIME'],
    ['NX-0005','Andrés Ospina','Ingeniero de plataforma','Operaciones cloud','MEDELLIN','2023-08-21','FULL_TIME'],
    ['NX-0006','Felipe Marín','Ingeniero de redes','Operaciones de red','BOGOTA','2024-02-12','FULL_TIME'],
    ['NX-0007','Juan Pablo Gómez','Analista de éxito del cliente','Customer Success','REMOTE_SHARED','2024-05-20','FULL_TIME'],
    ['NX-0008','Sebastián Ramírez','Especialista de soporte','Soporte técnico','MEDELLIN','2024-09-02','FIXED_TERM'],
  ] as const;
  for(const [index,e] of employeeSpecs.entries()) await pool.query(`INSERT INTO hr_employees(id,employee_number,full_name,work_email,job_title,department,office_location,start_date,status,contract_type,data_origin)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,'ACTIVE',$9,'SYNTHETIC')
    ON CONFLICT(id) DO UPDATE SET employee_number=EXCLUDED.employee_number,full_name=EXCLUDED.full_name,work_email=EXCLUDED.work_email,
      job_title=EXCLUDED.job_title,department=EXCLUDED.department,office_location=EXCLUDED.office_location,start_date=EXCLUDED.start_date,status='ACTIVE',contract_type=EXCLUDED.contract_type,data_origin='SYNTHETIC',updated_at=now()`,
    [stableId(9000+index),e[0],e[1],`${e[1].normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replaceAll(' ',' .').replaceAll('.','')}@nexus.example.com`,e[2],e[3],e[4],e[5],e[6]]);

  const accountIds=new Map<string,string>();
  for(const row of (await pool.query(`SELECT id,code FROM accounting_accounts WHERE code=ANY($1::text[])`,[['1000','1100','4000','5000','5100','5300']])).rows) accountIds.set(row.code,row.id);
  if(accountIds.size!==6)throw new Error('Faltan cuentas del plan contable; aplica la migración 17 antes de sembrar.');
  for(let month=1;month<=runMonth;month++){
    const date=dateString(new Date(Date.UTC(runYear,month-1,Math.min(28,month===runMonth?runDate.getDate():new Date(Date.UTC(runYear,month,0)).getUTCDate()))));
    const revenueId=stableId(10000+month),expenseId=stableId(10100+month);
    for(const [id,number,description,source] of [[revenueId,`AS-${runYear}${String(month).padStart(2,'0')}-ING`,`Reconocimiento mensual de ingresos recurrentes y servicios gestionados · ${runYear}-${String(month).padStart(2,'0')}`,'SUBSCRIPTION'],[expenseId,`AS-${runYear}${String(month).padStart(2,'0')}-COS`,`Costos de infraestructura, equipo y herramientas · ${runYear}-${String(month).padStart(2,'0')}`,'EXPENSE']] as const){
      await pool.query(`INSERT INTO journal_entries(id,entry_number,entry_date,description,status,source_type,created_by,posted_at,data_origin)
        VALUES($1,$2,$3,$4,'POSTED',$5,$6,$7,'SYNTHETIC')
        ON CONFLICT(id) DO UPDATE SET entry_date=EXCLUDED.entry_date,description=EXCLUDED.description,status='POSTED',source_type=EXCLUDED.source_type,posted_at=EXCLUDED.posted_at,data_origin='SYNTHETIC',updated_at=now()`,
      [id,number,date,description,source,userIds.get('FINANCE'),`${date}T17:00:00Z`]);
      await pool.query(`DELETE FROM journal_entry_lines WHERE journal_entry_id=$1`,[id]);
    }
    const revAmount=9200000+month*85000, cloud=3400000+month*22000, payroll=2850000, tools=1080000+month*12000;
    await pool.query(`INSERT INTO journal_entry_lines(journal_entry_id,account_id,description,debit,credit) VALUES
      ($1,$2,'Cuenta por cobrar del periodo',$3,0),($1,$4,'Ingreso recurrente SaaS y servicios',0,$3)`,[revenueId,accountIds.get('1100'),revAmount,accountIds.get('4000')]);
    await pool.query(`INSERT INTO journal_entry_lines(journal_entry_id,account_id,description,debit,credit) VALUES
      ($1,$2,'Infraestructura cloud',$3,0),($1,$4,'Servicios profesionales y equipo',$5,0),($1,$6,'Licencias de software y seguridad',$7,0),($1,$8,'Pago a proveedores y nómina',0,$9)`,
      [expenseId,accountIds.get('5000'),cloud,accountIds.get('5100'),payroll,accountIds.get('5300'),tools,accountIds.get('1000'),cloud+payroll+tools]);
  }

  const auditScopes: Array<[string, string, string, unknown[]]> = [
    ['users', 'users', `email LIKE '%@nexus.example.com'`, []],
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
    ['crm_opportunities','crm_opportunities',`data_origin='SYNTHETIC'`,[]],
    ['saas_subscriptions','saas_subscriptions',`data_origin='SYNTHETIC'`,[]],
    ['suppliers','suppliers',`data_origin='SYNTHETIC'`,[]],
    ['purchase_orders','purchase_orders',`data_origin='SYNTHETIC'`,[]],
    ['expenses','expenses',`data_origin='SYNTHETIC'`,[]],
    ['hr_employees','hr_employees',`data_origin='SYNTHETIC'`,[]],
    ['journal_entries','journal_entries',`data_origin='SYNTHETIC'`,[]],
  ];
  for (const [entity, table, where, params] of auditScopes) {
    const rows = await pool.query<{id: string}>(`SELECT id FROM ${table} WHERE data_origin='SYNTHETIC' AND ${where}`, params);
    for (const row of rows.rows) await audit('UPSERT_SYNTHETIC', entity, row.id, { data_origin: 'SYNTHETIC' });
  }
  console.log(`Semilla demo lista: 76 activos asignados con auditoría; clientes, proyectos, contratos y facturación del SaaS generados desde enero hasta ${runYear}-${String(runMonth).padStart(2, '0')}; 8 usuarios, hallazgos, órdenes y horas de soporte. Contraseña configurada sin mostrarla.`);
}

try {
  if (reset) await resetSynthetic();
  else await seed();
} finally {
  await pool.end();
}

