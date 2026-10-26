import { query, listAssets, getAsset } from './repository.js';
import { validateCustomFieldValues } from './custom-field-validation.js';
import {audit as writeAudit} from '../../shared/audit.js';

type Actor={id:string;role:string};
const normalizeSerial=(value:unknown)=>String(value).trim().replace(/\s+/g,'').replace(/-+$/g,'').toUpperCase();
async function audit(actor:Actor, action:string, entityType:string, entityId:string, before:unknown=null, after:unknown={}) {
  await writeAudit(actor.id,action,entityType,entityId,before,after);
}
export async function createAsset(input:Record<string,unknown>,actor:Actor){
  const serial=String(input.serialNumber).trim();const manualKeys=['serial_raw','name','category',...(input.model!==undefined?['model']:[]),...(input.vendor!==undefined?['role']:[])];const r=await query(`INSERT INTO network_assets (serial_raw,serial_normalized,name,category,model,role,status,site_id,customer_id,project_id,extra,manual_overrides,created_by,updated_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb,$13,$13) RETURNING *`,[serial,normalizeSerial(serial),input.hostname??serial,input.assetType,input.model??null,input.vendor??null,input.status??'ACTIVE',input.siteId??null,input.customerId??null,input.projectId??null,JSON.stringify(input.notes?{notes:input.notes}:{}),JSON.stringify(Object.fromEntries(manualKeys.map(key=>[key,true]))),actor.id]);
  await audit(actor,'CREATE','network_asset',r.rows[0].id,null,r.rows[0]); return r.rows[0];
}
export async function updateAsset(id:string,input:Record<string,unknown>,actor:Actor){
  const mapping:Record<string,string>={serialNumber:'serial_raw',assetType:'category',vendor:'role',model:'model',hostname:'name',status:'status',siteId:'site_id',customerId:'customer_id',projectId:'project_id'};
  const entries=Object.entries(input).filter(([k])=>mapping[k]);const extraData=Object.fromEntries(['notes','vlanId'].filter(k=>input[k]!==undefined).map(k=>[k,input[k]]));if(!entries.length&&!Object.keys(extraData).length)return getAsset(id);
  const sets=entries.flatMap(([k],i)=>k==='serialNumber'?[`serial_raw=$${i+2}`,`serial_normalized=$${i+entries.length+2}`]:[`${mapping[k]}=$${i+2}`]).join(', ');
  const vals=entries.map(([k,v])=>k==='serialNumber'?String(v):v);const serial=entries.find(([k])=>k==='serialNumber')?.[1];if(serial!==undefined)vals.push(normalizeSerial(serial));
  const allSets=[sets].filter(Boolean);if(Object.keys(extraData).length){vals.push(JSON.stringify(extraData));allSets.push(`extra=COALESCE(extra,'{}'::jsonb)||$${vals.length+1}::jsonb`);}
  const sourceManagedKeys=entries.flatMap(([key])=>({serialNumber:['serial_raw'],assetType:['category'],vendor:['role'],model:['model'],hostname:['name']}[key]??[]));
  if(sourceManagedKeys.length){vals.push(JSON.stringify(Object.fromEntries(sourceManagedKeys.map(key=>[key,true]))));allSets.push(`manual_overrides=COALESCE(manual_overrides,'{}'::jsonb)||$${vals.length+1}::jsonb`);}
  const before=await getAsset(id);const r=await query(`UPDATE network_assets SET ${allSets.join(', ')},updated_at=NOW(),updated_by=$${vals.length+2} WHERE id=$1 AND status='ACTIVE' RETURNING *`,[id,...vals,actor.id]);
  if(r.rowCount){await audit(actor,'UPDATE','network_asset',id,before,r.rows[0]);} return r.rows[0];
}
export async function bulkAssign(input:{filter:{siteId?:string;status?:string;assetType?:string;unassigned:boolean};assignment:Record<string,unknown>},actor:Actor){
  const filters:string[]=[`status='ACTIVE'`];const params:unknown[]=[];
  if(input.filter.unassigned)filters.push('site_id IS NULL AND customer_id IS NULL AND project_id IS NULL');
  for(const [k,c] of [['siteId','site_id'],['status','status'],['assetType','category']] as const){const v=input.filter[k];if(v){params.push(v);filters.push(`${c}=$${params.length}`);}}
  const beforeRows=await query<{id:string;site_id:string|null;customer_id:string|null;project_id:string|null}>(`SELECT id,site_id,customer_id,project_id FROM network_assets WHERE ${filters.join(' AND ')}`,params);
  const sets:string[]=[];const assignedKeys:string[]=[];for(const [k,c] of [['siteId','site_id'],['customerId','customer_id'],['projectId','project_id']] as const){if(k in input.assignment){params.push(input.assignment[k]??null);sets.push(`${c}=$${params.length}`);assignedKeys.push(c);}}
  if(assignedKeys.length){params.push(JSON.stringify(Object.fromEntries(assignedKeys.map(key=>[key,true]))));sets.push(`manual_overrides=COALESCE(manual_overrides,'{}'::jsonb)||$${params.length}::jsonb`);}
  params.push(actor.id);
  const result=await query(`UPDATE network_assets SET ${sets.join(', ')},updated_at=NOW(),updated_by=$${params.length} WHERE ${filters.join(' AND ')} RETURNING id,site_id,customer_id,project_id`,params);
  const prior=new Map(beforeRows.rows.map((row:{id:string})=>[row.id,row]));for(const row of result.rows)await audit(actor,'BULK_ASSIGN','network_asset',row.id,prior.get(row.id)??null,row);
  return {updated:result.rowCount??0,assetIds:result.rows.map(r=>r.id)};
}
export async function retire(entity:'network_assets'|'network_links'|'dhcp_pools',id:string,actor:Actor){
  const type=entity==='network_assets'?'network_asset':entity==='network_links'?'network_link':'dhcp_pool';
  const statement=entity==='network_assets'?`UPDATE network_assets SET status='RETIRED',updated_at=NOW(),updated_by=$2 WHERE id=$1 AND status='ACTIVE' RETURNING id,status`:entity==='network_links'?`UPDATE network_links SET extra=COALESCE(extra,'{}'::jsonb)||jsonb_build_object('retired_at',NOW()) WHERE id=$1 AND NOT (extra ? 'retired_at') RETURNING id`:`UPDATE dhcp_pools SET active=FALSE WHERE id=$1 AND active=TRUE RETURNING id,active`;
  const before=entity==='network_assets'?await getAsset(id):await query(`SELECT * FROM ${entity} WHERE id=$1`,[id]).then(x=>x.rows[0]);const r=await query(statement,entity==='network_assets'?[id,actor.id]:[id]);
  if(r.rowCount)await audit(actor,'RETIRE',type,id,before,r.rows[0]); return r.rows[0];
}
export async function setExtraValues(assetId:string,values:Record<string,unknown>,actor:Actor){
  const defs=await query<{field_key:string;field_type:string;options:string[]|null;active:boolean}>(`SELECT field_key,field_type,options,active FROM custom_field_definitions WHERE entity='network_asset' AND active=true`);
  const old=await query<{extra:Record<string,unknown>}>(`SELECT extra FROM network_assets WHERE id=$1`,[assetId]);const current=old.rows[0]?.extra??{};
  validateCustomFieldValues(defs.rows,values,current);
  const before=await getAsset(assetId);const r=await query(`UPDATE network_assets SET extra=COALESCE(extra,'{}'::jsonb)||$2::jsonb,updated_at=NOW(),updated_by=$3 WHERE id=$1 AND status='ACTIVE' RETURNING id,extra`,[assetId,JSON.stringify(values),actor.id]);
  if(r.rowCount)await audit(actor,'UPDATE_EXTRA_VALUES','network_asset',assetId,before,r.rows[0]);return r.rows[0];
}
export async function createCustomField(input:Record<string,unknown>,actor:Actor){
  const r=await query(`INSERT INTO custom_field_definitions (entity,field_key,label,field_type,options,required,active) VALUES ('network_asset',$1,$2,$3,$4::jsonb,$5,$6) RETURNING *`,[input.key,input.label,input.valueType,JSON.stringify(input.options??[]),input.required??false,input.active??true]);
  await audit(actor,'CREATE','network_custom_field_definition',r.rows[0].id,null,r.rows[0]);return r.rows[0];
}
