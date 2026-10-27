import type {Client,Project,User,NetworkAsset,NetworkDashboard,NetworkLink,NetworkVlan,NetworkPool,NetworkImport,NetworkIssue} from '../types'; const base=import.meta.env.VITE_API_URL||'http://localhost:3001/api';
async function request<T>(path:string,options?:RequestInit):Promise<T>{const r=await fetch(`${base}${path}`,{credentials:'include',headers:{'Content-Type':'application/json',...options?.headers},...options});const b=await r.json().catch(()=>null);if(!r.ok)throw new Error(b?.error||'No fue posible completar la operación.');return b as T;}
export const api={login:(d:unknown)=>request<{user:User}>('/auth/login',{method:'POST',body:JSON.stringify(d)}),me:()=>request<{user:User|null}>('/auth/me'),logout:()=>request<void>('/auth/logout',{method:'POST'}),users:(s='')=>request<User[]>(`/users${s?`?search=${encodeURIComponent(s)}`:''}`),createUser:(d:unknown)=>request<User>('/users',{method:'POST',body:JSON.stringify(d)}),updateUser:(id:string,d:unknown)=>request<User>(`/users/${id}`,{method:'PUT',body:JSON.stringify(d)}),clients:(s='')=>request<Client[]>(`/clients${s?`?search=${encodeURIComponent(s)}`:''}`),saveClient:(d:unknown,id?:string)=>request<Client>(id?`/clients/${id}`:'/clients',{method:id?'PUT':'POST',body:JSON.stringify(d)}),projects:(q='')=>request<Project[]>(`/projects${q?`?${q}`:''}`),createProject:(d:unknown)=>request<Project>('/projects',{method:'POST',body:JSON.stringify(d)}),updateProject:(id:string,d:unknown)=>request<Project>(`/projects/${id}`,{method:'PUT',body:JSON.stringify(d)}),network:{dashboard:()=>request<NetworkDashboard>('/network/summary'),assets:(q='')=>request<{items:NetworkAsset[];total:number;page:number;pageSize:number}>(`/network/assets${q?`?${q}`:''}`),asset:(id:string)=>request<NetworkAsset>(`/network/assets/${id}`),links:(q='')=>request<{items:NetworkLink[];page:number;pageSize:number}>(`/network/links${q?`?${q}`:''}`),vlans:()=>request<{items:NetworkVlan[]}>('/network/vlans'),pools:()=>request<{items:NetworkPool[]}>('/network/dhcp-pools'),imports:(q='')=>request<{items:NetworkImport[];page:number;pageSize:number}>(`/network/imports${q?`?${q}`:''}`),issues:(id:string)=>request<{items:NetworkIssue[]}>(`/network/imports/${id}/issues`),latestIssues:()=>request<{items:NetworkIssue[]}>('/network/issues'),sites:()=>request<{items:Array<Record<string,unknown>>}>('/network/sites'),customFields:()=>request<{items:Array<Record<string,unknown>>}>('/network/custom-fields'),monitoring:()=>request<{items:Array<Record<string,unknown>>}>('/network/monitoring-technologies'),bulkAssign:(d:unknown)=>request<{updated:number}>('/network/assets/bulk-assignment',{method:'POST',body:JSON.stringify(d)}),saveExtraValues:(id:string,d:unknown)=>request<NetworkAsset>(`/network/assets/${id}/extra-values`,{method:'PUT',body:JSON.stringify(d)}),createCustomField:(d:unknown)=>request<Record<string,unknown>>('/network/custom-fields',{method:'POST',body:JSON.stringify(d)}),deactivateCustomField:(id:string)=>request<Record<string,unknown>>(`/network/custom-fields/${id}`,{method:'DELETE'}),confirmCollector:(id:string,d:unknown)=>request<Record<string,unknown>>(`/network/monitoring-technologies/${id}/collector-confirmation`,{method:'PUT',body:JSON.stringify(d)}),retireAsset:(id:string)=>request<void>(`/network/assets/${id}/retire`,{method:'POST'}),retireLink:(id:string)=>request<void>(`/network/links/${id}/retire`,{method:'POST'}),retirePool:(id:string)=>request<void>(`/network/dhcp-pools/${id}/retire`,{method:'POST'})}};

