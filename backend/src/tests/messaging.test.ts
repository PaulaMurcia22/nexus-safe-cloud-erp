import test from 'node:test';
import assert from 'node:assert/strict';
import {createProjectCreatedEvent,PROJECT_CREATED_ROUTING_KEY,PROJECT_CREATED_TYPE} from '../messaging/contracts.js';

test('project.created genera un contrato versionado y sin secretos',()=>{const event=createProjectCreatedEvent({id:'00000000-0000-0000-0000-000000000001',code:'P-001',customerId:'00000000-0000-0000-0000-000000000002',status:'PLANNED',estimatedBudget:10,estimatedHours:2});assert.equal(event.eventType,PROJECT_CREATED_TYPE);assert.equal(event.eventVersion,1);assert.equal(typeof event.eventId,'string');assert.equal(typeof event.correlationId,'string');assert.equal(PROJECT_CREATED_ROUTING_KEY,'project.created.v1');assert.equal('password' in event.payload,false);});
