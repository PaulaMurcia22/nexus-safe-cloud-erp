import assert from 'node:assert/strict';
import test from 'node:test';
import { controlStatus, isControlApplicable } from '../../../scripts/network-applicability.js';

test('HSRP applies only to core L3 switches', () => {
  assert.equal(isControlApplicable('HSRP', 'Core / Distribución L3'), true);
  assert.equal(isControlApplicable('HSRP', 'Acceso'), false);
  assert.equal(controlStatus('HSRP', 'Acceso', false), 'NOT_APPLICABLE');
});

test('NetFlow applies to routers and core L3, not access or ASA roles', () => {
  assert.equal(isControlApplicable('NETFLOW', 'WAN / Internet'), true);
  assert.equal(isControlApplicable('NETFLOW', 'Core / Distribución L3'), true);
  assert.equal(isControlApplicable('NETFLOW', 'Acceso'), false);
  assert.equal(isControlApplicable('NETFLOW', 'Firewall / Perímetro'), false);
});

test('management controls apply to every managed network role', () => {
  for (const control of ['SYSLOG', 'SNMP', 'NTP', 'SSH', 'AAA'] as const) {
    assert.equal(isControlApplicable(control, 'Acceso'), true);
    assert.equal(controlStatus(control, 'Acceso', null), 'NOT_DETECTED');
  }
});

