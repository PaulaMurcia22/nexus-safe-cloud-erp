import crypto from 'node:crypto';
import ExcelJS from 'exceljs';
import { pool } from '../../config/database.js';

type Packet = { number: number; at: Date | null; relative: number; frame: number; payload: number; sourceIp: string | null; sourcePort: number | null; destinationIp: string | null; destinationPort: number | null; protocol: string | null; flags: string | null };
type Payload = { packetNumber: number; flow: string; bytes: number; type: 'TEXT' | 'BINARY' | 'OTHER' };
type Conversation = { a: string; b: string; sourcePort: number | null; packets: number; frame: number; payload: number; start: number; end: number };
const cellText = (cell: ExcelJS.Cell) => cell.text?.trim() || (cell.value == null ? '' : String(cell.value)).trim();
const cellValue = (cell: ExcelJS.Cell): unknown => cell.value && typeof cell.value === 'object' && 'result' in cell.value ? cell.value.result : cell.value;
const numeric = (cell: ExcelJS.Cell, label: string) => { const value = Number(cellValue(cell)); if (!Number.isFinite(value) || value < 0) throw Object.assign(new Error(`Valor inválido en ${label}.`), { status: 400 }); return value; };
const port = (value: string) => { const p = Number(value); return Number.isInteger(p) && p >= 0 && p <= 65535 ? p : null; };
const endpointPort = (endpoint: string) => port(endpoint.slice(endpoint.lastIndexOf(':') + 1));

