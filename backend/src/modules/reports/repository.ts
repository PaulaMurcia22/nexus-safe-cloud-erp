import {pool} from '../../config/database.js';
const queries={
  assets:`SELECT serial_normalized AS serial,name,category,criticality,status,site_id,customer_id,data_origin FROM network_assets ORDER BY name`,
  findings:`SELECT f.kind,f.signal_key,f.severity,f.status,f.detected_at,a.name AS asset_name,f.data_origin FROM findings f JOIN network_assets a ON a.id=f.asset_id ORDER BY f.detected_at DESC`,
  receivables:`SELECT customer_name,invoice_count,days_0_30,days_31_60,days_61_90,days_over_90,not_due FROM v_receivables_aging ORDER BY customer_name`,
} as const;
export function report(resource:keyof typeof queries){return pool.query(queries[resource]);}
