import {randomUUID} from 'node:crypto';

export const EVENTS_EXCHANGE='nexus.events';
export const EVENTS_DLX='nexus.events.dlx';
export const PROJECT_CREATED_TYPE='project.created';
export const PROJECT_CREATED_VERSION=1;
export const PROJECT_CREATED_ROUTING_KEY='project.created.v1';
export const PROJECT_BILLING_QUEUE='billing.project-created.v1';
export const PROJECT_BILLING_DLQ=`${PROJECT_BILLING_QUEUE}.dlq`;

export type ProjectCreatedEvent={
  eventId:string; eventType:typeof PROJECT_CREATED_TYPE; eventVersion:1;
  occurredAt:string; entityId:string; correlationId:string;
  payload:{projectId:string; code:string; customerId:string; status:string; estimatedBudget:number|null; estimatedHours:number|null};
};

export function createProjectCreatedEvent(project:Record<string,unknown>, correlationId=randomUUID()):ProjectCreatedEvent{
  return {eventId:randomUUID(),eventType:PROJECT_CREATED_TYPE,eventVersion:PROJECT_CREATED_VERSION,occurredAt:new Date().toISOString(),entityId:String(project.id),correlationId,payload:{projectId:String(project.id),code:String(project.code),customerId:String(project.customerId),status:String(project.status),estimatedBudget:project.estimatedBudget==null?null:Number(project.estimatedBudget),estimatedHours:project.estimatedHours==null?null:Number(project.estimatedHours)}};
}
