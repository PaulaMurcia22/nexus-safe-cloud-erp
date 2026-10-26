import test from 'node:test';
import assert from 'node:assert/strict';
import { requireRoles, createSession, destroySession, type Role } from '../../../shared/auth.js';

function runGuard(role:Role|undefined,allowed:Role[]){
  const token=role?createSession({id:'00000000-0000-4000-8000-000000000001',name:'Test',email:'test@example.invalid',role,status:'ACTIVE'}):undefined;
  let status=200;let nextCalled=false;
  const req={headers:{cookie:token?`nexus_session=${token}`:undefined}} as never;
  const res={locals:{},status(code:number){status=code;return this;},json(){return this;}} as never;
  try {requireRoles(...allowed)(req,res,()=>{nextCalled=true;});return {status,nextCalled};}
  finally {destroySession(token);}
}

test('network writes reject anonymous users',()=>assert.deepEqual(runGuard(undefined,['ADMIN','IT_OPERATIONS']),{status:401,nextCalled:false}));
test('network writes reject roles outside operations and admin',()=>assert.deepEqual(runGuard('COMMERCIAL',['ADMIN','IT_OPERATIONS']),{status:403,nextCalled:false}));
test('custom field definitions accept admins only',()=>{
  assert.deepEqual(runGuard('IT_OPERATIONS',['ADMIN']),{status:403,nextCalled:false});
  assert.deepEqual(runGuard('ADMIN',['ADMIN']),{status:200,nextCalled:true});
});
test('network read access is limited to admin, management and IT operations',()=>{
  const roles:Role[]=['ADMIN','MANAGEMENT','IT_OPERATIONS'];
  for(const role of roles)assert.deepEqual(runGuard(role,roles),{status:200,nextCalled:true});
  assert.deepEqual(runGuard('COMMERCIAL',roles),{status:403,nextCalled:false});
  assert.deepEqual(runGuard('FINANCE',roles),{status:403,nextCalled:false});
});
