import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { managedApi } from '../../services/api';
import { useAuth } from '../../app/AuthContext';
import { SyntheticBadge } from '../../components/SyntheticBadge';

const currency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value || 0);
const statusNames: Record<string, string> = { PLANNED: 'Planeado', IN_PROGRESS: 'En curso', ON_HOLD: 'En pausa', COMPLETED: 'Completado', CANCELLED: 'Cancelado', OPEN: 'Abierta', BLOCKED: 'Bloqueada' };

function MonthlyChart({ data }: { data: any[] }) {
  const maximum = Math.max(1, ...data.flatMap((row) => [Number(row.invoiced), Number(row.collected)]));
  const points = (key: 'invoiced' | 'collected') => data.map((row, index) => `${35 + index * (730 / Math.max(data.length - 1, 1))},${175 - (Number(row[key]) / maximum) * 145}`).join(' ');
  return <div className="chart-scroll"><svg className="erp-chart" viewBox="0 0 800 230" role="img" aria-label="Facturación emitida y pagos recibidos por mes">
    {[0, 1, 2, 3].map((step) => <g key={step}><line x1="35" x2="765" y1={30 + step * 48} y2={30 + step * 48} className="chart-grid"/><text x="2" y={34 + step * 48} className="chart-axis">{currency(maximum * (3 - step) / 3).replace(' ', ' ')}</text></g>)}
    <polyline points={points('invoiced')} className="chart-line chart-invoiced"/><polyline points={points('collected')} className="chart-line chart-collected"/>
    {data.map((row, index) => { const x = 35 + index * (730 / Math.max(data.length - 1, 1)); const y1 = 175 - (Number(row.invoiced) / maximum) * 145; const y2 = 175 - (Number(row.collected) / maximum) * 145; return <g key={row.month}><circle cx={x} cy={y1} r="4" className="chart-dot chart-invoiced"><title>{row.month}: facturado {currency(Number(row.invoiced))}</title></circle><circle cx={x} cy={y2} r="4" className="chart-dot chart-collected"><title>{row.month}: recaudado {currency(Number(row.collected))}</title></circle><text x={x} y="205" textAnchor="middle" className="chart-axis">{new Date(`${row.month}-02T12:00:00`).toLocaleDateString('es-CO', { month: 'short' })}</text></g>; })}
  </svg></div>;
}

function StatusChart({ title, rows }: { title: string; rows: any[] }) {
  const total = rows.reduce((sum, row) => sum + Number(row.count), 0);
  return <article className="card chart-card"><h3>{title}</h3>{rows.length ? rows.map((row) => <div className="status-chart-row" key={row.status}><div className="status-chart-label"><span>{statusNames[row.status] || row.status}</span><strong>{row.count}</strong></div><div className="status-track"><span style={{ width: `${total ? Number(row.count) * 100 / total : 0}%` }}/></div></div>) : <p className="muted">Sin registros para este periodo.</p>}</article>;
}

