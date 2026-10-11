export type ClientStatus = 'active' | 'inactive';
export interface Client { id: string; name: string; businessIdentifier: string | null; email: string | null; phone: string | null; status: ClientStatus; createdAt: string; updatedAt: string; }
export type ProjectStatus = 'planned' | 'active' | 'completed' | 'cancelled';
export interface Project { id: string; clientId: string; clientName: string; name: string; description: string | null; status: ProjectStatus; startDate: string | null; endDate: string | null; createdAt: string; updatedAt: string; }