function parseWorkbook(buffer: Buffer<ArrayBufferLike>) {
  return (async () => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(buffer) as any);
    const summarySheet = workbook.getWorksheet('Resumen');
    const packetSheet = workbook.getWorksheet('Paquetes');
    const payloadSheet = workbook.getWorksheet('Payloads');
    const conversationSheet = workbook.getWorksheet('Conversaciones');
    if (!summarySheet || !packetSheet || !payloadSheet || !conversationSheet) throw Object.assign(new Error('El libro debe incluir Resumen, Paquetes, Payloads y Conversaciones.'), { status: 400 });

    const packets: Packet[] = [];
    for (let row = 2; row <= packetSheet.rowCount; row++) {
      const cells = packetSheet.getRow(row);
      const packetNumber = numeric(cells.getCell(1), `Paquetes fila ${row}`);
      const time = cells.getCell(2).value;
      const at = time instanceof Date ? time : time ? new Date(String(time)) : null;
      const relative = numeric(cells.getCell(3), `Paquetes tiempo relativo fila ${row}`);
      const frame = numeric(cells.getCell(4), `Paquetes bytes frame fila ${row}`);
      const sourceIp = cellText(cells.getCell(7)) || null;
      const sourcePort = port(cellText(cells.getCell(8)));
      const destinationIp = cellText(cells.getCell(9)) || null;
      const destinationPort = port(cellText(cells.getCell(10)));
      const protocol = cellText(cells.getCell(11)) || null;
      const payload = numeric(cells.getCell(19), `Paquetes payload fila ${row}`);
      if (!Number.isInteger(packetNumber) || packetNumber < 1 || (at && Number.isNaN(at.getTime()))) throw Object.assign(new Error(`Paquete inválido en fila ${row}.`), { status: 400 });
      packets.push({ number: packetNumber, at, relative, frame, payload, sourceIp, sourcePort, destinationIp, destinationPort, protocol, flags: cellText(cells.getCell(17)) || null });
    }
    if (!packets.length) throw Object.assign(new Error('La hoja Paquetes no contiene registros.'), { status: 400 });

    const packetByNumber = new Map(packets.map(packet => [packet.number, packet]));
    const payloads: Payload[] = [];
    for (let row = 2; row <= payloadSheet.rowCount; row++) {
      const cells = payloadSheet.getRow(row);
      const packetNumber = numeric(cells.getCell(1), `Payloads paquete fila ${row}`);
      if (!packetByNumber.has(packetNumber)) throw Object.assign(new Error(`Payload sin paquete asociado en fila ${row}.`), { status: 400 });
      const rawType = cellText(cells.getCell(4)).toLowerCase();
      const type = rawType.includes('text') || rawType.includes('texto') || rawType.includes('json') ? 'TEXT' : rawType.includes('bin') ? 'BINARY' : 'OTHER';
      // La hoja contiene ASCII y hexadecimal potencialmente sensibles. Se leen solo para validación interna
      // y nunca se guardan, se registran en logs o se incluyen en la respuesta.
      payloads.push({ packetNumber, flow: cellText(cells.getCell(2)), bytes: numeric(cells.getCell(3), `Payloads bytes fila ${row}`), type });
    }

    const conversations: Conversation[] = [];
    for (let row = 2; row <= conversationSheet.rowCount; row++) {
      const cells = conversationSheet.getRow(row);
      const a = cellText(cells.getCell(1)); const b = cellText(cells.getCell(2));
      if (!a || !b) continue;
      const start = numeric(cells.getCell(6), `Conversaciones inicio fila ${row}`);
      const end = numeric(cells.getCell(7), `Conversaciones fin fila ${row}`);
      conversations.push({ a, b, sourcePort: endpointPort(a), packets: numeric(cells.getCell(3), `Conversaciones paquetes fila ${row}`), frame: numeric(cells.getCell(4), `Conversaciones frames fila ${row}`), payload: numeric(cells.getCell(5), `Conversaciones payload fila ${row}`), start, end: Math.max(start, end) });
    }
    const totalFrameBytes = packets.reduce((sum, packet) => sum + packet.frame, 0);
    const totalPayloadBytes = packets.reduce((sum, packet) => sum + packet.payload, 0);
    const firstAt = packets.map(p => p.at).filter((d): d is Date => d !== null).sort((a,b) => a.getTime() - b.getTime())[0] ?? null;
    const maxRelative = Math.max(...packets.map(packet => packet.relative));
    // Lee el resumen del libro y comprueba las métricas principales frente a las hojas de detalle.
    // ExcelJS expone los resultados cacheados de las fórmulas; no se necesita confiar en fórmulas externas.
    const summary = new Map<string, number>();
    for (let row = 2; row <= summarySheet.rowCount; row++) {
      const label = cellText(summarySheet.getRow(row).getCell(1)).toLowerCase();
      const value = cellValue(summarySheet.getRow(row).getCell(2));
      if (label && typeof value === 'number' && Number.isFinite(value)) summary.set(label, value);
    }
    const expectedSummary: Array<[string, number]> = [
      ['total de paquetes', packets.length], ['paquetes con payload', packets.filter(p => p.payload > 0).length],
      ['bytes totales (frames)', totalFrameBytes], ['bytes de payload', totalPayloadBytes],
      ['duración de la captura (s)', maxRelative], ['conversaciones tcp', conversations.length],
    ];
    for (const [label, actual] of expectedSummary) {
      const reported = summary.get(label);
      if (reported === undefined || Math.abs(reported - actual) > 0.001) throw Object.assign(new Error(`El resumen no coincide con los detalles: ${label}.`), { status: 400 });
    }
    const typeCounts = payloads.reduce((acc, payload) => { acc[payload.type] = (acc[payload.type] || 0) + 1; return acc; }, {} as Record<string, number>);
    const typeBytes = payloads.reduce((acc, payload) => { acc[payload.type] = (acc[payload.type] || 0) + payload.bytes; return acc; }, {} as Record<string, number>);
    const byPort = new Map<number, { port: number; conversations: number; packets: number; frameBytes: number; payloadBytes: number }>();
    for (const conversation of conversations) if (conversation.sourcePort !== null) {
      const current = byPort.get(conversation.sourcePort) || { port: conversation.sourcePort, conversations: 0, packets: 0, frameBytes: 0, payloadBytes: 0 };
      current.conversations++; current.packets += conversation.packets; current.frameBytes += conversation.frame; current.payloadBytes += conversation.payload; byPort.set(conversation.sourcePort, current);
    }
    const timeSeries = [...packets].sort((a,b) => a.relative - b.relative).map(p => ({ packetNumber: p.number, seconds: p.relative, frameBytes: p.frame, payloadBytes: p.payload }));
    return {
      stats: { totalPackets: packets.length, packetsWithPayload: packets.filter(p => p.payload > 0).length, totalFrameBytes, totalPayloadBytes, durationSeconds: maxRelative, payloadEfficiency: totalFrameBytes ? totalPayloadBytes * 100 / totalFrameBytes : 0, payloadCounts: typeCounts, payloadBytesByType: typeBytes, startedAt: firstAt?.toISOString() ?? null },
      packets, payloads: payloads.map(p => ({ ...p, timestamp: packetByNumber.get(p.packetNumber)?.at?.toISOString() ?? null, sourcePort: packetByNumber.get(p.packetNumber)?.sourcePort ?? null, destinationPort: packetByNumber.get(p.packetNumber)?.destinationPort ?? null })),
      conversations, timeSeries, portVolumes: [...byPort.values()].sort((a,b) => b.frameBytes - a.frameBytes).slice(0, 10),
    };
  })();
}

