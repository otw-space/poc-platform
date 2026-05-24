import client from './client';

export interface Diagram {
  id: string;
  name: string;
  data: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function listDiagrams() {
  return client.get<Diagram[]>('/diagrams/');
}

export function getDiagram(id: string) {
  return client.get<Diagram>(`/diagrams/${id}`);
}

export function createDiagram(data: { name: string; data?: string }) {
  return client.post<Diagram>('/diagrams/', data);
}

export function updateDiagram(id: string, data: { name?: string; data?: string }) {
  return client.put<Diagram>(`/diagrams/${id}`, data);
}

export function deleteDiagram(id: string) {
  return client.delete(`/diagrams/${id}`);
}
