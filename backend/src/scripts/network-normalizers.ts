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

export function parseVlanPool(value: unknown): { number: number; sourceName: string; name: string; sensitive: boolean } | null {
  const sourceName = String(value ?? '').trim();
  const match = sourceName.match(/^VLAN\s*(\d+)[_-](.+)$/i);
  if (!match) return null;
  const number = Number(match[1]);
  const name = match[2].replace(/[_-]+/g, ' ').trim();
  if (number < 1 || number > 4094 || !name) return null;
  const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return { number, sourceName, name, sensitive: /biometr|signos.?vitales|mon.?signos/.test(normalized) };
}

export function ipv4InCidr(ipValue: string, cidrValue: string): boolean {
  const [address, prefixText] = cidrValue.split('/');
  const ip = toIpv4Number(ipValue);
  const network = toIpv4Number(address);
  const prefix = Number(prefixText);
  if (ip === null || network === null || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) return false;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (ip & mask) === (network & mask);
}

function toIpv4Number(value: string): number | null {
  const parts = value.split('.');
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part) || Number(part) > 255)) return null;
  return parts.reduce((total, part) => ((total << 8) | Number(part)) >>> 0, 0);
}

export function inferVlanPoolName(assetName: string, model: string | null): string | null {
  const clean = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\(\d+\)/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const name = clean(assetName);
  const deviceModel = clean(model ?? '');
  if (deviceModel === 'webcam') return 'VLAN15_CCTV';
  if (/rfid (card|reader)/.test(deviceModel)) return 'VLAN40_Biometrico';

  const aliases: Record<string, string[]> = {
    VLAN10_Emergencias: ['emergencias'],
    VLAN15_CCTV: ['cctv'],
    VLAN20_copago: ['copago', 'copagos'],
    VLAN25_Detector_de_Humo: ['detector de humo'],
    VLAN30_Mon_signos_vitales: ['signosvitales', 'signos vitales'],
    VLAN35_Pantallas: ['pantallas'],
    VLAN45_Digiturno: ['digiturno'],
    VLAN50_Pediatria: ['pediatria'],
    VLAN55_Med_General: ['medicina general'],
    VLAN60_Odontologia: ['odontologia'],
    VLAN65_Fisioterapia: ['fisioterapia'],
    VLAN70_talento_Humano: ['talento humano'],
    VLAN75_Administracion: ['administracion'],
    'VLAN80_WI-FI': ['wi fi', 'wifi'],
    VLAN85_Laboratorios: ['laboratorio', 'laboratorios'],
    VLAN90_Trabajo_Social: ['trabajo social'],
  };
  return Object.entries(aliases).find(([, values]) => values.includes(name))?.[0] ?? null;
}
