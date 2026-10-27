import { useEffect, useState } from 'react';
import { managedApi } from '../../services/api';
import { useAuth } from '../../app/AuthContext';
import { SyntheticBadge } from '../../components/SyntheticBadge';

export function FindingsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [creatingId, setCreatingId] = useState('');
  const canCreateOrder = ['ADMIN', 'IT_OPERATIONS', 'PMO'].includes(user?.role ?? '');

  const load = () => managedApi.findings().then((result) => setItems(result.items)).catch((cause) => setError(cause.message));

  useEffect(() => {
    void load();
    managedApi.contracts().then((result) => setContracts(result.items)).catch((cause) => setError(cause.message));
  }, []);

  async function createWorkOrder(findingId: string) {
    setError('');
    setNotice('');
    setCreatingId(findingId);
    try {
      const order = await managedApi.createWorkOrder(findingId);
      setNotice(`Orden de trabajo ${order.code} creada.`);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setCreatingId('');
    }
  }

  return <>
    <section className="hero page-hero">
      <div><span className="eyebrow">OPERACIÓN</span><h2>Hallazgos</h2><p>Brechas deducidas de la configuración inventariada.</p></div>
      <button disabled={!contracts.length} onClick={() => managedApi.generateFindings(contracts[0].id).then(load).catch((cause) => setError(cause.message))}>
        Generar desde contrato
      </button>
    </section>
    <section className="card">
      {error && <p className="error">{error}</p>}
      {notice && <p className="success" role="status">{notice}</p>}
      <div className="table-wrap">
        <table>
          <thead><tr><th>Activo</th><th>Hallazgo</th><th>Severidad</th><th>Estado</th><th>Origen</th><th>Acción</th></tr></thead>
          <tbody>{items.map((finding) => <tr key={finding.id}>
            <td>{finding.asset_name}</td><td>{finding.kind} · {finding.signal_key}</td><td>{finding.severity}</td>
            <td><select value={finding.status} onChange={(event) => managedApi.setFindingStatus(finding.id, event.target.value).then(load).catch((cause) => setError(cause.message))}>
              <option>OPEN</option><option>ACKNOWLEDGED</option><option>IN_PROGRESS</option><option>RESOLVED</option><option>WONT_FIX</option>
            </select></td>
            <td><SyntheticBadge origin={finding.data_origin} /></td>
            <td>{canCreateOrder && <button className="ghost" disabled={creatingId === finding.id} onClick={() => void createWorkOrder(finding.id)}>
              {creatingId === finding.id ? 'Creando…' : 'Crear orden de trabajo'}
            </button>}</td>
          </tr>)}</tbody>
        </table>
        {!items.length && <p className="empty">No hay hallazgos registrados.</p>}
      </div>
    </section>
  </>;
}
