import test from 'node:test';import assert from 'node:assert/strict';import{roleAllowed,type Role}from'../shared/auth.js';
const roles:Role[]=['ADMIN','MANAGEMENT','COMMERCIAL','FINANCE','IT_OPERATIONS','PMO','TECHNICIAN'];
const matrix:Record<string,{read:Role[];write:Role[]}>={
  users:{read:['ADMIN'],write:['ADMIN']},
  clients:{read:['ADMIN','MANAGEMENT','COMMERCIAL','FINANCE','IT_OPERATIONS','PMO'],write:['ADMIN','COMMERCIAL']},
  network:{read:['ADMIN','MANAGEMENT','IT_OPERATIONS','PMO'],write:['ADMIN','IT_OPERATIONS']},
  contracts:{read:['ADMIN','MANAGEMENT','COMMERCIAL','FINANCE','IT_OPERATIONS','PMO'],write:['ADMIN','COMMERCIAL']},
  findings:{read:['ADMIN','MANAGEMENT','COMMERCIAL','IT_OPERATIONS','PMO'],write:['ADMIN','IT_OPERATIONS']},
  workOrders:{read:['ADMIN','MANAGEMENT','IT_OPERATIONS','PMO','TECHNICIAN'],write:['ADMIN','IT_OPERATIONS','PMO','TECHNICIAN']},
  timeEntries:{read:['ADMIN','MANAGEMENT','FINANCE','IT_OPERATIONS','PMO','TECHNICIAN'],write:['TECHNICIAN']},
  billing:{read:['ADMIN','MANAGEMENT','FINANCE'],write:['ADMIN','FINANCE']},
};
test('RBAC resource matrix grants and denies every role explicitly',()=>{
  for(const permissions of Object.values(matrix))for(const role of roles){
    assert.equal(roleAllowed(role,permissions.read),permissions.read.includes(role));
    assert.equal(roleAllowed(role,permissions.write),permissions.write.includes(role));
  }
});
