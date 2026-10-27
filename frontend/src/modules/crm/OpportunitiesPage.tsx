import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../app/AuthContext';
import { Modal } from '../../components/Modal';
import { Toast } from '../../components/Toast';

const base = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const stages = ['LEAD','QUALIFIED','PROPOSAL','NEGOTIATION','WON','LOST'] as const;
type Stage = typeof stages[number];
type Opportunity = {id:string;customerId:string|null;companyName:string;customerName:string|null;title:string;stage:Stage;expectedMrr:number|string;probability:number;closeDate:string|null;source:string;notes:string|null};
type Client = {id:string;legalName:string;status:string};
type Form = Omit<Opportunity,'id'|'customerName'|'expectedMrr'> & {id?:string;expectedMrr:string|number};
const blank:Form={customerId:null,companyName:'',title:'',stage:'LEAD',expectedMrr:'',probability:10,closeDate:null,source:'WEBSITE',notes:''};
const stageNames:Record<Stage,string>={LEAD:'Prospecto',QUALIFIED:'Calificada',PROPOSAL:'Propuesta',NEGOTIATION:'Negociación',WON:'Ganada',LOST:'Perdida'};
const sourceNames:Record<string,string>={WEBSITE:'Sitio web',REFERRAL:'Referido',PARTNER:'Aliado',OUTBOUND:'Prospección',EVENT:'Evento',OTHER:'Otro'};
const money=(value:number|string)=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(Number(value)||0);
async function request<T>(path:string,options?:RequestInit):Promise<T>{const response=await fetch(`${base}${path}`,{credentials:'include',headers:{'Content-Type':'application/json',...options?.headers},...options});if(response.status===204)return undefined as T;const body=await response.json().catch(()=>null);if(!response.ok)throw new Error(body?.error||'No fue posible completar la operación.');return body as T;}

