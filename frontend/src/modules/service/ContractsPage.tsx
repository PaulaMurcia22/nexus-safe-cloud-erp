import { useEffect, useState } from 'react';
import { managedApi } from '../../services/api';
import { SyntheticBadge } from '../../components/SyntheticBadge';

const contractStates: Record<string,string> = { DRAFT:'Borrador', ACTIVE:'Activo', ENDED:'Finalizado' };
const assetCategories: Record<string,string> = { NETWORK_INFRASTRUCTURE:'Infraestructura de red', CCTV_IOT:'CCTV e IoT', SERVER:'Servidor', SECURITY:'Seguridad' };

export function ContractsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [active, setActive] = useState<any>();
  const [error, setError] = useState('');

  useEffect(() => {
    managedApi.contracts().then((result) => setItems(result.items)).catch((cause) => setError(cause.message));
  }, []);

  async function toggleScope() {
    if (active) {
      setActive(undefined);
      return;
    }
    const firstContract = items[0];
    if (!firstContract) return;
    setError('');
    try {
      setActive(await managedApi.contract(firstContract.id));
    } catch (cause) {
      setError((cause as Error).message);
    }
  }

  async function showContract(contractId: string) {
    setError('');
    try {
      setActive(await managedApi.contract(contractId));
    } catch (cause) {
      setError((cause as Error).message);
    }
  }

  return <>
    <section className="hero page-hero">
      <div><span className="eyebrow">SERVICIO GESTIONADO</span><h2>Contratos y alcance</h2><p>Matriz de equipos y señales incluidas en cada contrato.</p></div>
      <button disabled={!items.length} aria-expanded={Boolean(active)} onClick={() => void toggleScope()}>
        {active ? 'Cerrar alcance' : 'Ver alcance'}
      </button>
    </section>
    <section className="card">
      {error && <p className="error">{error}</p>}
      <div className="table-wrap">
        <table>
          <thead><tr><th>Código</th><th>Cliente</th><th>Vigencia</th><th>Estado</th><th>Mensualidad</th></tr></thead>
          <tbody>{items.map((contract) => <tr key={contract.id} className="contract-row" onClick={() => void showContract(contract.id)} title="Ver alcance del contrato">
            <td>{contract.code}</td><td>{contract.customer_name}</td><td>{contract.starts_on} – {contract.ends_on ?? 'abierto'}</td>
            <td><span className={`status-pill ${contract.status==='ACTIVE'?'on':'off'}`}>{contractStates[contract.status] || contract.status}</span></td><td>{Number(contract.monthly_fee).toLocaleString('es-CO')}</td>
          </tr>)}</tbody>
        </table>
      </div>
      {active && <div className="card contract-scope-panel">
        <div className="contract-scope-heading"><div><span className="eyebrow">DETALLE DEL SERVICIO</span><h3>Alcance · {active.code}<SyntheticBadge origin={active.data_origin} /></h3></div><button className="ghost" onClick={() => setActive(undefined)}>Cerrar detalle</button></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Activo</th><th>Categoría</th><th>Señal</th><th>Incluida</th></tr></thead>
            <tbody>{active.scope?.map((item: any) => <tr key={item.id}>
              <td>{item.asset_name}</td><td>{assetCategories[item.category] || item.category}</td><td>{item.signal_key}</td><td>{item.included ? 'Sí' : 'No'}</td>
            </tr>)}</tbody>
          </table>
          {!active.scope?.length && <p className="empty">Este contrato no tiene elementos de alcance.</p>}
        </div>
      </div>}
    </section>
  </>;
}
