export type CatalogMapping = {
  equipmentType: string;
  confidence: 'HIGH' | 'LOW';
  basis: string;
};

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function mapAssetToCatalog(
  category: string,
  role: string | null,
  model: string | null,
): CatalogMapping | null {
  const normalizedRole = normalize(role ?? '');
  const normalizedModel = normalize(model ?? '');

  if (category === 'NETWORK_INFRASTRUCTURE') {
    if (normalizedRole.includes('switch') || normalizedRole.includes('core') || normalizedRole.includes('acceso')) {
      return { equipmentType: 'Switch administrable', confidence: 'HIGH', basis: 'Rol de origen identifica switch de núcleo o acceso.' };
    }
    if (normalizedRole.includes('router') || normalizedRole.includes('wan') || normalizedRole.includes('firewall')) {
      return { equipmentType: 'Router / Firewall', confidence: 'HIGH', basis: 'Rol de origen identifica router WAN o firewall.' };
    }
  }

  if (category === 'SERVER') {
    return { equipmentType: 'Servidor', confidence: 'HIGH', basis: 'Categoría del inventario identifica servidor.' };
  }

  if (category === 'CCTV_IOT' && normalizedModel === 'webcam') {
    return { equipmentType: 'Cámara IP fija', confidence: 'LOW', basis: 'Modelo de origen dice Webcam; no hay ficha del fabricante ni señales confirmadas.' };
  }

  return null;
}

