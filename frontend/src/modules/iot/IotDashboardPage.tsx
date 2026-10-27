import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../../app/AuthContext';
import { iotApi } from '../../services/api';

const COLORS = ['#35a39b', '#ed9b42', '#7187a2'];
const bytes = (n: number) => `${new Intl.NumberFormat('es-CO').format(Number(n) || 0)} B`;
const date = (v?: string) => v ? new Date(v).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const shortTime = (v: number) => `${Number(v).toFixed(2)} s`;

export function IotDashboardPage() {
  const { user } = useAuth();
  const canUpload = ['ADMIN','IT_OPERATIONS'].includes(user?.role || '');
  const [captures, setCaptures] = useState<any[]>([]), [captureId, setCaptureId] = useState(''), [data, setData] = useState<any>(), [loading, setLoading] = useState(true), [uploading, setUploading] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [tab, setTab] = useState<'payloads'|'conversations'>('payloads'), [query, setQuery] = useState(''), [typeFilter, setTypeFilter] = useState('ALL'), [page, setPage] = useState(1);
  const pageSize = 10;

  async function refreshCaptures(preferred?: string) {
    const result = await iotApi.captures(); setCaptures(result.items);
    const target = preferred || captureId || result.items[0]?.id || '';
    setCaptureId(target);
    if (target) { const detail = await iotApi.capture(target); setData(detail); }
    else setData(undefined);
  }
  useEffect(() => { setLoading(true); refreshCaptures().catch(e => setError(e.message)).finally(() => setLoading(false)); }, []);
  useEffect(() => { if (!captureId) { setData(undefined); return; } iotApi.capture(captureId).then(setData).catch(e => setError(e.message)); }, [captureId]);

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    setUploading(true); setError(''); setNotice('');
    try { const result = await iotApi.importCapture(file); setNotice('Captura importada. Se conservaron solo métricas y metadatos; el contenido bruto no se guardó.'); await refreshCaptures(result.id); }
    catch (e) { setError((e as Error).message); }
    finally { setUploading(false); event.target.value = ''; }
  }

  const typeData = useMemo(() => Object.entries(data?.payloadCounts || {}).map(([name, value]) => ({ name: name === 'TEXT' ? 'Texto / JSON' : name === 'BINARY' ? 'Binario' : 'Otro', value: Number(value) })), [data]);
  const visibleRows = useMemo(() => {
    const rows = tab === 'payloads' ? (data?.payloads || []).filter((r: any) => typeFilter === 'ALL' || r.type === typeFilter) : (data?.conversations || []);
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r: any) => JSON.stringify(r).toLowerCase().includes(q));
  }, [data, tab, typeFilter, query]);
  const pageCount = Math.max(1, Math.ceil(visibleRows.length / pageSize));
  const rows = visibleRows.slice((page - 1) * pageSize, page * pageSize);

  return <>
    <section className="hero page-hero iot-hero"><div><span className="eyebrow">OPERACIONES · TELEMETRÍA</span><h2>Monitoreo de dispositivos IoT</h2><p>Análisis de tráfico de red y conversaciones importadas para operación técnica.</p></div>{canUpload && <label className="iot-upload">{uploading ? 'Procesando Excel…' : 'Importar captura .xlsx'}<input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" disabled={uploading} onChange={handleUpload}/></label>}</section>
    {error && <div className="error" role="alert">{error}</div>}{notice && <div className="success" role="status">{notice}</div>}
    <section className="card iot-toolbar"><div><strong>Captura</strong><small>Selecciona una importación para consultar sus métricas.</small></div><select aria-label="Seleccionar captura" value={captureId} onChange={e => { setPage(1); setCaptureId(e.target.value); }}><option value="">Sin capturas</option>{captures.map(c => <option key={c.id} value={c.id}>{c.name} · {date(c.importedAt)}</option>)}</select></section>
    {loading && <section className="card">Cargando métricas…</section>}
    {!loading && !data && <section className="card iot-empty"><h3>Sin capturas importadas</h3><p>Importa un libro .xlsx con las hojas Resumen, Paquetes, Payloads y Conversaciones para generar el dashboard.</p></section>}
    {data && <>
      <section className="iot-kpis">
        <article className="stat-card"><span>Total de paquetes</span><strong>{Number(data.totalPackets).toLocaleString('es-CO')}</strong><small>{Number(data.packetsWithPayload).toLocaleString('es-CO')} con payload</small></article>
        <article className="stat-card"><span>Bytes totales</span><strong>{bytes(Number(data.totalFrameBytes))}</strong><small>{bytes(Number(data.totalPayloadBytes))} de payload</small></article>
        <article className="stat-card"><span>Duración de captura</span><strong>{Number(data.durationSeconds).toFixed(2)} s</strong><small>Iniciada {date(data.startedAt)}</small></article>
        <article className="stat-card"><span>Eficiencia de payload</span><strong>{Number(data.payloadEfficiency).toFixed(2)}%</strong><small>Payload / bytes de frames</small></article>
      </section>
      <section className="iot-charts">
        <article className="card iot-chart-card"><div><h3>Tráfico a través del tiempo</h3><p className="muted">Bytes por paquete · frames frente a payload útil</p></div><ResponsiveContainer width="100%" height={300}><LineChart data={data.timeSeries} margin={{top:10,right:18,left:2,bottom:6}}><CartesianGrid strokeDasharray="3 3" stroke="#e7edf3"/><XAxis dataKey="seconds" type="number" domain={[0,'dataMax']} tickFormatter={shortTime} minTickGap={28}/><YAxis tickFormatter={(v)=>new Intl.NumberFormat('es-CO',{notation:'compact'}).format(Number(v))}/><Tooltip labelFormatter={(v)=>`Tiempo: ${shortTime(Number(v))}`} formatter={(v:any,name:any)=>[bytes(Number(v)),name==='frameBytes'?'Frame (red)':'Payload (datos útiles)']}/><Legend formatter={(v)=>v==='frameBytes'?'Frame (red)':'Payload (datos útiles)'}/><Line type="monotone" dataKey="frameBytes" name="frameBytes" stroke="#386b9b" dot={false} strokeWidth={2}/><Line type="monotone" dataKey="payloadBytes" name="payloadBytes" stroke="#35a39b" dot={false} strokeWidth={2}/></LineChart></ResponsiveContainer></article>
        <article className="card iot-chart-card"><div><h3>Tipo de payload</h3><p className="muted">Distribución por cantidad de mensajes</p></div>{typeData.length ? <ResponsiveContainer width="100%" height={300}><PieChart><Pie data={typeData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={102} paddingAngle={3} label={({name,percent})=>`${name} ${((percent||0)*100).toFixed(0)}%`}>{typeData.map((entry:any,index:number)=><Cell key={entry.name} fill={COLORS[index%COLORS.length]}/>)}</Pie><Tooltip formatter={(v:any)=>[`${v} mensajes`,'Cantidad']}/><Legend/></PieChart></ResponsiveContainer> : <p className="empty">No hay payloads en esta captura.</p>}</article>
        <article className="card iot-chart-card iot-chart-wide"><div><h3>Volumen por puerto origen</h3><p className="muted">Conversaciones ordenadas por bytes de frame</p></div>{data.portVolumes?.length ? <ResponsiveContainer width="100%" height={Math.max(250,data.portVolumes.length*42)}><BarChart data={data.portVolumes} layout="vertical" margin={{top:5,right:30,left:20,bottom:5}}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e7edf3"/><XAxis type="number" tickFormatter={(v)=>new Intl.NumberFormat('es-CO',{notation:'compact'}).format(Number(v))}/><YAxis type="category" dataKey="port" width={80} tickFormatter={(v)=>`Puerto ${v}`}/><Tooltip formatter={(v:any)=>[bytes(Number(v)),'Bytes frame']}/><Bar dataKey="frameBytes" name="Bytes frame" fill="#ed9b42" radius={[0,5,5,0]}/></BarChart></ResponsiveContainer> : <p className="empty">Sin conversaciones disponibles.</p>}</article>
      </section>
      <section className="card iot-details"><div className="toolbar iot-details-head"><div><h3>Detalle de captura</h3><p className="muted">Se muestran metadatos de flujo; el contenido de los payloads no se conserva.</p></div><input className="iot-search" value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}} placeholder="Buscar flujo, IP o puerto…" aria-label="Buscar en detalle"/></div>
        <div className="iot-table-tabs"><button className={tab==='payloads'?'selected':''} onClick={()=>{setTab('payloads');setPage(1)}}>Payloads ({data.payloads?.length||0})</button><button className={tab==='conversations'?'selected':''} onClick={()=>{setTab('conversations');setPage(1)}}>Conversaciones ({data.conversations?.length||0})</button>{tab==='payloads'&&<select value={typeFilter} onChange={e=>{setTypeFilter(e.target.value);setPage(1)}} aria-label="Filtrar tipo de payload"><option value="ALL">Todos los tipos</option><option value="TEXT">Texto / JSON</option><option value="BINARY">Binario</option><option value="OTHER">Otro</option></select>}</div>
        <div className="table-wrap"><table><thead>{tab==='payloads'?<tr><th>Paquete</th><th>Fecha/hora</th><th>Flujo</th><th>Puerto origen</th><th>Puerto destino</th><th>Tipo</th><th>Bytes</th></tr>:<tr><th>Extremo A</th><th>Extremo B</th><th>Paquetes</th><th>Bytes frame</th><th>Bytes payload</th><th>Inicio</th><th>Fin</th></tr>}</thead><tbody>{tab==='payloads'?rows.map((r:any)=><tr key={r.packetNumber}><td>{r.packetNumber}</td><td>{date(r.timestamp)}</td><td>{r.flow}</td><td>{r.sourcePort??'—'}</td><td>{r.destinationPort??'—'}</td><td><span className={`iot-type ${String(r.type).toLowerCase()}`}>{r.type==='TEXT'?'Texto / JSON':r.type==='BINARY'?'Binario':'Otro'}</span></td><td>{bytes(Number(r.bytes))}</td></tr>):rows.map((r:any)=><tr key={`${r.endpointA}-${r.endpointB}-${r.startSeconds}`}><td>{r.endpointA}</td><td>{r.endpointB}</td><td>{r.packets}</td><td>{bytes(Number(r.frameBytes))}</td><td>{bytes(Number(r.payloadBytes))}</td><td>{shortTime(Number(r.startSeconds))}</td><td>{shortTime(Number(r.endSeconds))}</td></tr>)}</tbody></table>{!rows.length&&<p className="empty">No hay filas para esos filtros.</p>}</div>
        <div className="network-pagination"><span>{visibleRows.length} registros · página {page} de {pageCount}</span><div><button className="ghost" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Anterior</button><button className="ghost" disabled={page>=pageCount} onClick={()=>setPage(p=>p+1)}>Siguiente</button></div></div>
      </section>
      <p className="iot-provenance">Fuente: {data.sourceFile}. Se guardan métricas, marcas de tiempo, extremos de red, puertos y clasificación del payload. No se almacenan ni se presentan los campos ASCII o hexadecimal del libro.</p>
    </>}
  </>;
}
