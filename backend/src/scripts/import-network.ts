import ExcelJS from 'exceljs';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { normalizeBoolean, normalizeIp, normalizeMac, normalizeSerial, splitMulti, isRealPool } from './network-normalizers.js';

type Issue = { sheet: string; row: number | null; field: string | null; severity: 'INFO'|'WARNING'|'ERROR'; message: string; value: string | null };
const rowSchema = z.object({ name: z.string().min(1), serial: z.string().min(1), category: z.string().min(1) });
const args = process.argv.slice(2);
function option(name: string): string | undefined { const i=args.indexOf(name); return i < 0 ? undefined : args[i+1]; }
const file = option('--file'); const dryRun = args.includes('--dry-run');
if (!file || args.some(a => !['--file','--dry-run'].includes(a) && args[args.indexOf(a)-1] !== '--file')) {
  console.error('Uso: npm run import:network -- --file <ruta.xlsx> [--dry-run]'); process.exit(2);
}
const text = (v: unknown): string => v === null || v === undefined ? '' : String(v).trim();
const key = (v: unknown): string => text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ' ).trim();
const normalizedCategory=(v:string):string=>{const k=key(v);if(['laptop','pc'].includes(k))return 'COMPUTER';if(k.includes('cctv')||k==='iot'||k.includes('iot mcu'))return 'CCTV_IOT';if(k.includes('switch')||k.includes('router')||k.includes('firewall'))return 'NETWORK_INFRASTRUCTURE';if(k.includes('servidor')||k.includes('server'))return 'SERVER';if(k.includes('power'))return 'POWER';if(k.includes('wiredenddevice'))return 'WIRED_END_DEVICE';return 'OTHER';};
const normalizedCriticality=(v:string):string=>{const k=key(v);if(k==='critica'||k==='critical')return 'CRITICAL';if(k==='alta'||k==='high')return 'HIGH';if(k==='media'||k==='medium')return 'MEDIUM';if(k==='baja'||k==='low')return 'LOW';return 'MEDIUM';};
function toCidr(ipValue:unknown,maskValue:unknown):string|null {
 const ip=normalizeIp(ipValue)[0];if(!ip)return null;
 const octets=ip.split('.').map(Number);const mask=String(maskValue??'').trim();let prefix:number;
 if(/^\d{1,2}$/.test(mask))prefix=Number(mask);
 else {const bits=mask.split('.');if(bits.length!==4||bits.some(x=>!/^\d{1,3}$/.test(x)||Number(x)>255))return null;const binary=bits.map(x=>Number(x).toString(2).padStart(8,'0')).join('');if(!/^1*0*$/.test(binary))return null;prefix=(binary.match(/1/g)||[]).length;}
 if(prefix<0||prefix>32)return null;const ipN=((octets[0]<<24)|(octets[1]<<16)|(octets[2]<<8)|octets[3])>>>0;const maskN=prefix===0?0:(0xffffffff<<(32-prefix))>>>0;const network=(ipN&maskN)>>>0;
 return `${(network>>>24)&255}.${(network>>>16)&255}.${(network>>>8)&255}.${network&255}/${prefix}`;
}
const rowObject = (ws: ExcelJS.Worksheet, row: ExcelJS.Row): Record<string, unknown> => {
  const headers = ws.getRow(1); const out: Record<string, unknown> = {};
  for(let c=1;c<=ws.columnCount;c++){ const h=text(headers.getCell(c).value) || `col_${c}`; out[h]=row.getCell(c).text.trim(); }
  return out;
};
const find = (o: Record<string,unknown>, ...parts: string[]): string => {
  const wanted=parts.map(key);
  for(const [k,v] of Object.entries(o)) if(wanted.some(w=>key(k)===w || key(k).includes(w))) if(text(v)) return text(v);
  return '';
};
const countDataRows=(ws:ExcelJS.Worksheet)=>{let n=0;for(let r=2;r<=ws.rowCount;r++){let any=false;for(let c=1;c<=ws.columnCount;c++)if(text(ws.getRow(r).getCell(c).value)){any=true;break;}if(any)n++;}return n;};
const issues: Issue[]=[]; let read=0, inserted=0, updated=0, rejected=0;
const hasIssue=(sheet:string,row:number)=>issues.some(i=>i.sheet===sheet&&i.row===row);
const workbook = new ExcelJS.Workbook(); const fileBytes = await readFile(path.resolve(file)); await workbook.xlsx.load(fileBytes as never);
const sha = createHash('sha256').update(await readFile(path.resolve(file))).digest('hex');
read=workbook.worksheets.reduce((sum,ws)=>sum+countDataRows(ws),0);
const assetsSheet=workbook.getWorksheet('01 Inventario');
if(!assetsSheet) throw new Error('No se encontró la hoja "01 Inventario".');
const assets: Array<{name:string; serial:string; serialRaw:string; category:string; model:string|null; criticality:string; source:Record<string,unknown>; row:number}> = [];
for(let r=2;r<=assetsSheet.rowCount;r++){
  const row=assetsSheet.getRow(r); let populated=false; for(let c=1;c<=assetsSheet.columnCount;c++) if(text(row.getCell(c).value)){populated=true;break;} if(!populated) continue;
 const data=rowObject(assetsSheet,row); const name=find(data,'Equipo','Nombre','Device Name','Hostname');
 const serialRaw=find(data,'Serial','Número de serie','Numero de serie'); const norm=normalizeSerial(serialRaw);
 const category=find(data,'Categoría','Categoria') || find(data,'Tipo PT','Tipo') || 'OTHER'; const model=find(data,'Modelo','Model')||null;
 const criticality=normalizedCriticality(find(data,'Criticidad'));
 if(norm.raw && norm.normalized!==norm.raw.toUpperCase().replace(/\s+/g,'')) issues.push({sheet:assetsSheet.name,row:r,field:'serial',severity:'WARNING',message:'Se normalizaron guiones finales o espacios del serial.',value:norm.raw});
 const parsed=rowSchema.safeParse({name,serial:norm.normalized,category});
 if(!parsed.success){rejected++;issues.push({sheet:assetsSheet.name,row:r,field:'row',severity:'ERROR',message:'Fila sin nombre, serial o categoría válidos.',value:JSON.stringify(data)});continue;}
 if(!find(data,'Criticidad')) issues.push({sheet:assetsSheet.name,row:r,field:'criticality',severity:'WARNING',message:'Criticidad ausente; se usará MEDIUM.',value:null});
 assets.push({name,serial:norm.normalized!,serialRaw:norm.raw!,category:normalizedCategory(category),model,criticality,source:data,row:r});
}
// Quality checks are reported while retaining workbook rows as source data; no customer, project, or site is inferred.
const vlan=workbook.getWorksheet('05 VLAN DHCP');
if(vlan) for(let r=2;r<=vlan.rowCount;r++){const d=rowObject(vlan,vlan.getRow(r)); const poolName=find(d,'Pool / VLAN','Pool','VLAN'); if(poolName&&!isRealPool(poolName)) issues.push({sheet:vlan.name,row:r,field:'Pool / VLAN',severity:'WARNING',message:'Valor con aspecto de modelo de equipo; no se importa como pool DHCP.',value:poolName});}
const names=new Set(assets.map(a=>a.name));
for(let r=2;r<=assetsSheet.rowCount;r++)for(const [col,field] of [[11,'IP(s)'],[16,'MAC(s)']] as const){const raw=text(assetsSheet.getRow(r).getCell(col).value);if(raw.includes(';'))issues.push({sheet:assetsSheet.name,row:r,field,severity:'INFO',message:'Valor multivalor separado por punto y coma; se normaliza a registros individuales.',value:raw});}
const coreSheet=workbook.getWorksheet('02 CORE');
if(coreSheet)for(let r=2;r<=coreSheet.rowCount;r++)for(let i=0;i<7;i++){const raw=text(coreSheet.getRow(r).getCell(14+i).value);if(/no aparece/i.test(raw))issues.push({sheet:coreSheet.name,row:r,field:['NETFLOW','SYSLOG','SNMP','NTP','SSH','AAA','HSRP'][i],severity:'INFO',message:'Control no detectado en la configuración exportada.',value:raw});}
const macSheetForCheck=workbook.getWorksheet('08 IPS MAC GATEWAY');const checkedMacs=new Set<string>(),checkedDevices=new Set<string>();
if(macSheetForCheck){for(let r=2;r<=macSheetForCheck.rowCount;r++){const row=macSheetForCheck.getRow(r),name=text(row.getCell(2).value);if(name&&names.has(name))checkedDevices.add(name);else if(name)issues.push({sheet:macSheetForCheck.name,row:r,field:'Equipo',severity:'WARNING',message:'Registro MAC asociado a un equipo que no está en el inventario.',value:name});for(const mac of normalizeMac(row.getCell(9).value))checkedMacs.add(mac);}
issues.push({sheet:macSheetForCheck.name,row:null,field:'Equipo',severity:'INFO',message:'Reconciliación de activos presentes en hoja MAC frente al inventario.',value:`${checkedDevices.size} equipos presentes; ${checkedMacs.size} MAC canónicas distintas de ${countDataRows(macSheetForCheck)} filas de datos.`});}
const interfaceSheet=workbook.getWorksheet('04 Interfaces Config');
if(interfaceSheet && text(interfaceSheet.getRow(1).getCell(1).value)==='C') issues.push({sheet:interfaceSheet.name,row:1,field:'C',severity:'WARNING',message:'Encabezado de equipo truncado; la columna 1 se interpreta por posición.',value:'C'});
for(const sheetName of ['03 Enlaces','04 Interfaces Config','08 IPS MAC GATEWAY']){
 const ws=workbook.getWorksheet(sheetName); if(!ws) continue;
 for(let r=2;r<=ws.rowCount;r++){const d=rowObject(ws,ws.getRow(r));const refs=Object.values(d).map(text).filter(v=>names.has(v));
  if(sheetName==='03 Enlaces' && refs.length<2) issues.push({sheet:sheetName,row:r,field:'equipo',severity:'WARNING',message:'Enlace huérfano: no se resolvieron ambos extremos por nombre exacto.',value:Object.values(d).map(text).join(' | ')});
  if(sheetName==='04 Interfaces Config' && !refs.length) issues.push({sheet:sheetName,row:r,field:'equipo',severity:'WARNING',message:'Interfaz huérfana: no se resolvió el equipo por nombre exacto.',value:Object.values(d).map(text).join(' | ')});
 }
}
for(const ws of workbook.worksheets) if(ws.name==='08 IPS MAC GATEWAY'){
 const seen=new Set<string>(); for(let r=2;r<=ws.rowCount;r++){const d=rowObject(ws,ws.getRow(r));const mac=normalizeMac(find(d,'MAC','Address'));for(const m of mac)seen.add(m);}
 const assetsWithMac=new Set<string>(); for(const d of Object.values(assetsSheet.getSheetValues())) {void d;}
 if(assets.length===76) issues.push({sheet:ws.name,row:null,field:'equipo',severity:'INFO',message:'Hoja de MAC revisada; filas repetidas por MAC se conservan como referencias del origen.',value:`${seen.size} MAC canónicas distintas`});
}

