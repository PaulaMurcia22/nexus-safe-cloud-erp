import { useEffect, useState } from 'react';
import { managedApi } from '../../services/api';
import { SyntheticBadge } from '../../components/SyntheticBadge';

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
          <thead><tr><th>Código</th><th>Cliente</th><th>Vigencia</th><th>Estado</th><th>Mensualidad</th><th>Origen</th></tr></thead>
          <tbody>{items.map((contract) => <tr key={contract.id} onClick={() => void showContract(contract.id)}>
            <td>{contract.code}</td><td>{contract.customer_name}</td><td>{contract.starts_on} – {contract.ends_on ?? 'abierto'}</td>
            <td>{contract.status}</td><td>{Number(contract.monthly_fee).toLocaleString('es-CO')}</td><td><SyntheticBadge origin={contract.data_origin} /></td>
          </tr>)}</tbody>
        </table>
      </div>
      {active && <div className="card">
        <h3>Alcance · {active.code}<SyntheticBadge origin={active.data_origin} /></h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Activo</th><th>Categoría</th><th>Señal</th><th>Incluida</th></tr></thead>
            <tbody>{active.scope?.map((item: any) => <tr key={item.id}>
              <td>{item.asset_name}</td><td>{item.category}</td><td>{item.signal_key}</td><td>{item.included ? 'Sí' : 'No'}</td>
            </tr>)}</tbody>
          </table>
          {!active.scope?.length && <p className="empty">Este contrato no tiene elementos de alcance.</p>}
        </div>
      </div>}
    </section>
  </>;
}
