export function normalizeSerial(value: unknown): { raw: string | null; normalized: string | null } {
  if (value === null || value === undefined || String(value).trim() === '') return { raw: null, normalized: null };
  const raw = String(value).trim();
  const normalized = raw.replace(/\s+/g, '').replace(/-+$/g, '').toUpperCase();
  return { raw, normalized: normalized || null };
}
export function normalizeIp(value: unknown): string[] {
  return splitMulti(value).map(v => v.trim()).filter(Boolean).filter(v => {
    const parts = v.split('.'); return parts.length === 4 && parts.every(p => /^\d{1,3}$/.test(p) && Number(p) <= 255);
  });
}
export function normalizeMac(value: unknown): string[] {
  return splitMulti(value).map(v => v.trim()).filter(Boolean).map(v => v.replace(/[^a-f\d]/gi, '').toUpperCase())
    .filter(v => /^[A-F\d]{12}$/.test(v)).map(v => v.match(/.{2}/g)!.join(':'));
}
export function normalizeBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  const v = String(value ?? '').trim().toLowerCase();
  if (['true','sí','si','yes','1','activo','funcional'].includes(v)) return true;
  if (['false','no','0','inactivo','no funcional'].includes(v)) return false;
  return null;
}
export function splitMulti(value: unknown): string[] { return String(value ?? '').split(';').map(v => v.trim()).filter(Boolean); }
export function isRealPool(value: unknown): boolean { return /^VLAN\s*\d+[_-]/i.test(String(value ?? '').trim()); }
