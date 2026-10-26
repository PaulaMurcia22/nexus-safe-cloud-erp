import assert from 'node:assert/strict';
import test from 'node:test';
import ExcelJS from 'exceljs';
import path from 'node:path';
import { catalogCategoryKey, normalizeCatalogPriority } from '../scripts/catalog-normalizers.js';
import { mapAssetToCatalog } from '../scripts/catalog-type-mapping.js';

test('monitoring catalog source reconciles 21 types, 6/6/9 categories and 11/8/2 priorities', async () => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path.resolve(process.cwd(), '../data/Equipos_Monitoreo_Red_5196.xlsx'));
  const sheet = workbook.getWorksheet('Equipos y Señales');
  assert.ok(sheet);
  const categories: Record<string, number> = {};
  const priorities: Record<string, number> = {};
  const equipmentTypes = new Set<string>();

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const equipmentType = String(row.getCell(2).value ?? '').trim();
    if (!equipmentType) continue;
    equipmentTypes.add(equipmentType);
    const category = catalogCategoryKey(String(row.getCell(1).value ?? ''));
    const priority = normalizeCatalogPriority(String(row.getCell(8).value ?? ''));
    assert.notEqual(category, 'UNKNOWN');
    assert.ok(priority);
    categories[category] = (categories[category] ?? 0) + 1;
    priorities[priority] = (priorities[priority] ?? 0) + 1;
  }

  assert.equal(equipmentTypes.size, 21);
  assert.deepEqual(categories, { SECURITY_CCTV: 6, NETWORK_INFRASTRUCTURE: 6, IOT_BUILDING: 9 });
  assert.deepEqual(priorities, { HIGH: 11, MEDIUM: 8, LOW: 2 });
});

test('five custom IoT links have blank functional values and must stay unknown', async () => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path.resolve(process.cwd(), '../data/Data_para_Proveedor_ERP.xlsx'));
  const sheet = workbook.getWorksheet('03 Enlaces');
  assert.ok(sheet);
  const unknownCustomLinks = [];
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    if (String(row.getCell(6).value ?? '').trim() !== 'eCustomIOLink') continue;
    if (String(row.getCell(8).value ?? '').trim() === '') unknownCustomLinks.push(rowNumber);
  }
  assert.equal(unknownCustomLinks.length, 5);
});

test('asset catalog mapping uses explicit roles and leaves ambiguous IoT unmapped', () => {
  assert.equal(mapAssetToCatalog('NETWORK_INFRASTRUCTURE', 'Core / Distribución L3', '3560-24PS')?.equipmentType, 'Switch administrable');
  assert.equal(mapAssetToCatalog('NETWORK_INFRASTRUCTURE', 'Acceso', '2960-24TT')?.equipmentType, 'Switch administrable');
  assert.equal(mapAssetToCatalog('NETWORK_INFRASTRUCTURE', 'WAN / Internet', '2911')?.equipmentType, 'Router / Firewall');
  assert.equal(mapAssetToCatalog('CCTV_IOT', 'CCTV / IoT', 'Webcam')?.confidence, 'LOW');
  assert.equal(mapAssetToCatalog('CCTV_IOT', 'IoT / MCU', 'MCU-PT'), null);
});

