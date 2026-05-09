import client from './client';

export interface PocProject {
  id: string;
  name: string;
  region: string;
  city: string;
  sales: string;
  pm: string;
  start_date: string;
  end_date: string;
  duration_days: number | null;
  poc_type_id: number;
  impl_method_id: number;
  status_id: number;
  result: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectListResponse {
  items: PocProject[];
  total: number;
  page: number;
  page_size: number;
}

export function getProjects(params: Record<string, any>) {
  return client.get<ProjectListResponse>('/projects/', { params });
}

export function getProject(id: string) {
  return client.get<PocProject>(`/projects/${id}`);
}

export function createProject(data: any) {
  return client.post<PocProject>('/projects/', data);
}

export function updateProject(id: string, data: any) {
  return client.put<PocProject>(`/projects/${id}`, data);
}

export function deleteProject(id: string) {
  return client.delete(`/projects/${id}`);
}

export function queryProjectData(data: any) {
  return client.post<{ data: { x: string; y: number }[] }>('/projects/query', data);
}
