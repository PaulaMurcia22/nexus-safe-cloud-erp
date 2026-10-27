import { useState } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { RequireAuth } from './RequireAuth';
import { LoginPage } from '../modules/auth/LoginPage';
import { ClientsPage } from '../modules/clients/ClientsPage';
import { ProjectsPage } from '../modules/projects/ProjectsPage';
import { UsersPage } from '../modules/users/UsersPage';
import { NetworkPage } from '../modules/network/NetworkPage';
import { ManagedDashboard } from '../modules/dashboard/ManagedDashboard';
import { ContractsPage } from '../modules/service/ContractsPage';
import { FindingsPage } from '../modules/service/FindingsPage';
import { WorkPage } from '../modules/service/WorkPage';
import { BillingPage } from '../modules/service/BillingPage';
import { IotDashboardPage } from '../modules/iot/IotDashboardPage';
import { OpportunitiesPage } from '../modules/crm/OpportunitiesPage';
import { SubscriptionsPage } from '../modules/subscriptions/SubscriptionsPage';
import { ProcurementPage } from '../modules/procurement/ProcurementPage';
import { HrPage } from '../modules/hr/HrPage';
import { AccountingPage } from '../modules/accounting/AccountingPage';
import './styles.css';

const can = (role: string | undefined, roles: string[]) => !!role && roles.includes(role);
const roles = {
  clients: ['ADMIN','MANAGEMENT','COMMERCIAL','FINANCE','IT_OPERATIONS','PMO'],
  contracts: ['ADMIN','MANAGEMENT','COMMERCIAL','FINANCE','IT_OPERATIONS','PMO'],
  findings: ['ADMIN','MANAGEMENT','COMMERCIAL','IT_OPERATIONS','PMO'],
  work: ['ADMIN','MANAGEMENT','IT_OPERATIONS','PMO','TECHNICIAN'],
  billing: ['ADMIN','MANAGEMENT','FINANCE','PMO'],
  network: ['ADMIN','MANAGEMENT','IT_OPERATIONS','PMO'],
  iot: ['ADMIN','MANAGEMENT','IT_OPERATIONS','PMO'],
  opportunities: ['ADMIN','MANAGEMENT','COMMERCIAL'],
  subscriptions: ['ADMIN','MANAGEMENT','COMMERCIAL','FINANCE'],
  procurement: ['ADMIN','MANAGEMENT','FINANCE','IT_OPERATIONS'],
  hr: ['ADMIN','MANAGEMENT'],
  accounting: ['ADMIN','MANAGEMENT','FINANCE'],
  projects: ['ADMIN','IT_OPERATIONS','PMO'],
};

