export type CatalogPriority = 'HIGH' | 'MEDIUM' | 'LOW';
export type CatalogCategoryKey = 'SECURITY_CCTV' | 'NETWORK_INFRASTRUCTURE' | 'IOT_BUILDING' | 'UNKNOWN';

function normalizeKey(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function normalizeCatalogPriority(value: string): CatalogPriority | null {
  const key = normalizeKey(value);
  if (key === 'alta' || key === 'high') return 'HIGH';
  if (key === 'media' || key === 'medium') return 'MEDIUM';
  if (key === 'baja' || key === 'low') return 'LOW';
  return null;
}

export function catalogCategoryKey(value: string): CatalogCategoryKey {
  const key = normalizeKey(value);
  if (key.includes('seguridad') || key.includes('cctv')) return 'SECURITY_CCTV';
  if (key.includes('redes') || key.includes('infraestructura')) return 'NETWORK_INFRASTRUCTURE';
  if (key.includes('iot') || key.includes('edificio')) return 'IOT_BUILDING';
  return 'UNKNOWN';
}

export function splitCatalogValues(value: string): string[] {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