export async function importCapture(buffer: Buffer<ArrayBufferLike>, sourceName: string, actorId: string | null) {
  const data = await parseWorkbook(buffer);
  const sourceSha256 = crypto.createHash('sha256').update(buffer).digest('hex');
  const existing = await pool.query(`SELECT id FROM iot_captures WHERE source_sha256=$1`, [sourceSha256]);
  if (existing.rowCount) return { ...(await getCapture(existing.rows[0].id)), duplicate: true };
  const id = crypto.randomUUID();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`INSERT INTO iot_captures(id,name,source_file,source_sha256,imported_by,total_packets,packets_with_payload,total_frame_bytes,total_payload_bytes,duration_seconds,payload_efficiency,started_at,data_origin)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'IMPORTED')`,
    [id, sourceName.replace(/\.[^.]+$/, '').slice(0, 180) || 'Captura IoT', sourceName.slice(0, 255), sourceSha256, actorId, data.stats.totalPackets, data.stats.packetsWithPayload, data.stats.totalFrameBytes, data.stats.totalPayloadBytes, data.stats.durationSeconds, data.stats.payloadEfficiency, data.stats.startedAt]);
    for (const p of data.packets) await client.query(`INSERT INTO iot_capture_packets(capture_id,packet_number,occurred_at,relative_seconds,frame_bytes,payload_bytes,source_ip,source_port,destination_ip,destination_port,protocol,tcp_flags)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`, [id,p.number,p.at,p.relative,p.frame,p.payload,p.sourceIp,p.sourcePort,p.destinationIp,p.destinationPort,p.protocol,p.flags]);
    for (const p of data.payloads) await client.query(`INSERT INTO iot_capture_payloads(capture_id,packet_number,flow,payload_bytes,payload_type) VALUES($1,$2,$3,$4,$5)`, [id,p.packetNumber,p.flow,p.bytes,p.type]);
    for (const c of data.conversations) await client.query(`INSERT INTO iot_capture_conversations(capture_id,endpoint_a,endpoint_b,source_port,packets,frame_bytes,payload_bytes,start_seconds,end_seconds)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [id,c.a,c.b,c.sourcePort,c.packets,c.frame,c.payload,c.start,c.end]);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
  return { id, ...data, duplicate: false };
}

export async function listCaptures() {
  return (await pool.query(`SELECT id,name,source_file AS "sourceFile",total_packets AS "totalPackets",total_frame_bytes AS "totalFrameBytes",total_payload_bytes AS "totalPayloadBytes",duration_seconds AS "durationSeconds",payload_efficiency AS "payloadEfficiency",imported_at AS "importedAt",data_origin AS "dataOrigin" FROM iot_captures ORDER BY imported_at DESC LIMIT 50`)).rows;
}

export async function getCapture(id: string) {
  const cap = await pool.query(`SELECT id,name,source_file AS "sourceFile",total_packets AS "totalPackets",packets_with_payload AS "packetsWithPayload",total_frame_bytes AS "totalFrameBytes",total_payload_bytes AS "totalPayloadBytes",duration_seconds AS "durationSeconds",payload_efficiency AS "payloadEfficiency",started_at AS "startedAt",imported_at AS "importedAt",data_origin AS "dataOrigin" FROM iot_captures WHERE id=$1`, [id]);
  if (!cap.rowCount) return null;
  const [packets, payloads, conversations] = await Promise.all([
    pool.query(`SELECT packet_number AS "packetNumber",relative_seconds AS seconds,frame_bytes AS "frameBytes",payload_bytes AS "payloadBytes" FROM iot_capture_packets WHERE capture_id=$1 ORDER BY relative_seconds,packet_number`, [id]),
    pool.query(`SELECT p.packet_number AS "packetNumber",p.flow,p.payload_bytes AS bytes,p.payload_type AS type,pack.occurred_at AS timestamp,pack.source_ip AS "sourceIp",pack.source_port AS "sourcePort",pack.destination_ip AS "destinationIp",pack.destination_port AS "destinationPort" FROM iot_capture_payloads p JOIN iot_capture_packets pack USING(capture_id,packet_number) WHERE p.capture_id=$1 ORDER BY pack.relative_seconds,p.packet_number`, [id]),
    pool.query(`SELECT endpoint_a AS "endpointA",endpoint_b AS "endpointB",source_port AS "sourcePort",packets,frame_bytes AS "frameBytes",payload_bytes AS "payloadBytes",start_seconds AS "startSeconds",end_seconds AS "endSeconds" FROM iot_capture_conversations WHERE capture_id=$1 ORDER BY frame_bytes DESC`, [id]),
  ]);
  const payloadCounts: Record<string, number> = {}; const payloadBytesByType: Record<string, number> = {};
  for (const item of payloads.rows) { payloadCounts[item.type] = (payloadCounts[item.type] || 0) + 1; payloadBytesByType[item.type] = (payloadBytesByType[item.type] || 0) + Number(item.bytes); }
  const byPort = new Map<number,{port:number;conversations:number;packets:number;frameBytes:number;payloadBytes:number}>();
  for(const c of conversations.rows) if(c.sourcePort!==null){const v=byPort.get(c.sourcePort)||{port:c.sourcePort,conversations:0,packets:0,frameBytes:0,payloadBytes:0};v.conversations++;v.packets+=Number(c.packets);v.frameBytes+=Number(c.frameBytes);v.payloadBytes+=Number(c.payloadBytes);byPort.set(c.sourcePort,v);}
  return { ...cap.rows[0], payloadCounts, payloadBytesByType, timeSeries: packets.rows, payloads: payloads.rows, conversations: conversations.rows, portVolumes: [...byPort.values()].sort((a,b)=>b.frameBytes-a.frameBytes).slice(0,10) };
}
