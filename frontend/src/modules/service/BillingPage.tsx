import { useEffect, useState } from 'react';
import { useAuth } from '../../app/AuthContext';
import { managedApi, pagedApi } from '../../services/api';
import { Modal } from '../../components/Modal';
import { Toast } from '../../components/Toast';

const money=(value:number|string)=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(Number(value)||0);
const invoiceLabels:Record<string,string>={DRAFT:'Borrador',ISSUED:'Emitida',PAID:'Pagada',VOID:'Anulada'};
const milestoneLabels:Record<string,string>={PLANNED:'Planeado',CLOSED:'Cerrado',INVOICED:'Facturado'};
const agingBuckets=[
  {key:'not_due',label:'Por vencer',color:'#35a39a'},
  {key:'days_0_30',label:'1–30 días',color:'#86c9b8'},
  {key:'days_31_60',label:'31–60 días',color:'#edb34c'},
  {key:'days_61_90',label:'61–90 días',color:'#e88c48'},
  {key:'days_over_90',label:'Más de 90 días',color:'#d75a55'},
];

export function BillingPage(){
  const {user}=useAuth();
  const canManage=['ADMIN','PMO'].includes(user?.role||'');
  const canSeeFinance=['ADMIN','MANAGEMENT','FINANCE'].includes(user?.role||'');
  const [items,setItems]=useState<any[]>([]),[milestones,setMilestones]=useState<any[]>([]),[aging,setAging]=useState<any[]>([]),[projects,setProjects]=useState<any[]>([]);
  const [error,setError]=useState(''),[notice,setNotice]=useState(''),[toast,setToast]=useState(''),[modal,setModal]=useState(false),[busy,setBusy]=useState(false);
  const [milestone,setMilestone]=useState({projectId:'',name:'',description:'',amount:''});
  const notify=(message:string)=>{setToast(message);setTimeout(()=>setToast(''),3000)};
  const load=async()=>{
    try{
      const m=await managedApi.milestones();setMilestones(m.items);
      if(canSeeFinance){const [i,a]=await Promise.all([managedApi.invoices(),managedApi.aging()]);setItems(i.items);setAging(a.items);}
      setError('');
    }catch(e){setError((e as Error).message);}
  };
  useEffect(()=>{
    void load();
    if(canManage)pagedApi.projects('',1,100).then((result)=>setProjects(result.items)).catch((e)=>setError(e.message));
  },[]);
  const createMilestone=async(event:React.FormEvent<HTMLFormElement>)=>{
    event.preventDefault();setBusy(true);setError('');
    try{
      await managedApi.createMilestone({...milestone,amount:Number(milestone.amount)});
      setModal(false);setMilestone({projectId:'',name:'',description:'',amount:''});notify('Hito creado correctamente.');await load();
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  };
  async function issue(id:string){try{const due=new Date();due.setDate(due.getDate()+30);await managedApi.issueInvoice(id,due.toISOString().slice(0,10));notify('Factura emitida.');await load();}catch(e){setError((e as Error).message);}}
  async function markPaid(id:string){try{await managedApi.payInvoice(id);notify('Pago registrado.');await load();}catch(e){setError((e as Error).message);}}
  async function closeMilestone(id:string){try{await managedApi.closeMilestone(id);notify('Hito cerrado y enviado a facturación.');await load();}catch(e){setError((e as Error).message);}}
  const chartMaximum=Math.max(1,...aging.map((row)=>agingBuckets.reduce((total,bucket)=>total+Number(row[bucket.key]||0),0)));

  return <>
    <section className="hero page-hero"><div><span className="eyebrow">FINANZAS</span><h2>Facturación y cartera</h2><p>Gestiona hitos, emisión de facturas y seguimiento de pagos.</p></div>
      {canManage&&<button onClick={()=>{setError('');setMilestone({projectId:'',name:'',description:'',amount:''});setModal(true);}}>+ Nuevo hito</button>}
    </section>
    {error&&!modal&&<div className="error" role="alert">{error}</div>}{notice&&<div className="success" role="status">{notice}</div>}{toast&&<Toast message={toast}/>}
    {canSeeFinance&&<details className="card billing-section billing-accordion" open><summary><span><strong>Facturas</strong><small>Estado de emisión y pagos registrados · {items.length} facturas</small></span><i aria-hidden="true"/></summary>
      <div className="billing-accordion-content"><div className="table-wrap"><table><thead><tr><th>Factura</th><th>Cliente</th><th>Emisión</th><th>Vencimiento</th><th>Estado</th><th>Total</th><th>Acciones</th></tr></thead><tbody>
        {items.map((invoice)=><tr key={invoice.id}><td><strong>{invoice.number}</strong></td><td>{invoice.customer_name}</td><td>{String(invoice.issue_date).slice(0,10)}</td><td>{String(invoice.due_date).slice(0,10)}</td><td><span className={`status-pill ${invoice.status==='PAID'?'on':invoice.status==='VOID'?'off':'pending'}`}>{invoiceLabels[invoice.status]||invoice.status}</span></td><td>{money(invoice.total)}</td><td className="billing-actions">{invoice.status==='DRAFT'&&<button className="ghost" onClick={()=>void issue(invoice.id)}>Emitir</button>}{invoice.status==='ISSUED'&&<button className="ghost" onClick={()=>void markPaid(invoice.id)}>Registrar pago</button>}</td></tr>)}
      </tbody></table>{!items.length&&<p className="empty">No hay facturas para mostrar.</p>}</div></div>
    </details>}
    {canSeeFinance&&<details className="card billing-section billing-accordion"><summary><span><strong>Antigüedad de cartera</strong><small>Saldo pendiente agrupado por días de vencimiento · {aging.length} clientes</small></span><i aria-hidden="true"/></summary><div className="billing-accordion-content">
      <div className="aging-legend">{agingBuckets.map((bucket)=><span key={bucket.key}><i style={{background:bucket.color}}/>{bucket.label}</span>)}</div>
      <div className="aging-chart">{aging.map((row)=>(
        <div className="aging-row" key={row.customer_id}>
          <div className="aging-row-heading"><strong>{row.customer_name}</strong><strong>{money(agingBuckets.reduce((sum,bucket)=>sum+Number(row[bucket.key]||0),0))}</strong></div>
          <div className="aging-bar" role="img" aria-label={`Cartera de ${row.customer_name}`}>
            {agingBuckets.map((bucket)=>{const amount=Number(row[bucket.key]||0);return amount>0&&<span key={bucket.key} title={`${bucket.label}: ${money(amount)}`} style={{width:`${amount/chartMaximum*100}%`,background:bucket.color}}/>;})}
          </div>
          <div className="aging-values">{agingBuckets.map((bucket)=>Number(row[bucket.key]||0)>0&&<small key={bucket.key}>{bucket.label}: {money(row[bucket.key])}</small>)}</div>
        </div>
      ))}{!aging.length&&<p className="empty">No hay saldos pendientes.</p>}</div>
    </div></details>}
    <details className="card billing-section billing-accordion"><summary><span><strong>Hitos de proyecto</strong><small>Compromisos que, al cerrarse, preparan una factura en borrador · {milestones.length} hitos</small></span><i aria-hidden="true"/></summary><div className="billing-accordion-content">
      <div className="table-wrap"><table><thead><tr><th>Hito</th><th>Proyecto</th><th>Valor</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
        {milestones.map((m)=><tr key={m.id}><td><strong>{m.name}</strong>{m.description&&<small className="cell-sub">{m.description}</small>}</td><td>{m.project_name}</td><td>{money(m.amount)}</td><td><span className={`status-pill ${m.status==='INVOICED'?'off':'on'}`}>{milestoneLabels[m.status]||m.status}</span></td><td>{canManage&&m.status==='PLANNED'&&<button className="ghost" onClick={()=>void closeMilestone(m.id)}>Cerrar y facturar</button>}{canManage&&m.status==='CLOSED'&&<button className="ghost" onClick={()=>void closeMilestone(m.id)}>Crear factura</button>}</td></tr>)}
      </tbody></table>{!milestones.length&&<p className="empty">No hay hitos registrados.</p>}</div>
    </div></details>
    {modal&&<Modal title="Crear hito de proyecto" onClose={()=>setModal(false)}>
      <form className="modal-form" onSubmit={createMilestone}>
        {error&&<div className="error full-field" role="alert">{error}</div>}
        <label className="full-field">Proyecto<select required value={milestone.projectId} onChange={(e)=>setMilestone({...milestone,projectId:e.target.value})}><option value="">Selecciona un proyecto</option>{projects.map((project)=><option value={project.id} key={project.id}>{project.code} · {project.name}</option>)}</select></label>
        <label className="full-field">Nombre del hito<input required minLength={2} maxLength={180} value={milestone.name} onChange={(e)=>setMilestone({...milestone,name:e.target.value})} placeholder="Ej. Implementación y puesta en marcha"/></label>
        <label className="full-field">Descripción<textarea maxLength={2000} value={milestone.description} onChange={(e)=>setMilestone({...milestone,description:e.target.value})} placeholder="Describe el entregable o criterio de cierre"/></label>
        <label className="full-field">Valor del hito (COP)<input required type="number" min="0" step="1000" value={milestone.amount} onChange={(e)=>setMilestone({...milestone,amount:e.target.value})}/></label>
        <div className="modal-actions"><button type="button" className="ghost" onClick={()=>setModal(false)}>Cancelar</button><button disabled={busy||!projects.length}>{busy?'Guardando…':'Crear hito'}</button></div>
      </form>
    </Modal>}
  </>;
}
