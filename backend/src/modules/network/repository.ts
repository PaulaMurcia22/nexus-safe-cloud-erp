import { pool } from '../../config/database.js';
import type { QueryResultRow } from 'pg';

export async function query<T extends QueryResultRow = QueryResultRow>(sql: string, values: unknown[] = []) {
  return pool.query<T>(sql, values);
}

export const assetSelect = `SELECT a.*, a.serial_normalized AS serial_number, a.serial_normalized AS "serialNumber", a.category AS asset_type, a.category AS "assetType", a.name AS hostname, a.sys_name AS system_name, s.name AS site_name, s.name AS "siteName", c.legal_name AS "clientName", p.name AS "projectName", (SELECT string_agg(ip::text, '; ') FROM asset_ip_addresses WHERE asset_id=a.id) AS "ipAddress", (SELECT string_agg(mac, '; ') FROM asset_mac_addresses WHERE asset_id=a.id) AS "macAddress" FROM network_assets a LEFT JOIN sites s ON s.id=a.site_id LEFT JOIN clients c ON c.id=a.customer_id LEFT JOIN projects p ON p.id=a.project_id`;
export async function listAssets(filters: { page:number; pageSize:number; search?:string; siteId?:string; status?:string; assetType?:string; criticality?:string; customerId?:string; unassigned?:boolean }) {
  const clauses:string[]=[]; const values:unknown[]=[];
  if(filters.search){values.push(`%${filters.search}%`);clauses.push(`(a.serial_normalized ILIKE $${values.length} OR a.serial_raw ILIKE $${values.length} OR a.name ILIKE $${values.length} OR a.sys_name ILIKE $${values.length} OR a.model ILIKE $${values.length})`);}
  for(const [key,col] of [['siteId','site_id'],['status','status'],['assetType','category'],['criticality','criticality'],['customerId','customer_id']] as const){const v=filters[key];if(v){values.push(v);clauses.push(`a.${col}=$${values.length}`);}}
  if(filters.unassigned){clauses.push(`a.site_id IS NULL AND a.customer_id IS NULL AND a.project_id IS NULL`);}
  const where=clauses.length?`WHERE ${clauses.join(' AND ')}`:'';
  const count=await query<{count:string}>(`SELECT count(*)::text AS count FROM network_assets a ${where}`,values);
  values.push(filters.pageSize,(filters.page-1)*filters.pageSize);
  const rows=await query(`${assetSelect} ${where} ORDER BY a.updated_at DESC NULLS LAST, a.id LIMIT $${values.length-1} OFFSET $${values.length}`,values);
  return {items:rows.rows,total:Number(count.rows[0]?.count??0),page:filters.page,pageSize:filters.pageSize};
}
export async function getAsset(id:string){return (await query(`${assetSelect} WHERE a.id=$1`,[id])).rows[0];}
export async function tableRows(table:string, order='created_at DESC'){return (await query(`SELECT * FROM ${table} ORDER BY ${order}`)).rows;}
