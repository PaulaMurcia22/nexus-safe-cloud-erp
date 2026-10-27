import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pool } from '../config/database.js';
import { importCapture } from '../modules/iot/capture-service.js';

const fileArg = process.argv.indexOf('--file');
const relativePath = fileArg >= 0 ? process.argv[fileArg + 1] : undefined;
try {
  if (!relativePath) throw new Error('Uso: npm run import:iot-capture -- --file <ruta.xlsx>');
  const fullPath = path.resolve(process.cwd(), relativePath);
  const buffer = await readFile(fullPath);
  const result = await importCapture(buffer, path.basename(fullPath), null);
  console.log(JSON.stringify({ id: result.id, duplicate: result.duplicate, totalPackets: result.stats?.totalPackets ?? result.totalPackets, totalFrameBytes: result.stats?.totalFrameBytes ?? result.totalFrameBytes, totalPayloadBytes: result.stats?.totalPayloadBytes ?? result.totalPayloadBytes, conversations: result.conversations?.length, payloads: result.payloads?.length }));
} finally {
  await pool.end();
}
