import ExcelJS from 'exceljs';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { catalogCategoryKey, normalizeCatalogPriority, splitCatalogValues } from './catalog-normalizers.js';

type Severity = 'INFO' | 'WARNING' | 'ERROR';
type Issue = {
  sheet: string;
  row: number | null;
  field: string | null;
  severity: Severity;
  message: string;
  value: string | null;
};
type CatalogRow = {
  category: string;
  equipmentType: string;
  signals: string;
  dataType: string;
  protocols: string;
  ports: string;
  platform: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  notes: string;
  source: Record<string, string>;
  sourceRow: number;
};

const rowSchema = z.object({
  category: z.string().trim().min(1),
  equipmentType: z.string().trim().min(1),
  signals: z.string().trim().min(1),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']),
});

const args = process.argv.slice(2);
function option(name: string): string | undefined {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
}

const file = option('--file');
const dryRun = args.includes('--dry-run');
if (!file || args.some((arg, index) => !['--file', '--dry-run'].includes(arg) && args[index - 1] !== '--file')) {
  console.error('Uso: npm run import:catalog -- --file <ruta.xlsx> [--dry-run]');
  process.exit(2);
}

const cellText = (value: unknown): string => value === null || value === undefined ? '' : String(value).trim();
function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

const workbook = new ExcelJS.Workbook();
const filePath = path.resolve(file);
const fileBytes = await readFile(filePath);
await workbook.xlsx.load(fileBytes as never);
const worksheet = workbook.getWorksheet('Equipos y Señales');
if (!worksheet) throw new Error('No se encontró la hoja "Equipos y Señales".');

const issues: Issue[] = [];
const rows: CatalogRow[] = [];
const seen = new Set<string>();
for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
  const row = worksheet.getRow(rowNumber);
  const values = Array.from({ length: 9 }, (_, index) => cellText(row.getCell(index + 1).value));
  if (!values.some(Boolean)) continue;

  const rawPriority = values[7];
  const priority = normalizeCatalogPriority(rawPriority);
  const candidate = {
    category: values[0],
    equipmentType: values[1],
    signals: values[2],
    dataType: values[3],
    protocols: values[4],
    ports: values[5],
    platform: values[6],
    priority: priority ?? 'HIGH',
    notes: values[8],
  };
  const parsed = rowSchema.safeParse(candidate);
  if (!parsed.success || !priority) {
    issues.push({
      sheet: worksheet.name,
      row: rowNumber,
      field: !priority ? 'Prioridad sugerida' : 'Equipo',
      severity: 'ERROR',
      message: !priority ? 'Prioridad no reconocida; fila omitida.' : 'Categoría, equipo, señales o prioridad incompletos.',
      value: JSON.stringify(values),
    });
    continue;
  }
  if (catalogCategoryKey(candidate.category) === 'UNKNOWN') {
    issues.push({ sheet: worksheet.name, row: rowNumber, field: 'Categoría', severity: 'WARNING', message: 'Categoría fuera de los tres grupos esperados.', value: candidate.category });
  }
  if (seen.has(candidate.equipmentType)) {
    issues.push({ sheet: worksheet.name, row: rowNumber, field: 'Equipo', severity: 'ERROR', message: 'Tipo de equipo duplicado; fila omitida.', value: candidate.equipmentType });
    continue;
  }
  seen.add(candidate.equipmentType);

  rows.push({
    ...candidate,
    priority,
    source: {
      category: candidate.category,
      equipmentType: candidate.equipmentType,
      signals: candidate.signals,
      dataType: candidate.dataType,
      protocols: candidate.protocols,
      ports: candidate.ports,
      platform: candidate.platform,
      priority: rawPriority,
      notes: candidate.notes,
    },
    sourceRow: rowNumber,
  });
}

const categoryCounts = rows.reduce<Record<string, number>>((counts, row) => {
  const key = catalogCategoryKey(row.category);
  counts[key] = (counts[key] ?? 0) + 1;
  return counts;
}, {});
const priorityCounts = rows.reduce<Record<string, number>>((counts, row) => {
  counts[row.priority] = (counts[row.priority] ?? 0) + 1;
  return counts;
}, {});
const expected = {
  total: 21,
  categories: { SECURITY_CCTV: 6, NETWORK_INFRASTRUCTURE: 6, IOT_BUILDING: 9 },
  priorities: { HIGH: 11, MEDIUM: 8, LOW: 2 },
};
if (rows.length !== expected.total
  || categoryCounts.SECURITY_CCTV !== 6
  || categoryCounts.NETWORK_INFRASTRUCTURE !== 6
  || categoryCounts.IOT_BUILDING !== 9
  || priorityCounts.HIGH !== 11
  || priorityCounts.MEDIUM !== 8
  || priorityCounts.LOW !== 2) {
  issues.push({ sheet: worksheet.name, row: null, field: 'reconciliación', severity: 'ERROR', message: 'El catálogo no coincide con los conteos de referencia.', value: JSON.stringify({ rows: rows.length, categoryCounts, priorityCounts }) });
}

