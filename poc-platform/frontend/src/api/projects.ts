import client from './client';

export interface FileMetadata {
  original_filename: string;
  stored_filename: string;
  size: number;
  uploaded_at: string;
}

export interface ProjectLog {
  id: string;
  project_id: string;
  log_date: string;
  progress: string;
  issues: string;
  plan: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectLogCreate {
  log_date: string;
  progress: string;
  issues: string;
  plan: string;
}

export interface ProjectLogUpdate {
  log_date?: string;
  progress?: string;
  issues?: string;
  plan?: string;
}

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
  plan_file: FileMetadata | null;
  report_file: FileMetadata | null;
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

// File upload
export function uploadProjectFile(
  projectId: string, fileType: 'plan' | 'report', file: File,
  onProgress?: (pct: number) => void, signal?: AbortSignal,
) {
  const formData = new FormData();
  formData.append('file', file);
  return client.post(`/projects/${projectId}/upload/${fileType}`, formData, {
    signal,
    onUploadProgress: (e) => {
      if (e.total && onProgress) onProgress((e.loaded / e.total) * 100);
    },
  });
}

export function getFileDownloadUrl(projectId: string, fileType: 'plan' | 'report', inline = false) {
  return `/api/projects/${projectId}/download/${fileType}?inline=${inline ? 'true' : 'false'}`;
}

// Log CRUD
export function getProjectLogs(projectId: string) {
  return client.get<ProjectLog[]>(`/projects/${projectId}/logs/`);
}

export function createProjectLog(projectId: string, data: ProjectLogCreate) {
  return client.post<ProjectLog>(`/projects/${projectId}/logs/`, data);
}

export function updateProjectLog(projectId: string, logId: string, data: ProjectLogUpdate) {
  return client.put<ProjectLog>(`/projects/${projectId}/logs/${logId}`, data);
}

export function deleteProjectLog(projectId: string, logId: string) {
  return client.delete(`/projects/${projectId}/logs/${logId}`);
}