export function OpportunitiesPage(){
  const {user}=useAuth();
  const canEdit=['ADMIN','COMMERCIAL'].includes(user?.role||'');
  const canDelete=user?.role==='ADMIN';
  const [items,setItems]=useState<Opportunity[]>([]),[clients,setClients]=useState<Client[]>([]),[search,setSearch]=useState(''),[stage,setStage]=useState(''),[form,setForm]=useState<Form>(blank),[open,setOpen]=useState(false),[error,setError]=useState(''),[toast,setToast]=useState(''),[saving,setSaving]=useState(false);
  const notify=(message:string)=>{setToast(message);window.setTimeout(()=>setToast(''),2500)};
  async function load(){const params=new URLSearchParams();if(search.trim())params.set('search',search.trim());if(stage)params.set('stage',stage);const [result,customerResult]=await Promise.all([request<{items:Opportunity[]}>(`/opportunities${params.size?`?${params}`:''}`),request<Client[]|{items:Client[]}>('/clients')]);setItems(result.items);setClients((Array.isArray(customerResult)?customerResult:customerResult.items).filter(c=>c.status==='ACTIVE'));}
  useEffect(()=>{load().catch(e=>setError(e.message));},[search,stage]);
  const metrics=useMemo(()=>({open:items.filter(x=>!['WON','LOST'].includes(x.stage)),won:items.filter(x=>x.stage==='WON')}),[items]);
  const weighted=metrics.open.reduce((sum,x)=>sum+Number(x.expectedMrr)*x.probability/100,0);
  function edit(row:Opportunity){setForm({id:row.id,customerId:row.customerId,companyName:row.companyName,title:row.title,stage:row.stage,expectedMrr:Number(row.expectedMrr),probability:row.probability,closeDate:row.closeDate?.slice(0,10)||null,source:row.source,notes:row.notes||''});setError('');setOpen(true);}
  async function save(event:React.FormEvent<HTMLFormElement>){event.preventDefault();setSaving(true);setError('');try{const payload={...form,expectedMrr:Number(form.expectedMrr),probability:Number(form.probability),closeDate:form.closeDate||null,notes:form.notes||null,customerId:form.customerId||null};if(form.id)await request(`/opportunities/${form.id}`,{method:'PUT',body:JSON.stringify(payload)});else await request('/opportunities',{method:'POST',body:JSON.stringify(payload)});setOpen(false);setForm(blank);notify(form.id?'Oportunidad actualizada.':'Oportunidad registrada.');await load();}catch(e){setError((e as Error).message);}finally{setSaving(false);}}
  async function remove(row:Opportunity){if(!window.confirm(`¿Eliminar la oportunidad «${row.title}»?`))return;setError('');try{await request(`/opportunities/${row.id}`,{method:'DELETE'});notify('Oportunidad eliminada.');await load();}catch(e){setError((e as Error).message);}}
  const set=(key:keyof Form,value:unknown)=>setForm(current=>({...current,[key]:value}));
  return <>
    <section className="hero page-hero"><div><span className="eyebrow">VENTAS · SaaS</span><h2>Oportunidades</h2><p>Pipeline comercial y valor mensual recurrente estimado.</p></div>{canEdit&&<button onClick={()=>{setForm(blank);setError('');setOpen(true);}}>+ Nueva oportunidad</button>}</section>
    {error&&!open&&<div className="error" role="alert">{error}</div>}
    <section className="erp-kpis"><article className="stat-card"><span>Oportunidades abiertas</span><strong>{metrics.open.length}</strong><small>En prospección, propuesta o negociación</small></article><article className="stat-card"><span>MRR ponderado del pipeline</span><strong>{money(weighted)}</strong><small>Estimación según probabilidad; no es ingreso cobrado</small></article><article className="stat-card"><span>Oportunidades ganadas</span><strong>{metrics.won.length}</strong><small>El cierre comercial no registra recaudo</small></article></section>
    <section className="card"><div className="toolbar"><div><h3>Pipeline comercial</h3><p className="muted">Las oportunidades ganadas se convierten en clientes y suscripciones desde sus módulos correspondientes.</p></div><div className="network-filters"><input aria-label="Buscar oportunidades" placeholder="Buscar empresa u oportunidad…" value={search} onChange={e=>setSearch(e.target.value)}/><select className="filter-select" aria-label="Filtrar etapa" value={stage} onChange={e=>setStage(e.target.value)}><option value="">Todas las etapas</option>{stages.map(x=><option key={x} value={x}>{stageNames[x]}</option>)}</select></div></div>
      {items.length?<div className="table-wrap"><table><thead><tr><th>Empresa</th><th>Oportunidad</th><th>Etapa</th><th>MRR estimado</th><th>Probabilidad</th><th>Cierre esperado</th><th>Fuente comercial</th><th>Acciones</th></tr></thead><tbody>{items.map(row=><tr key={row.id}><td><strong>{row.customerName||row.companyName}</strong></td><td>{row.title}</td><td><span className={`status-pill ${row.stage==='WON'?'on':row.stage==='LOST'?'off':''}`}>{stageNames[row.stage]}</span></td><td>{money(row.expectedMrr)}</td><td>{row.probability}%</td><td>{row.closeDate?.slice(0,10)||'—'}</td><td>{sourceNames[row.source]||row.source}</td><td>{canEdit&&<button className="link" onClick={()=>edit(row)}>Editar</button>}{canDelete&&<button className="link danger-link" onClick={()=>void remove(row)}>Eliminar</button>}</td></tr>)}</tbody></table></div>:<p className="empty">No hay oportunidades con estos filtros.</p>}
    </section>{toast&&<Toast message={toast}/>}
    {open&&<Modal title={form.id?'Editar oportunidad':'Nueva oportunidad'} onClose={()=>setOpen(false)}><form className="modal-form" onSubmit={save}>
      <label>Empresa prospecto *<input required minLength={2} maxLength={200} value={form.companyName} onChange={e=>set('companyName',e.target.value)}/></label>
      <label>Vincular cliente existente<select value={form.customerId||''} onChange={e=>{const client=clients.find(x=>x.id===e.target.value);set('customerId',e.target.value||null);if(client)set('companyName',client.legalName);}}><option value="">Prospecto nuevo / sin vincular</option>{clients.map(c=><option key={c.id} value={c.id}>{c.legalName}</option>)}</select></label>
      <label className="full-field">Nombre de la oportunidad *<input required minLength={2} maxLength={180} value={form.title} onChange={e=>set('title',e.target.value)}/></label>
      <label>Etapa<select value={form.stage} onChange={e=>set('stage',e.target.value)}>{stages.map(x=><option key={x} value={x}>{stageNames[x]}</option>)}</select></label>
      <label>MRR esperado (COP) *<input type="number" min="0" step="1000" required value={form.expectedMrr} onChange={e=>set('expectedMrr',e.target.value)}/></label>
      <label>Probabilidad (%)<input type="number" min="0" max="100" step="5" required value={form.probability} onChange={e=>set('probability',e.target.value)}/></label>
      <label>Fecha estimada de cierre<input type="date" value={form.closeDate||''} onChange={e=>set('closeDate',e.target.value||null)}/></label>
      <label>Fuente comercial<select value={form.source} onChange={e=>set('source',e.target.value)}>{Object.entries(sourceNames).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
      <label className="full-field">Notas<textarea rows={3} maxLength={4000} value={form.notes||''} onChange={e=>set('notes',e.target.value)}/></label>
      {error&&<div className="error full-field" role="alert">{error}</div>}
      <div className="modal-actions"><button type="button" className="ghost" onClick={()=>setOpen(false)}>Cancelar</button><button disabled={saving}>{saving?'Guardando…':'Guardar oportunidad'}</button></div>
    </form></Modal>}
  </>;
}