export function ManagedDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<any>();
  const [error, setError] = useState('');
  useEffect(() => { managedApi.dashboardSummary().then(setData).catch((e) => setError(e.message)); }, []);
  const tech = user?.role === 'TECHNICIAN';
  const k = data?.kpis || {};
  async function download(resource: 'assets' | 'findings' | 'receivables') {
    try { const blob = await managedApi.download(resource); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${resource}.xlsx`; a.click(); URL.revokeObjectURL(url); }
    catch (e) { setError((e as Error).message); }
  }

  return <>
    <section className="hero dashboard-hero"><div><span className="eyebrow">NEXUS SAFE-CLOUD · OPERACIÓN {data?.year || ''}</span><h2>Resumen del negocio</h2><p>Clientes, servicios, proyectos, operación e ingresos en un solo lugar.</p></div></section>
    {error && <p className="error">{error}</p>}
    {!data && !error && <section className="card">Cargando indicadores…</section>}
    {data && tech && <><section className="erp-kpis"><div className="stat-card"><span>Mis órdenes abiertas</span><strong>{k.openOrders}</strong></div><div className="stat-card"><span>Órdenes completadas</span><strong>{k.completedOrders}</strong></div><div className="stat-card"><span>Horas registradas este año</span><strong>{Number(k.hoursYtd).toLocaleString('es-CO')}</strong></div></section><section className="card chart-card"><h3>Horas registradas por mes · {data.year}</h3><div className="monthly-hours">{(data.monthlyHours || []).map((x: any) => <div key={x.month}><span>{new Date(`${x.month}-02T12:00:00`).toLocaleDateString('es-CO', { month: 'short' })}</span><strong>{Number(x.hours).toLocaleString('es-CO')} h</strong></div>)}</div></section></>}
    {data && !tech && <>
      <section className="erp-kpis">
        <div className="stat-card"><span>Clientes activos</span><strong>{k.activeCustomers}</strong><small>{k.totalCustomers} en total</small></div>
        <div className="stat-card"><span>Contratos vigentes</span><strong>{k.activeContracts}</strong><small>servicios gestionados</small></div>
        <div className="stat-card"><span>Proyectos en curso</span><strong>{k.activeProjects}</strong><small>{k.completedProjects} completados</small></div>
        <div className="stat-card"><span>Órdenes por atender</span><strong>{k.openOrders}</strong><small>{k.completedOrders} completadas</small></div>
        {k.invoicedYtd !== undefined && <><div className="stat-card"><span>Facturado en {data.year}</span><strong>{currency(k.invoicedYtd)}</strong><small>Facturas emitidas y pagadas</small></div><div className="stat-card"><span>Recaudado en {data.year}</span><strong>{currency(k.collectedYtd)}</strong><small>Facturas marcadas como pagadas</small></div><div className="stat-card"><span>Cartera abierta</span><strong>{currency(k.receivable)}</strong><small>{currency(k.overdue)} vencidos · {k.overdueInvoices} facturas</small></div></>}
        <div className="stat-card"><span>Hallazgos abiertos</span><strong>{k.openFindings}</strong><small>{k.criticalFindings} de severidad crítica</small></div>
      </section>
      {k.invoicedYtd !== undefined && <section className="card chart-card"><div className="chart-heading"><div><h3>Facturación y recaudo mensual</h3><p className="muted">Valores de facturas emitidas frente a pagos registrados.</p></div><div className="chart-legend"><span><i className="legend-invoiced"/> Facturado</span><span><i className="legend-collected"/> Recaudado</span></div></div><MonthlyChart data={data.monthly || []}/></section>}
      <section className="erp-chart-grid"><StatusChart title="Estado de proyectos" rows={data.projectStatus || []}/><StatusChart title="Estado de órdenes de trabajo" rows={data.orderStatus || []}/></section>
      {k.invoicedYtd !== undefined && <section className="card chart-card"><div className="toolbar"><div><h3>Actividad financiera reciente</h3><p className="muted">Últimas facturas emitidas, según los permisos de tu rol.</p></div></div><div className="table-wrap"><table><thead><tr><th>Factura</th><th>Cliente</th><th>Emisión</th><th>Vencimiento</th><th>Estado</th><th>Total</th><th>Origen</th></tr></thead><tbody>{(data.recentInvoices || []).map((i: any) => <tr key={i.id}><td>{i.number}</td><td>{i.customer_name}</td><td>{i.issue_date?.slice(0, 10)}</td><td>{i.due_date?.slice(0, 10)}</td><td>{i.status === 'PAID' ? 'Pagada' : 'Emitida'}</td><td>{currency(Number(i.total))}</td><td><SyntheticBadge origin={i.data_origin}/></td></tr>)}</tbody></table>{!data.recentInvoices?.length && <p className="empty">No hay facturas para mostrar.</p>}</div></section>}
      <section className="card dashboard-actions"><div className="toolbar"><div><h3>Módulos principales</h3><p className="muted">Accesos al ciclo comercial, operativo y financiero.</p></div></div><div className="quick-links"><Link className="button-link" to="/clients">Clientes</Link><Link className="button-link" to="/projects">Proyectos</Link><Link className="button-link" to="/service-contracts">Contratos</Link><Link className="button-link" to="/work-orders">Órdenes y horas</Link><Link className="button-link" to="/billing">Facturación y cartera</Link><Link className="button-link" to="/network">Red e infraestructura</Link></div><div className="quick-links"><button className="ghost" onClick={() => void download('assets')}>Exportar activos Excel</button><button className="ghost" onClick={() => void download('findings')}>Exportar hallazgos Excel</button>{['ADMIN','MANAGEMENT','FINANCE'].includes(user?.role || '') && <button className="ghost" onClick={() => void download('receivables')}>Exportar cartera Excel</button>}</div><p className="data-note">Los registros de operación y facturación de demostración están marcados como datos sintéticos. El inventario de red importado conserva su procedencia.</p></section>
    </>}
  </>;
}
