import { useEffect, useState } from 'react';
import { managedApi } from '../../services/api';
import { useAuth } from '../../app/AuthContext';
import { Modal } from '../../components/Modal';

const stateLabels: Record<string,string> = { OPEN:'Abierto', ACKNOWLEDGED:'Reconocido', IN_PROGRESS:'En atención', RESOLVED:'Resuelto', WONT_FIX:'No se corregirá' };
const severityLabels: Record<string,string> = { CRITICAL:'Crítica', HIGH:'Alta', MEDIUM:'Media', LOW:'Baja' };
const kindLabels: Record<string,string> = { CONTROL_MISSING:'Control faltante', CONFIGURATION_DRIFT:'Desviación de configuración', AVAILABILITY:'Disponibilidad' };
const states = ['OPEN','ACKNOWLEDGED','IN_PROGRESS','RESOLVED','WONT_FIX'];

export function FindingsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [creatingId, setCreatingId] = useState('');
  const [editing, setEditing] = useState<any>();
  const [nextStatus, setNextStatus] = useState('OPEN');
  const canCreateOrder = ['ADMIN','IT_OPERATIONS','PMO'].includes(user?.role ?? '');
  const canEditStatus = ['ADMIN','IT_OPERATIONS','TECHNICIAN'].includes(user?.role ?? '');
  const load = () => managedApi.findings().then((result) => setItems(result.items)).catch((cause) => setError(cause.message));

  useEffect(() => {
    void load();
    managedApi.contracts().then((result) => setContracts(result.items)).catch((cause) => setError(cause.message));
  }, []);

  async function createWorkOrder(findingId: string) {
    setError(''); setNotice(''); setCreatingId(findingId);
    try { const order = await managedApi.createWorkOrderFromFinding(findingId); setNotice(`Orden de trabajo ${order.code} creada.`); }
    catch (cause) { setError((cause as Error).message); }
    finally { setCreatingId(''); }
  }

  async function saveStatus(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editing) return;
    setError('');
    try {
      await managedApi.setFindingStatus(editing.id,nextStatus);
      setEditing(undefined); setNotice('Estado del hallazgo actualizado.'); await load();
    } catch (cause) { setError((cause as Error).message); }
  }

  return <>
    <section className="hero page-hero">
      <div><span className="eyebrow">OPERACIÓN</span><h2>Hallazgos</h2><p>Brechas deducidas de la configuración inventariada.</p></div>
      <button disabled={!contracts.length} onClick={() => managedApi.generateFindings(contracts[0].id).then(load).catch((cause) => setError(cause.message))}>Generar desde contrato</button>
    </section>
    {error && !editing && <p className="error" role="alert">{error}</p>}
    {notice && <p className="success" role="status">{notice}</p>}
    <section className="card">
      <div className="table-wrap">
        <table><thead><tr><th>Activo</th><th>Hallazgo</th><th>Severidad</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>{items.map((finding) => <tr key={finding.id}>
            <td>{finding.asset_name}</td>
            <td>{kindLabels[finding.kind] || finding.kind}{finding.signal_key && <small className="cell-sub">Señal: {finding.signal_key}</small>}</td>
            <td><span className={`severity-pill severity-${String(finding.severity).toLowerCase()}`}>{severityLabels[finding.severity] || finding.severity}</span></td>
            <td><span className={`status-pill ${['RESOLVED','WONT_FIX'].includes(finding.status)?'off':'on'}`}>{stateLabels[finding.status] || finding.status}</span></td>
            <td className="finding-actions">
              {canEditStatus && <button className="link" onClick={() => { setError(''); setEditing(finding); setNextStatus(finding.status); }}>Editar estado</button>}
              {canCreateOrder && <button className="ghost" disabled={creatingId === finding.id} onClick={() => void createWorkOrder(finding.id)}>{creatingId === finding.id ? 'Creando…' : 'Crear orden de trabajo'}</button>}
            </td>
          </tr>)}</tbody>
        </table>
        {!items.length && <p className="empty">No hay hallazgos registrados.</p>}
      </div>
    </section>
    {editing && <Modal title="Editar estado del hallazgo" onClose={() => {setEditing(undefined);setError('');}}>
      <form className="modal-form" onSubmit={saveStatus}>
        {error && <div className="error full-field" role="alert">{error}</div>}
        <label className="full-field">Activo<input value={editing.asset_name || ''} disabled /></label>
        <label className="full-field">Estado<select value={nextStatus} onChange={(event) => setNextStatus(event.target.value)}>{states.map((state) => <option value={state} key={state}>{stateLabels[state]}</option>)}</select></label>
        <div className="modal-actions"><button type="button" className="ghost" onClick={() => {setEditing(undefined);setError('');}}>Cancelar</button><button>Guardar cambios</button></div>
      </form>
    </Modal>}
  </>;
}