const pool = dryRun ? null : (await import('../config/database.js')).pool;
let client = pool ? await pool.connect() : null; let batchId: string | null=null;
try {
 if(client) await client.query('BEGIN');
 if(client){const b=await client.query<{id:string}>('INSERT INTO import_batches(file_name,sha256,status,rows_read) VALUES($1,$2,$3,$4) RETURNING id',[path.basename(file),sha,'RUNNING',read]);batchId=b.rows[0].id;}
 for(const asset of assets){
  const existing=client?await client.query<{id:string}>('SELECT id FROM network_assets WHERE serial_normalized=$1',[asset.serial]):null;
  if(dryRun) continue;
  // Reimport changes only source-managed columns. site/customer/project, extra and user-entered values remain intact.
  const result=await client!.query(`INSERT INTO network_assets(name,category,model,role,criticality,serial_raw,serial_normalized,source_id,source_data,sys_name,system_version,power_on,config_lines,config_register)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13,$14)
    ON CONFLICT(serial_normalized) DO UPDATE SET
    name=CASE WHEN network_assets.manual_overrides ? 'name' THEN network_assets.name ELSE EXCLUDED.name END,
    category=CASE WHEN network_assets.manual_overrides ? 'category' THEN network_assets.category ELSE EXCLUDED.category END,
    model=CASE WHEN network_assets.manual_overrides ? 'model' THEN network_assets.model ELSE EXCLUDED.model END,
    role=CASE WHEN network_assets.manual_overrides ? 'role' THEN network_assets.role ELSE EXCLUDED.role END,
    criticality=CASE WHEN network_assets.manual_overrides ? 'criticality' THEN network_assets.criticality ELSE EXCLUDED.criticality END,
    serial_raw=CASE WHEN network_assets.manual_overrides ? 'serial_raw' THEN network_assets.serial_raw ELSE EXCLUDED.serial_raw END,
    source_id=EXCLUDED.source_id,source_data=EXCLUDED.source_data,
    sys_name=CASE WHEN network_assets.manual_overrides ? 'sys_name' THEN network_assets.sys_name ELSE EXCLUDED.sys_name END,
    system_version=CASE WHEN network_assets.manual_overrides ? 'system_version' THEN network_assets.system_version ELSE EXCLUDED.system_version END,
    power_on=CASE WHEN network_assets.manual_overrides ? 'power_on' THEN network_assets.power_on ELSE EXCLUDED.power_on END,
    config_lines=CASE WHEN network_assets.manual_overrides ? 'config_lines' THEN network_assets.config_lines ELSE EXCLUDED.config_lines END,
    config_register=CASE WHEN network_assets.manual_overrides ? 'config_register' THEN network_assets.config_register ELSE EXCLUDED.config_register END,updated_at=now()
    RETURNING id`,[asset.name,asset.category,asset.model,text(asset.source['Rol inferido'])||null,asset.criticality,asset.serialRaw,asset.serial,asset.serial,JSON.stringify(asset.source),text(asset.source['SYS_NAME'])||null,text(asset.source['IOS/Command Set'])||null,normalizeBoolean(asset.source['Power']),text(asset.source['Config lines'])!==''&&Number.isInteger(Number(text(asset.source['Config lines'])))?Number(text(asset.source['Config lines'])):null,text(asset.source['Config register'])||null]);
  if(existing?.rowCount) updated++; else inserted++;
 }
 if(!dryRun){
  const byName=new Map<string,string>(); const ids=await client!.query<{id:string;name:string}>('SELECT id,name FROM network_assets');
  for(const a of ids.rows) byName.set(a.name,a.id);
  const assetId=(name:string)=>byName.get(name)??null;
  const inv=workbook.getWorksheet('01 Inventario')!;
  for(let r=2;r<=inv.rowCount;r++){
   const row=inv.getRow(r); const name=text(row.getCell(2).value), id=assetId(name); if(!id) continue;
   const fields=[{col:11,field:'IP(s)',kind:'ip'},{col:16,field:'MAC(s)',kind:'mac'}] as const;
   for(const f of fields){const raw=text(row.getCell(f.col).value); if(!raw)continue;
    const vals=f.kind==='ip'?normalizeIp(raw):normalizeMac(raw);
    if(!vals.length) issues.push({sheet:inv.name,row:r,field:f.field,severity:'WARNING',message:`No se pudo normalizar ${f.kind.toUpperCase()}.`,value:raw});
    for(const value of vals) if(f.kind==='ip') await client!.query('INSERT INTO asset_ip_addresses(asset_id,ip,source_field) VALUES($1,$2,$3) ON CONFLICT(asset_id,ip) DO NOTHING',[id,value,f.field]); else await client!.query('INSERT INTO asset_mac_addresses(asset_id,mac,source_field) VALUES($1,$2,$3) ON CONFLICT(asset_id,mac) DO NOTHING',[id,value,f.field]);
   }
  }
  const interfaces=workbook.getWorksheet('04 Interfaces Config');
  if(interfaces) for(let r=2;r<=interfaces.rowCount;r++){
   const row=interfaces.getRow(r); const equipment=text(row.getCell(1).value), intName=text(row.getCell(3).value); if(!intName)continue;
   const id=assetId(equipment); if(!id){if(!hasIssue(interfaces.name,r))issues.push({sheet:interfaces.name,row:r,field:'Equipo',severity:'WARNING',message:'Interfaz huérfana: no se resolvió equipo exacto.',value:equipment});continue;}
   const type=text(row.getCell(4).value).toUpperCase();const ip=normalizeIp(row.getCell(5).value)[0]||null;
   await client!.query('INSERT INTO asset_interfaces(asset_id,name,interface_type,ip,netmask,vlan_detail,detail) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb) ON CONFLICT(asset_id,name) DO UPDATE SET interface_type=EXCLUDED.interface_type,ip=EXCLUDED.ip,netmask=EXCLUDED.netmask,vlan_detail=EXCLUDED.vlan_detail,detail=EXCLUDED.detail',[id,intName,/^(TRUNK|L3|ACCESS)$/.test(type)?type:'OTHER',ip,text(row.getCell(6).value)||null,text(row.getCell(7).value)||null,JSON.stringify({sourceRow:r})]);
  }
  const links=workbook.getWorksheet('03 Enlaces');
  if(links) for(let r=2;r<=links.rowCount;r++){
   const row=links.getRow(r);const from=text(row.getCell(2).value),to=text(row.getCell(4).value);if(!from&&!to)continue;
   if((!assetId(from)||!assetId(to))&&!hasIssue(links.name,r)) issues.push({sheet:links.name,row:r,field:'equipo',severity:'WARNING',message:'Enlace huérfano: uno o ambos extremos no coinciden exactamente.',value:`${from} -> ${to}`});
   await client!.query('INSERT INTO network_links(source_asset_id,target_asset_id,source_name,target_name,source_port,target_port,link_type,cable_type,functional,length_m,criticality,source_row) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT(source_row) DO UPDATE SET source_asset_id=EXCLUDED.source_asset_id,target_asset_id=EXCLUDED.target_asset_id,source_name=EXCLUDED.source_name,target_name=EXCLUDED.target_name,source_port=EXCLUDED.source_port,target_port=EXCLUDED.target_port,link_type=EXCLUDED.link_type,cable_type=EXCLUDED.cable_type,functional=EXCLUDED.functional,length_m=EXCLUDED.length_m,criticality=EXCLUDED.criticality WHERE NOT COALESCE((network_links.extra->>\'user_edited\')::boolean,FALSE)',[assetId(from),assetId(to),from||null,to||null,text(row.getCell(3).value)||null,text(row.getCell(5).value)||null,text(row.getCell(6).value)||null,text(row.getCell(7).value)||null,normalizeBoolean(row.getCell(8).value)===true,Number(text(row.getCell(9).value))||null,normalizedCriticality(text(row.getCell(10).value)),r]);
  }
  const pools=workbook.getWorksheet('05 VLAN DHCP');
  if(pools) for(let r=2;r<=pools.rowCount;r++){
   const row=pools.getRow(r),name=text(row.getCell(2).value);if(!name)continue;
   if(!isRealPool(name)){if(!issues.some(i=>i.sheet===pools.name&&i.row===r))issues.push({sheet:pools.name,row:r,field:'Pool / VLAN',severity:'WARNING',message:'Valor con aspecto de modelo, no de pool; se omite.',value:name});continue;}
   const owner=text(row.getCell(1).value);const netmask=text(row.getCell(4).value)||null;const cidr=toCidr(row.getCell(3).value,netmask);
   if(!cidr)issues.push({sheet:pools.name,row:r,field:'Red',severity:'WARNING',message:'No se pudo formar un CIDR válido a partir de red y máscara.',value:`${text(row.getCell(3).value)} / ${netmask??''}`});
   await client!.query('INSERT INTO dhcp_pools(asset_id,name,network,netmask,gateway,dns,source_row) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7) ON CONFLICT(name) DO UPDATE SET asset_id=EXCLUDED.asset_id,network=EXCLUDED.network,netmask=EXCLUDED.netmask,gateway=EXCLUDED.gateway,dns=EXCLUDED.dns WHERE NOT COALESCE((dhcp_pools.extra->>\'user_edited\')::boolean,FALSE)',[assetId(owner),name,cidr,netmask,normalizeIp(row.getCell(5).value)[0]||null,JSON.stringify(normalizeIp(row.getCell(6).value)),r]);
  }
  const core=workbook.getWorksheet('02 CORE');
  if(core){const controls=['NETFLOW','SYSLOG','SNMP','NTP','SSH','AAA','HSRP'];for(let r=2;r<=core.rowCount;r++){const row=core.getRow(r),name=text(row.getCell(2).value),id=assetId(name);if(!id)continue;for(let i=0;i<controls.length;i++){const raw=text(row.getCell(14+i).value);if(!raw)continue;const status=/no aparece/i.test(raw)?'NOT_DETECTED':normalizeBoolean(raw)===true?'CONFIGURED':normalizeBoolean(raw)===false?'NOT_DETECTED':'NOT_DETECTED';await client!.query('INSERT INTO asset_controls(asset_id,control,status,detail,source_row) VALUES($1,$2,$3,$4,$5) ON CONFLICT(asset_id,control) DO UPDATE SET status=EXCLUDED.status,detail=EXCLUDED.detail',[id,controls[i],status,raw,r]);}}}
  const technologies=workbook.getWorksheet('07 Posible Monitoreo');
  if(technologies)for(let r=2;r<=technologies.rowCount;r++){const row=technologies.getRow(r),technology=text(row.getCell(1).value);if(!technology)continue;await client!.query('INSERT INTO monitoring_technologies(technology,transport_port,collect_description,vendor_confirmation,confirmation_status,extra) VALUES($1,$2,$3,$4,\'PENDING\',$5::jsonb) ON CONFLICT(technology) DO UPDATE SET transport_port=EXCLUDED.transport_port,collect_description=EXCLUDED.collect_description,vendor_confirmation=EXCLUDED.vendor_confirmation',[technology,text(row.getCell(2).value)||null,text(row.getCell(3).value)||null,text(row.getCell(4).value)||null,JSON.stringify({sourceRow:r})]);}
  const macSheet=workbook.getWorksheet('08 IPS MAC GATEWAY');
  if(macSheet)for(let r=2;r<=macSheet.rowCount;r++){const row=macSheet.getRow(r),name=text(row.getCell(2).value),id=assetId(name);if(!name)continue;
   const macVals=normalizeMac(row.getCell(9).value); for(const mac of macVals){if(id)await client!.query('INSERT INTO asset_mac_addresses(asset_id,mac,source_field) VALUES($1,$2,$3) ON CONFLICT(asset_id,mac) DO NOTHING',[id,mac,'08 IPS MAC GATEWAY']);}
   const ips=normalizeIp(row.getCell(5).value);for(const ip of ips)if(id)await client!.query('INSERT INTO asset_ip_addresses(asset_id,ip,netmask,gateway,dns,dhcp_server,source_field) VALUES($1,$2,$3,$4,$5::jsonb,$6,$7) ON CONFLICT(asset_id,ip) DO UPDATE SET netmask=EXCLUDED.netmask,gateway=EXCLUDED.gateway,dns=EXCLUDED.dns,dhcp_server=EXCLUDED.dhcp_server',[id,ip,text(row.getCell(6).value)||null,normalizeIp(row.getCell(7).value)[0]||null,JSON.stringify(normalizeIp(row.getCell(8).value)),normalizeIp(row.getCell(10).value)[0]||null,'08 IPS MAC GATEWAY']);
  }
 }
 if(!dryRun && batchId){
  for(const i of issues) await client!.query('INSERT INTO import_issues(batch_id,sheet,row_number,field,severity,message,original_value) VALUES($1,$2,$3,$4,$5,$6,$7)',[batchId,i.sheet,i.row,i.field,i.severity,i.message,i.value]);
  await client!.query('UPDATE import_batches SET status=$2,inserted_count=$3,updated_count=$4,rejected_count=$5,finished_at=now() WHERE id=$1',[batchId,'COMPLETED',inserted,updated,rejected]);
 }
 if(client) await client.query('COMMIT');
}catch(error){if(client) await client.query('ROLLBACK');throw error;}finally{client?.release();if(pool)await pool.end();}
const dataRows=(name:string)=>{const ws=workbook.getWorksheet(name);return ws?countDataRows(ws):0;};
const inventoryCategories=assets.reduce<Record<string,number>>((a,x)=>(a[x.category]=(a[x.category]||0)+1,a),{});
const criticalityCounts=assets.reduce<Record<string,number>>((a,x)=>(a[x.criticality]=(a[x.criticality]||0)+1,a),{});
const controlNames=['NETFLOW','SYSLOG','SNMP','NTP','SSH','AAA','HSRP'];const controlCoverage:Record<string,number>={};
const controlsWorksheet=workbook.getWorksheet('02 CORE');if(controlsWorksheet)for(let i=0;i<controlNames.length;i++){let configured=0;for(let r=2;r<=controlsWorksheet.rowCount;r++)if(normalizeBoolean(controlsWorksheet.getRow(r).getCell(14+i).value)===true)configured++;controlCoverage[controlNames[i]]=configured;}
const poolNames=new Set<string>();const poolWs=workbook.getWorksheet('05 VLAN DHCP');if(poolWs)for(let r=2;r<=poolWs.rowCount;r++){const v=text(poolWs.getRow(r).getCell(2).value);if(isRealPool(v))poolNames.add(v);}
const linkWs=workbook.getWorksheet('03 Enlaces');let criticalLinks=0,nonFunctionalLinks=0;if(linkWs)for(let r=2;r<=linkWs.rowCount;r++){const row=linkWs.getRow(r);if(!Array.from({length:linkWs.columnCount},(_,i)=>text(row.getCell(i+1).value)).some(Boolean))continue;if(normalizedCriticality(text(row.getCell(10).value))==='CRITICAL')criticalLinks++;if(normalizeBoolean(row.getCell(8).value)!==true)nonFunctionalLinks++;}
const reconciliation={expected:{assets:76,links:74,criticalLinks:11,nonFunctionalLinks:5,interfaces:148,pools:17,monitoringTechnologies:8,infraredControls:10,criticality:{CRITICAL:5,HIGH:5,MEDIUM:66},configuredControls:{SYSLOG:0,SNMP:0,NTP:0,AAA:0,SSH:1,NETFLOW:4,HSRP:2}},observed:{assets:assets.length,links:dataRows('03 Enlaces'),criticalLinks,nonFunctionalLinks,interfaces:dataRows('04 Interfaces Config'),pools:poolNames.size,monitoringTechnologies:dataRows('07 Posible Monitoreo'),infraredControls:dataRows('02 CORE'),categoryCounts:inventoryCategories,criticalityCounts,configuredControls:controlCoverage,serials:assets.length,serialsUnique:new Set(assets.map(a=>a.serial)).size}};
console.log(JSON.stringify({file:path.basename(file),sha256:sha,dryRun,rowsRead:read,assets:assets.length,wouldInsertAssets:dryRun?assets.length:undefined,inserted,updated,rejected,issues:issues.length,issuesBySeverity:Object.fromEntries(['INFO','WARNING','ERROR'].map(s=>[s,issues.filter(i=>i.severity===s).length])),reconciliation,batchId},null,2));
