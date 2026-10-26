import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeBoolean, normalizeIp, normalizeMac, normalizeSerial, splitMulti } from '../scripts/network-normalizers.js';
test('serial retains source and removes trailing hyphens for matching',()=>assert.deepEqual(normalizeSerial(' PTT123-- '),{raw:'PTT123--',normalized:'PTT123'}));
test('IP multi values accept valid IPv4 only',()=>assert.deepEqual(normalizeIp('10.0.0.1; 999.1.1.1'),['10.0.0.1']));
test('MAC values become canonical colon form',()=>assert.deepEqual(normalizeMac('aabb.ccdd.eeff; 0011-2233-4455'),['AA:BB:CC:DD:EE:FF','00:11:22:33:44:55']));
test('booleans support Spanish and English',()=>{assert.equal(normalizeBoolean('Sí'),true);assert.equal(normalizeBoolean('No'),false);assert.equal(normalizeBoolean('No aparece'),null);});
test('multi values split semicolon cells',()=>assert.deepEqual(splitMulti('uno; dos'),['uno','dos']));
