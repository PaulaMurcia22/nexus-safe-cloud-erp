import test from 'node:test';
import assert from 'node:assert/strict';
import {createSession,currentUser,destroySession,destroyUserSessions} from '../shared/auth.js';

test('changing or deactivating a user can invalidate all in-memory sessions',()=>{
  const user={id:'00000000-0000-4000-8000-000000000010',name:'User',email:'user@example.invalid',role:'COMMERCIAL' as const,status:'ACTIVE' as const};
  const first=createSession(user),second=createSession(user);
  const request={headers:{cookie:`nexus_session=${first}`}};
  try {assert.equal(currentUser(request)?.id,user.id);destroyUserSessions(user.id);assert.equal(currentUser(request),undefined);assert.equal(currentUser({headers:{cookie:`nexus_session=${second}`}}),undefined);}
  finally {destroySession(first);destroySession(second);}
});
