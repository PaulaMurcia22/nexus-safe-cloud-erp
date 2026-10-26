import test from 'node:test';import assert from 'node:assert/strict';import ExcelJS from 'exceljs';import path from 'node:path';
import{articulationPoints,impactedByFailure,type GraphEdge,type GraphNode}from'../graph.js';import{normalizeBoolean}from'../../../scripts/network-normalizers.js';

test('impacto y puntos de articulación en un grafo pequeño',()=>{
  const nodes:GraphNode[]=[{id:'wan',role:'WAN / Internet'},{id:'core'},{id:'access'},{id:'endpoint'}];
  const edges:GraphEdge[]=[{id:'e1',source_asset_id:'wan',target_asset_id:'core',functional:true},{id:'e2',source_asset_id:'core',target_asset_id:'access',functional:null},{id:'e3',source_asset_id:'access',target_asset_id:'endpoint',functional:true}];
  assert.deepEqual(articulationPoints(nodes,edges),['access','core']);
  assert.deepEqual(impactedByFailure(nodes,edges,undefined,'e1'),['access','core','endpoint']);
  assert.deepEqual(impactedByFailure(nodes,edges,'access'),['endpoint']);
  assert.deepEqual(impactedByFailure(nodes,[...edges,{id:'e4',source_asset_id:'wan',target_asset_id:'access',functional:true}],undefined,'e1'),[]);
});

test('topología importada conserva los 76 nodos y excluye enlaces huérfanos al calcular',async()=>{
  const workbook=new ExcelJS.Workbook();await workbook.xlsx.readFile(path.resolve(process.cwd(),'../data/Data_para_Proveedor_ERP.xlsx'));
  const inventory=workbook.getWorksheet('01 Inventario'),linkSheet=workbook.getWorksheet('03 Enlaces');assert.ok(inventory);assert.ok(linkSheet);
  const names=new Map<string,string>(),nodes:GraphNode[]=[];
  for(let row=2;row<=inventory.rowCount;row++){const r=inventory.getRow(row),id=String(r.getCell(1).text).trim(),name=String(r.getCell(2).text).trim();if(id&&name){names.set(name,id);nodes.push({id,role:String(r.getCell(6).text).trim()});}}
  const edges:GraphEdge[]=[];
  for(let row=2;row<=linkSheet.rowCount;row++){const r=linkSheet.getRow(row),source=names.get(String(r.getCell(2).text).trim()),target=names.get(String(r.getCell(4).text).trim());if(source&&target)edges.push({id:String(r.getCell(1).text),source_asset_id:source,target_asset_id:target,functional:normalizeBoolean(r.getCell(8).value)});}
  assert.equal(nodes.length,76);assert.equal(linkSheet.rowCount-1,74);assert.equal(edges.filter(e=>e.functional===null).length,5);
  const impacted=impactedByFailure(nodes,edges,undefined,edges[0].id);assert.ok(impacted.every(id=>names.size&&nodes.some(n=>n.id===id)));
  assert.ok(articulationPoints(nodes,edges).every(id=>nodes.some(n=>n.id===id)));
});