function Layout() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const role = auth.user?.role;
  const [touchMenu,setTouchMenu]=useState('');
  const activeGroup = (paths: string[]) => paths.some((path) => pathname.startsWith(path));
  const navLink = (path: string, label: string, exact = false) => (
    <Link key={path} to={path} onClick={()=>setTouchMenu('')} className={(exact ? pathname === path : pathname.startsWith(path)) ? 'current' : ''}>
      {label}
    </Link>
  );

  return <div className="shell">
    <header className="app-header">
      <Link className="brand-link" to="/" aria-label="Nexus Safe-Cloud, ir al inicio" title="Ir al inicio">
        <span className="eyebrow">AST SOLUTIONS</span>
        <span className="brand-name">Nexus <em>Safe-Cloud</em></span>
      </Link>
      <div className="header-tools">
        <nav className="primary-nav" aria-label="Navegación principal">
          <Link className={`nav-home ${pathname === '/' ? 'current' : ''}`} to="/">Inicio</Link>
          <div className={`nav-group ${touchMenu==='Comercial'?'is-open':''} ${activeGroup(['/clients','/opportunities','/subscriptions']) ? 'group-current' : ''}`} onMouseEnter={()=>setTouchMenu('Comercial')} onMouseLeave={()=>{if(!window.matchMedia('(hover: none)').matches)setTouchMenu('')}}>
            <button type="button" className="nav-trigger" aria-haspopup="true" aria-expanded={touchMenu==='Comercial'} onMouseDown={(event)=>event.preventDefault()} onClick={()=>{if(window.matchMedia('(hover: none)').matches)setTouchMenu('Comercial')}}>Comercial</button><div className="nav-menu">
              {can(role,roles.clients)&&navLink('/clients','Clientes')}
              {can(role,roles.opportunities)&&navLink('/opportunities','Oportunidades')}
              {can(role,roles.subscriptions)&&navLink('/subscriptions','Suscripciones')}
            </div>
          </div>
          <div className={`nav-group ${touchMenu==='Operación'?'is-open':''} ${activeGroup(['/projects','/service-contracts','/findings','/work-orders','/network','/iot']) ? 'group-current' : ''}`} onMouseEnter={()=>setTouchMenu('Operación')} onMouseLeave={()=>{if(!window.matchMedia('(hover: none)').matches)setTouchMenu('')}}>
            <button type="button" className="nav-trigger" aria-haspopup="true" aria-expanded={touchMenu==='Operación'} onMouseDown={(event)=>event.preventDefault()} onClick={()=>{if(window.matchMedia('(hover: none)').matches)setTouchMenu('Operación')}}>Operación</button><div className="nav-menu">
              {can(role,roles.projects)&&navLink('/projects','Proyectos')}
              {can(role,roles.contracts)&&navLink('/service-contracts','Contratos y alcance')}
              {can(role,roles.findings)&&navLink('/findings','Hallazgos')}
              {can(role,roles.work)&&navLink('/work-orders','Órdenes y horas')}
              {can(role,roles.network)&&navLink('/network','Red e infraestructura')}
              {can(role,roles.iot)&&navLink('/iot','Métricas IoT')}
            </div>
          </div>
          <div className={`nav-group ${touchMenu==='Finanzas'?'is-open':''} ${activeGroup(['/billing','/procurement','/accounting']) ? 'group-current' : ''}`} onMouseEnter={()=>setTouchMenu('Finanzas')} onMouseLeave={()=>{if(!window.matchMedia('(hover: none)').matches)setTouchMenu('')}}>
            <button type="button" className="nav-trigger" aria-haspopup="true" aria-expanded={touchMenu==='Finanzas'} onMouseDown={(event)=>event.preventDefault()} onClick={()=>{if(window.matchMedia('(hover: none)').matches)setTouchMenu('Finanzas')}}>Finanzas</button><div className="nav-menu">
              {can(role,roles.billing)&&navLink('/billing','Facturación y cartera')}
              {can(role,roles.procurement)&&navLink('/procurement','Compras y gastos')}
              {can(role,roles.accounting)&&navLink('/accounting','Contabilidad')}
            </div>
          </div>
          {(can(role,roles.hr)||role==='ADMIN')&&<div className={`nav-group ${touchMenu==='Administración'?'is-open':''} ${activeGroup(['/hr','/users']) ? 'group-current' : ''}`} onMouseEnter={()=>setTouchMenu('Administración')} onMouseLeave={()=>{if(!window.matchMedia('(hover: none)').matches)setTouchMenu('')}}>
            <button type="button" className="nav-trigger" aria-haspopup="true" aria-expanded={touchMenu==='Administración'} onMouseDown={(event)=>event.preventDefault()} onClick={()=>{if(window.matchMedia('(hover: none)').matches)setTouchMenu('Administración')}}>Administración</button><div className="nav-menu">
              {can(role,roles.hr)&&navLink('/hr','Equipo')}
              {role==='ADMIN'&&navLink('/users','Usuarios y accesos')}
            </div>
          </div>}
        </nav>
        <button className="logout-button" onClick={async()=>{await auth.logout();navigate('/login');}}>Cerrar sesión</button>
      </div>
    </header>
    <main><Routes>
      <Route path="/" element={<ManagedDashboard/>}/>
      <Route path="/clients" element={can(role,roles.clients)?<ClientsPage/>:<Navigate to="/" replace/>}/>
      <Route path="/clients/:id" element={<Navigate to="/clients" replace/>}/>
      <Route path="/opportunities" element={can(role,roles.opportunities)?<OpportunitiesPage/>:<Navigate to="/" replace/>}/>
      <Route path="/subscriptions" element={can(role,roles.subscriptions)?<SubscriptionsPage/>:<Navigate to="/" replace/>}/>
      <Route path="/procurement" element={can(role,roles.procurement)?<ProcurementPage/>:<Navigate to="/" replace/>}/>
      <Route path="/hr" element={can(role,roles.hr)?<HrPage/>:<Navigate to="/" replace/>}/>
      <Route path="/accounting" element={can(role,roles.accounting)?<AccountingPage/>:<Navigate to="/" replace/>}/>
      <Route path="/projects" element={can(role,roles.projects)?<ProjectsPage/>:<Navigate to="/" replace/>}/>
      <Route path="/service-contracts" element={can(role,roles.contracts)?<ContractsPage/>:<Navigate to="/" replace/>}/>
      <Route path="/findings" element={can(role,roles.findings)?<FindingsPage/>:<Navigate to="/" replace/>}/>
      <Route path="/work-orders" element={can(role,roles.work)?<WorkPage/>:<Navigate to="/" replace/>}/>
      <Route path="/billing" element={can(role,roles.billing)?<BillingPage/>:<Navigate to="/" replace/>}/>
      <Route path="/network" element={can(role,roles.network)?<NetworkPage/>:<Navigate to="/" replace/>}/>
      <Route path="/iot" element={can(role,roles.iot)?<IotDashboardPage/>:<Navigate to="/" replace/>}/>
      <Route path="/users" element={role==='ADMIN'?<UsersPage/>:<Navigate to="/" replace/>}/>
    </Routes></main>
    <footer>ERP modular · sesión protegida</footer>
  </div>;
}

export function App() {
  return <BrowserRouter><AuthProvider><Routes>
    <Route path="/login" element={<LoginPage/>}/>
    <Route path="*" element={<RequireAuth><Layout/></RequireAuth>}/>
  </Routes></AuthProvider></BrowserRouter>;
}
