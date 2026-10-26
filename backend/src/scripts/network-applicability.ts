export type NetworkControl = 'NETFLOW' | 'SYSLOG' | 'SNMP' | 'NTP' | 'SSH' | 'AAA' | 'HSRP';
export type ControlStatus = 'CONFIGURED' | 'NOT_DETECTED' | 'NOT_APPLICABLE';

function normalizedRole(role: string): string {
  return role.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function isControlApplicable(control: NetworkControl, role: string): boolean {
  const value = normalizedRole(role);
  const isCoreL3 = value.includes('core') && value.includes('l3');
  const isRouter = value.includes('router') || value.includes('wan / internet');

  if (control === 'HSRP') return isCoreL3;
  if (control === 'NETFLOW') return isCoreL3 || isRouter;
  return true;
}

export function controlStatus(
  control: NetworkControl,
  role: string,
  configured: boolean | null,
): ControlStatus {
  if (!isControlApplicable(control, role)) return 'NOT_APPLICABLE';
  return configured === true ? 'CONFIGURED' : 'NOT_DETECTED';
}