const sha256 = createHash('sha256').update(fileBytes).digest('hex');
let inserted = 0;
let updated = 0;
let batchId: string | null = null;
const pool = dryRun ? null : (await import('../config/database.js')).pool;
const client = pool ? await pool.connect() : null;

try {
  if (client) {
    await client.query('BEGIN');
    const batch = await client.query<{ id: string }>(
      'INSERT INTO import_batches(file_name,sha256,status,rows_read) VALUES($1,$2,$3,$4) RETURNING id',
      [path.basename(filePath), sha256, 'RUNNING', rows.length],
    );
    batchId = batch.rows[0].id;
  }

  for (const row of rows) {
    const sourceData = JSON.stringify(row.source);
    const existing = client
      ? await client.query<{ source_data: Record<string, unknown>; priority: string }>(
        'SELECT source_data,priority FROM monitoring_signal_catalog WHERE equipment_type=$1',
        [row.equipmentType],
      )
      : null;
    if (existing?.rowCount) {
      const sourceMatches = stableJson(existing.rows[0].source_data) === stableJson(row.source);
      if (sourceMatches && existing.rows[0].priority === row.priority) continue;
      if (!client) continue;
    }
    if (!client) continue;

    const result = await client.query(
      `INSERT INTO monitoring_signal_catalog
        (category,equipment_type,signals,data_type,protocols,ports,suggested_platform,priority,notes,source_data,source_row,data_origin)
       VALUES ($1,$2,$3::jsonb,$4,$5::jsonb,$6::jsonb,$7,$8,$9,$10::jsonb,$11,'IMPORTED')
       ON CONFLICT (equipment_type) DO UPDATE SET
         category=EXCLUDED.category,signals=EXCLUDED.signals,data_type=EXCLUDED.data_type,
         protocols=EXCLUDED.protocols,ports=EXCLUDED.ports,suggested_platform=EXCLUDED.suggested_platform,
         priority=EXCLUDED.priority,notes=EXCLUDED.notes,source_data=EXCLUDED.source_data,
         source_row=EXCLUDED.source_row,data_origin='IMPORTED',updated_at=now()
       WHERE monitoring_signal_catalog.source_data IS DISTINCT FROM EXCLUDED.source_data
          OR monitoring_signal_catalog.priority IS DISTINCT FROM EXCLUDED.priority
       RETURNING (xmax = 0) AS inserted`,
      [row.category, row.equipmentType, JSON.stringify([row.signals]), row.dataType, JSON.stringify(splitCatalogValues(row.protocols)), JSON.stringify(splitCatalogValues(row.ports)), row.platform, row.priority, row.notes || null, sourceData, row.sourceRow],
    );
    if (result.rowCount) {
      if (result.rows[0].inserted) inserted += 1;
      else updated += 1;
    }
  }

  if (client && batchId) {
    for (const issue of issues) {
      await client.query(
        `INSERT INTO import_issues(batch_id,sheet,row_number,field,severity,message,original_value)
         VALUES($1,$2,$3,$4,$5,$6,$7)`,
        [batchId, issue.sheet, issue.row, issue.field, issue.severity, issue.message, issue.value],
      );
    }
    await client.query(
      `UPDATE import_batches SET status='COMPLETED',inserted_count=$2,updated_count=$3,rejected_count=$4,finished_at=now()
       WHERE id=$1`,
      [batchId, inserted, updated, issues.filter((issue) => issue.severity === 'ERROR').length],
    );
  }
  if (client) await client.query('COMMIT');
} catch (error) {
  if (client) await client.query('ROLLBACK');
  throw error;
} finally {
  client?.release();
  if (pool) await pool.end();
}

console.log(JSON.stringify({
  file: path.basename(filePath),
  sha256,
  dryRun,
  rows: rows.length,
  inserted: dryRun ? undefined : inserted,
  updated: dryRun ? undefined : updated,
  wouldInsert: dryRun ? rows.length : undefined,
  issues: issues.length,
  issuesBySeverity: Object.fromEntries(['INFO', 'WARNING', 'ERROR'].map((severity) => [severity, issues.filter((issue) => issue.severity === severity).length])),
  reconciliation: { expected, observed: { total: rows.length, categories: categoryCounts, priorities: priorityCounts } },
  batchId,
}, null, 2));

