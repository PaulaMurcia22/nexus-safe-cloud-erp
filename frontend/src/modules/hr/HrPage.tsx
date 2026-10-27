import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../app/AuthContext';
import { Modal } from '../../components/Modal';
import { Toast } from '../../components/Toast';
import './hr.css';

const base=import.meta.env.VITE_API_URL||'http://localhost:3001/api';
const locations:Record<string,string>={MEDELLIN:'Medellín',BOGOTA:'Bogotá',REMOTE_SHARED:'Remoto'};
const statuses:Record<string,string>={ACTIVE:'Activo',ON_LEAVE:'En licencia',INACTIVE:'Inactivo'};
const contractTypes:Record<string,string>={FULL_TIME:'Indefinido',FIXED_TERM:'Término fijo',CONTRACTOR:'Prestación de servicios',PART_TIME:'Medio tiempo'};
type Employee={id:string;employeeNumber:string;fullName:string;workEmail:string;jobTitle:string;department:string;officeLocation:string;startDate:string;status:'ACTIVE'|'ON_LEAVE'|'INACTIVE';contractType:string};
type Form=Omit<Employee,'id'>;
const blank=():Form=>({employeeNumber:'',fullName:'',workEmail:'',jobTitle:'',department:'',officeLocation:'REMOTE_SHARED',startDate:new Date().toISOString().slice(0,10),status:'ACTIVE',contractType:'FULL_TIME'});
async function request<T>(path:string,options:RequestInit={}):Promise<T>{
  const response=await fetch(`${base}${path}`,{credentials:'include',headers:{'Content-Type':'application/json',...options.headers},...options});
  const data=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(data?.error||'No fue posible completar la operación.');
  return data as T;
}