export interface PageResult<T>{items:T[];total:number;page:number;pageSize:number}
const paged=(resource:string,search:string,page:number,pageSize:number)=>request<PageResult<unknown>>(`/${resource}?${new URLSearchParams({...(search?{search}:{}),page:String(page),pageSize:String(pageSize)})}`);
export const pagedApi={users:(search:string,page:number,pageSize=20)=>paged('users',search,page,pageSize) as Promise<PageResult<User>>,clients:(search:string,page:number,pageSize=20)=>paged('clients',search,page,pageSize) as Promise<PageResult<Client>>,projects:(status:string,page:number,pageSize=20)=>request<PageResult<Project>>(`/projects?${new URLSearchParams({...(status?{status}:{}),page:String(page),pageSize:String(pageSize)})}`)};

export const managedApi={
  dashboardSummary:()=>request<Record<string,any>>('/dashboard/summary'),
  clientOverview:(id:string)=>request<Record<string,any>>(`/clients/${id}/overview`),
  contracts:()=>request<{items:Array<Record<string,any>>}>('/service-contracts'),
  contract:(id:string)=>request<Record<string,any>>(`/service-contracts/${id}`),
  createContract:(d:unknown)=>request<Record<string,any>>('/service-contracts',{method:'POST',body:JSON.stringify(d)}),
  findings:(q='')=>request<{items:Array<Record<string,any>>}>(`/findings${q?`?${q}`:''}`),
  generateFindings:(contractId:string)=>request<{created:number}>('/findings/generate?contractId='+encodeURIComponent(contractId),{method:'POST'}),
  setFindingStatus:(id:string,status:string)=>request<Record<string,any>>(`/findings/${id}/status`,{method:'PATCH',body:JSON.stringify({status})}),
  createWorkOrder:(id:string)=>request<Record<string,any>>(`/findings/${id}/work-order`,{method:'POST'}),
  workOrders:()=>request<{items:Array<Record<string,any>>}>('/work-orders'),
  technicians:()=>request<{items:Array<Record<string,any>>}>('/work-orders/technicians'),
  createWorkOrder:(d:unknown)=>request<Record<string,any>>('/work-orders',{method:'POST',body:JSON.stringify(d)}),
  updateWorkOrder:(id:string,d:unknown)=>request<Record<string,any>>(`/work-orders/${id}`,{method:'PUT',body:JSON.stringify(d)}),
  timeEntries:(own=false)=>request<{items:Array<Record<string,any>>}>(own?'/time-entries/mine':'/time-entries'),
  updateWorkStatus:(id:string,status:string)=>request<Record<string,any>>(`/work-orders/${id}/status`,{method:'PATCH',body:JSON.stringify({status})}),
  addTime:(id:string,d:unknown)=>request<Record<string,any>>(`/work-orders/${id}/time-entries`,{method:'POST',body:JSON.stringify(d)}),
  updateTimeEntry:(id:string,d:unknown)=>request<Record<string,any>>(`/time-entries/${id}`,{method:'PUT',body:JSON.stringify(d)}),
  deleteTimeEntry:(id:string)=>request<void>(`/time-entries/${id}`,{method:'DELETE'}),
  invoices:()=>request<{items:Array<Record<string,any>>}>('/billing/invoices'),
  aging:()=>request<{items:Array<Record<string,any>>}>('/billing/aging'),
  milestones:()=>request<{items:Array<Record<string,any>>}>('/billing/milestones'),
  createMilestone:(d:unknown)=>request<Record<string,any>>('/billing/milestones',{method:'POST',body:JSON.stringify(d)}),
  closeMilestone:(id:string)=>request<Record<string,any>>(`/billing/milestones/${id}/close`,{method:'POST'}),
  issueInvoice:(id:string,dueDate:string)=>request<Record<string,any>>(`/billing/invoices/${id}/issue`,{method:'POST',body:JSON.stringify({dueDate,taxRate:0})}),
  payInvoice:(id:string)=>request<Record<string,any>>(`/billing/invoices/${id}/pay`,{method:'POST',body:JSON.stringify({})}),
  impact:(assetId:string)=>request<{impactedAssetIds:string[]}>(`/network/assets/${assetId}/impact`),
  topology:()=>request<{nodes:Array<Record<string,any>>;edges:Array<Record<string,any>>}>('/network/topology'),
  async download(resource:'assets'|'findings'|'receivables'){const r=await fetch(`${base}/reports/${resource}.xlsx`,{credentials:'include'});if(!r.ok)throw new Error('No fue posible exportar el reporte.');return r.blob();},
};
