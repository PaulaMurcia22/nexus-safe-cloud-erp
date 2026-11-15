import test from 'node:test';
import assert from 'node:assert/strict';
import {consumerRetryCount,shouldRetryConsumerMessage} from '../messaging/consumer.js';
test('el contador de reintentos usa cero cuando no existe header',()=>assert.equal(consumerRetryCount(undefined),0));
test('el consumidor reintenta hasta el límite y luego debe ir a DLQ',()=>{assert.equal(shouldRetryConsumerMessage(0,3),true);assert.equal(shouldRetryConsumerMessage(2,3),true);assert.equal(shouldRetryConsumerMessage(3,3),false);});