export function HrPage(){
  const {user}=useAuth();
  const [items,setItems]=useState<Employee[]>([]),[search,setSearch]=useState(''),[statusFilter,setStatusFilter]=useState('ALL'),[departmentFilter,setDepartmentFilter]=useState('ALL');
  const [loading,setLoading]=useState(true),[error,setError]=useState(''),[toast,setToast]=useState(''),[open,setOpen]=useState(false),[editing,setEditing]=useState<Employee>(),[form,setForm]=useState<Form>(blank());
  const canWrite=user?.role==='ADMIN';
  const departments=useMemo(()=>Array.from(new Set(items.map(x=>x.department))).sort(),[items]);
  const totals=useMemo(()=>items.reduce((acc,item)=>{acc.total++;if(item.status==='ACTIVE')acc.active++;if(item.status==='ON_LEAVE')acc.onLeave++;return acc;},{total:0,active:0,onLeave:0}),[items]);
  async function load(){
    setError('');setLoading(true);
    try{const query=new URLSearchParams();if(search.trim())query.set('search',search.trim());if(statusFilter!=='ALL')query.set('status',statusFilter);if(departmentFilter!=='ALL')query.set('department',departmentFilter);const result=await request<{items:Employee[]}>(`/hr/employees?${query}`);setItems(result.items);}
    catch(e){setError((e as Error).message)}finally{setLoading(false)}
  }
  useEffect(()=>{const timer=setTimeout(()=>void load(),160);return()=>clearTimeout(timer)},[search,statusFilter,departmentFilter]);
  function startNew(){setEditing(undefined);setForm(blank());setOpen(true)}
  function startEdit(item:Employee){setEditing(item);setForm({employeeNumber:item.employeeNumber,fullName:item.fullName,workEmail:item.workEmail,jobTitle:item.jobTitle,department:item.department,officeLocation:item.officeLocation,startDate:String(item.startDate).slice(0,10),status:item.status,contractType:item.contractType});setOpen(true)}
  async function save(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();setError('');
    try{await request(`/hr/employees${editing?`/${editing.id}`:''}`,{method:editing?'PUT':'POST',body:JSON.stringify(form)});setOpen(false);setToast(editing?'Ficha laboral actualizada.':'Empleado registrado.');setTimeout(()=>setToast(''),2800);await load();}
    catch(e){setError((e as Error).message)}
  }
  async function deactivate(item:Employee){
    if(!window.confirm(`¿Desactivar a ${item.fullName}? La ficha se conservará en el historial.`))return;
    try{await request(`/hr/employees/${item.id}`,{method:'DELETE'});setToast('Empleado desactivado.');setTimeout(()=>setToast(''),2800);await load();}
    catch(e){setError((e as Error).message)}
  }

  return <>
    <section className="hero page-hero"><div><span className="eyebrow">EQUIPO NEXUS</span><h2>Talento humano</h2><p>Directorio, áreas y modalidades de vinculación del equipo.</p></div>{canWrite&&<button onClick={startNew}>+ Registrar empleado</button>}</section>
    {error&&<div className="error" role="alert">{error}</div>}{toast&&<Toast message={toast}/>}
    <section className="erp-kpis hr-kpis"><article className="stat-card"><span>Personas en el directorio</span><strong>{totals.total}</strong><small>Equipo interno y colaboradores</small></article><article className="stat-card"><span>Activos</span><strong>{totals.active}</strong><small>Vinculación vigente</small></article><article className="stat-card"><span>En licencia</span><strong>{totals.onLeave}</strong><small>Fuera de operación temporalmente</small></article></section>
    <section className="card"><div className="toolbar hr-toolbar"><div><h3>Directorio laboral</h3><p className="muted">La cuenta de acceso al sistema se administra en Usuarios por separado.</p></div><div className="hr-filters"><input aria-label="Buscar equipo" placeholder="Buscar por nombre, correo, cargo…" value={search} onChange={e=>setSearch(e.target.value)}/><select aria-label="Filtrar por estado" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="ALL">Todos los estados</option>{Object.entries(statuses).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><select aria-label="Filtrar por área" value={departmentFilter} onChange={e=>setDepartmentFilter(e.target.value)}><option value="ALL">Todas las áreas</option>{departments.map(dep=><option key={dep}>{dep}</option>)}</select></div></div>
      {loading?<p className="empty">Cargando directorio…</p>:!items.length?<p className="empty">No hay empleados para estos filtros.</p>:<div className="table-wrap"><table><thead><tr><th>Colaborador</th><th>Cargo / área</th><th>Sede</th><th>Ingreso</th><th>Vinculación</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{items.map(item=><tr key={item.id}><td><strong>{item.fullName}</strong><small className="cell-sub">{item.employeeNumber} · {item.workEmail}</small></td><td>{item.jobTitle}<small className="cell-sub">{item.department}</small></td><td>{locations[item.officeLocation]||item.officeLocation}</td><td>{String(item.startDate).slice(0,10)}</td><td>{contractTypes[item.contractType]||item.contractType}</td><td><span className={`status-pill ${item.status==='ACTIVE'?'on':item.status==='INACTIVE'?'off':''}`}>{statuses[item.status]||item.status}</span></td><td className="hr-row-actions">{canWrite&&<><button className="link" onClick={()=>startEdit(item)}>Editar</button>{item.status!=='INACTIVE'&&<button className="link danger-link" onClick={()=>void deactivate(item)}>Desactivar</button>}</>}</td></tr>)}</tbody></table></div>}
    </section>
    {open&&<Modal title={editing?'Editar ficha laboral':'Registrar empleado'} onClose={()=>setOpen(false)}><form className="modal-form" onSubmit={save}>
      <label>Número de empleado<input required maxLength={24} pattern="[A-Za-z0-9_-]+" value={form.employeeNumber} onChange={e=>setForm({...form,employeeNumber:e.target.value})} placeholder="NX-EMP-021"/></label>
      <label>Nombre completo<input required maxLength={160} value={form.fullName} onChange={e=>setForm({...form,fullName:e.target.value})}/></label>
      <label>Correo laboral<input required type="email" maxLength={254} value={form.workEmail} onChange={e=>setForm({...form,workEmail:e.target.value})} placeholder="nombre@nexus.example"/></label>
      <label>Cargo<input required maxLength={120} value={form.jobTitle} onChange={e=>setForm({...form,jobTitle:e.target.value})}/></label>
      <label>Área<input required maxLength={80} value={form.department} onChange={e=>setForm({...form,department:e.target.value})} placeholder="Producto e Ingeniería"/></label>
      <label>Sede<select value={form.officeLocation} onChange={e=>setForm({...form,officeLocation:e.target.value})}>{Object.entries(locations).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
      <label>Fecha de ingreso<input required type="date" max={new Date().toISOString().slice(0,10)} value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})}/></label>
      <label>Tipo de vinculación<select value={form.contractType} onChange={e=>setForm({...form,contractType:e.target.value})}>{Object.entries(contractTypes).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
      {editing&&<label>Estado<select value={form.status} onChange={e=>setForm({...form,status:e.target.value as Form['status']})}>{Object.entries(statuses).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>}
      <p className="hr-privacy-note full-field">Esta ficha guarda solo información laboral básica. No incluye identificaciones, datos bancarios ni compensación.</p>
      <div className="modal-actions full-field"><button type="button" className="ghost" onClick={()=>setOpen(false)}>Cancelar</button><button>{editing?'Guardar cambios':'Registrar empleado'}</button></div>
    </form></Modal>}
  </>;
}
