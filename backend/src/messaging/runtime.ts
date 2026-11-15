import {env} from '../config/env.js';
import {startBroker,stopBroker} from './broker.js';
import {publishPendingOutbox} from './outbox.js';
import {startConsumer} from './consumer.js';
let timer:NodeJS.Timeout|undefined;
export async function startMessaging(){if(!env.RABBITMQ_ENABLED)return;await startBroker();void startConsumer().catch(e=>console.error('Consumidor RabbitMQ:',e instanceof Error?e.message:String(e)));timer=setInterval(()=>void publishPendingOutbox().catch(e=>console.error('Outbox:',e)),3000);}
export async function stopMessaging(){if(timer)clearInterval(timer);await stopBroker();}
