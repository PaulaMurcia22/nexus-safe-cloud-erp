import test from 'node:test';
import assert from 'node:assert/strict';
import {hashPassword,verifyPassword,hashSessionToken,roleAllowed,type Role} from '../shared/auth.js';

test('password hashes verify with a salted scrypt hash',async()=>{
  const hash=await hashPassword('demo-password-for-unit-test');
  assert.notEqual(hash,'demo-password-for-unit-test');
  assert.equal(await verifyPassword('demo-password-for-unit-test',hash),true);
  assert.equal(await verifyPassword('incorrect',hash),false);
});
test('persistent session token digest is one-way and deterministic',()=>{
  const token='opaque-session-token';
  const digest=hashSessionToken(token);
  assert.notEqual(digest,token);
  assert.equal(digest.length,64);
  assert.equal(hashSessionToken(token),digest);
});
test('role authorization matches only explicit grants',()=>{
  const allowed:Role[]=['ADMIN','IT_OPERATIONS'];
  assert.equal(roleAllowed('ADMIN',allowed),true);
  assert.equal(roleAllowed('COMMERCIAL',allowed),false);
  assert.equal(roleAllowed(undefined,allowed),false);
});
