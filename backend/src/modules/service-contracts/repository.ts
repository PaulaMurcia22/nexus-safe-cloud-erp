import { pool } from '../../config/database.js';

export const listContracts = (customerId?:string) => pool.query(
  `SELECT c.*,cl.legal_name AS customer_name,s.name AS site_name FROM service_contracts c
   JOIN clients cl ON cl.id=c.customer_id LEFT JOIN sites s ON s.id=c.site_id
   WHERE ($1::uuid IS NULL OR c.customer_id=$1) ORDER BY c.created_at DESC`, [customerId ?? null],
);
export const contractDetail = (id:string) => pool.query(
  `SELECT c.*,cl.legal_name AS customer_name,s.name AS site_name FROM service_contracts c
   JOIN clients cl ON cl.id=c.customer_id LEFT JOIN sites s ON s.id=c.site_id WHERE c.id=$1`, [id],
);
export const overview = async (id:string) => {
  const [customer,sites,assets,contracts,projects,findings,receivables] = await Promise.all([
    pool.query(`SELECT * FROM clients WHERE id=$1`,[id]),
    pool.query(`SELECT * FROM sites WHERE customer_id=$1 ORDER BY name`,[id]),
    pool.query(`SELECT category,criticality,COUNT(*)::int AS count FROM network_assets WHERE customer_id=$1 AND status='ACTIVE' GROUP BY category,criticality`,[id]),
    pool.query(`SELECT * FROM service_contracts WHERE customer_id=$1 ORDER BY created_at DESC`,[id]),
    pool.query(`SELECT * FROM projects WHERE customer_id=$1 ORDER BY created_at DESC`,[id]),
    pool.query(`SELECT f.*,a.name AS asset_name FROM findings f JOIN network_assets a ON a.id=f.asset_id WHERE a.customer_id=$1 AND f.status IN ('OPEN','ACKNOWLEDGED','IN_PROGRESS') ORDER BY f.severity,f.detected_at DESC`,[id]),
    pool.query(`SELECT * FROM v_receivables_aging WHERE customer_id=$1`,[id]),
  ]);
  return {customer:customer.rows[0],sites:sites.rows,assets:assets.rows,contracts:contracts.rows,projects:projects.rows,openFindings:findings.rows,receivables:receivables.rows[0]??null};
};
