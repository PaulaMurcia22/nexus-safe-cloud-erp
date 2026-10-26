import {pool} from '../../config/database.js';
import {audit} from '../../shared/audit.js';

export async function generate(contractId:string,actorId:string){
  const c=await pool.query(`SELECT id FROM service_contracts WHERE id=$1 AND status='ACTIVE'`,[contractId]);
  if(!c.rowCount)throw Object.assign(new Error('Contrato activo no encontrado.'),{status:404});
  const controls=await pool.query(`SELECT a.id AS asset_id,a.criticality,ac.control AS signal_key,'CONTROL_MISSING' AS kind
    FROM contract_scope_items scope JOIN network_assets a ON a.id=scope.asset_id
    JOIN asset_controls ac ON ac.asset_id=a.id AND ac.control=scope.signal_key
    WHERE scope.contract_id=$1 AND scope.included=true AND ac.status='NOT_DETECTED' AND a.status='ACTIVE'`,[contractId]);
  const links=await pool.query(`SELECT COALESCE(l.source_asset_id,l.target_asset_id) AS asset_id,a.criticality,l.id AS link_id
    FROM network_links l JOIN network_assets a ON a.id=COALESCE(l.source_asset_id,l.target_asset_id)
    WHERE l.functional=false AND a.status='ACTIVE' AND EXISTS(
      SELECT 1 FROM contract_scope_items scope WHERE scope.contract_id=$1 AND scope.asset_id=a.id AND scope.included=true)`,[contractId]);
  const gaps=await pool.query(`SELECT a.id AS asset_id,a.criticality,'ASSET_DATA_GAP' AS kind,'IP_OR_SERIAL' AS signal_key
    FROM network_assets a WHERE a.status='ACTIVE' AND a.customer_id=(SELECT customer_id FROM service_contracts WHERE id=$1)
    AND EXISTS(SELECT 1 FROM contract_scope_items scope WHERE scope.contract_id=$1 AND scope.asset_id=a.id AND scope.included=true)
    AND (NOT EXISTS(SELECT 1 FROM asset_ip_addresses i WHERE i.asset_id=a.id) OR COALESCE(a.serial_normalized,'')='')`,[contractId]);
  let created=0;
  for(const row of [...controls.rows,...gaps.rows]){
    const result=await pool.query(`INSERT INTO findings(asset_id,contract_id,kind,signal_key,severity,description,data_origin)
      VALUES($1,$2,$3,$4,$5,$6,'IMPORTED')
      ON CONFLICT(asset_id,kind,signal_key) WHERE status IN ('OPEN','ACKNOWLEDGED','IN_PROGRESS') DO NOTHING RETURNING id`,
      [row.asset_id,contractId,row.kind,row.signal_key,row.criticality,row.kind==='CONTROL_MISSING'?`El control ${row.signal_key} no aparece configurado en el inventario importado.`:'Falta IP o serial normalizado en el inventario importado.']);
    created+=result.rowCount??0;
    if(result.rowCount)await audit(actorId,'GENERATE','finding',result.rows[0].id,null,{...row,contractId,data_origin:'IMPORTED'});
  }
  for(const row of links.rows){
    const result=await pool.query(`INSERT INTO findings(asset_id,contract_id,kind,signal_key,severity,description,data_origin,extra)
      VALUES($1,$2,'LINK_NON_FUNCTIONAL',$3,$4,'Enlace marcado no funcional en el inventario importado.','IMPORTED',$5::jsonb)
      ON CONFLICT(asset_id,kind,signal_key) WHERE status IN ('OPEN','ACKNOWLEDGED','IN_PROGRESS') DO NOTHING RETURNING id`,
      [row.asset_id,contractId,`LINK:${row.link_id}`,row.criticality,JSON.stringify({linkId:row.link_id})]);
    created+=result.rowCount??0;
    if(result.rowCount)await audit(actorId,'GENERATE','finding',result.rows[0].id,null,{...row,contractId,data_origin:'IMPORTED'});
  }
  return {created,source:'imported_configuration'};
}
export async function updateStatus(id:string,status:string,actorId:string){const before=await pool.query(`SELECT * FROM findings WHERE id=$1`,[id]);if(!before.rowCount)return null;const after=await pool.query(`UPDATE findings SET status=$2,updated_at=now() WHERE id=$1 RETURNING *`,[id,status]);await audit(actorId,'UPDATE_STATUS','finding',id,before.rows[0],after.rows[0]);return after.rows[0];}
export async function createWorkOrder(id:string,actorId:string){const finding=await pool.query(`SELECT f.*,a.customer_id,s.id AS site_id FROM findings f JOIN network_assets a ON a.id=f.asset_id LEFT JOIN service_contracts sc ON sc.id=f.contract_id LEFT JOIN sites s ON s.id=sc.site_id WHERE f.id=$1`,[id]);if(!finding.rowCount)return null;const f=finding.rows[0];const result=await pool.query(`INSERT INTO work_orders(code,customer_id,site_id,contract_id,finding_id,title,description,data_origin)
  VALUES($1,$2,$3,$4,$5,$6,$7,'MANUAL') RETURNING *`,[`OT-${Date.now()}-${id.slice(0,6)}`,f.customer_id,f.site_id,f.contract_id,id,`Atender ${f.kind}: ${f.signal_key}`,f.description]);await audit(actorId,'CREATE','work_order',result.rows[0].id,null,result.rows[0]);return result.rows[0];}
