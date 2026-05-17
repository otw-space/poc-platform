import client from './client';

// ── SopDocument ──

export interface SopDocument {
  id: string;
  category: string;
  name: string;
  content: string | null;
  file_json: {
    original_filename: string;
    stored_filename: string;
    size: number;
    uploaded_at: string;
  } | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function listDocuments(category?: string) {
  return client.get<SopDocument[]>('/sops/documents', { params: category ? { category } : {} });
}

export function createDocument(data: { category: string; name: string; content?: string }) {
  return client.post<SopDocument>('/sops/documents', data);
}

export function updateDocument(id: string, data: Partial<SopDocument>) {
  return client.put<SopDocument>(`/sops/documents/${id}`, data);
}

export function deleteDocument(id: string) {
  return client.delete(`/sops/documents/${id}`);
}

export function uploadDocumentFile(id: string, file: File, onProgress?: (pct: number) => void, signal?: AbortSignal) {
  const form = new FormData();
  form.append('file', file);
  return client.post(`/sops/documents/${id}/upload`, form, {
    signal,
    onUploadProgress: (e) => {
      if (e.total && onProgress) onProgress((e.loaded / e.total) * 100);
    },
  });
}

export function uploadImage(docId: string, file: File) {
  const form = new FormData();
  form.append('file', file);
  return client.post<{ ok: boolean; url: string }>(`/sops/documents/${docId}/images`, form);
}

export function previewDocument(id: string) {
  return client.get(`/sops/documents/${id}/preview`, { responseType: 'blob' });
}

export function getDocumentDownloadUrl(id: string, inline?: boolean) {
  return client.get(`/sops/documents/${id}/download`, {
    params: inline ? { inline: true } : {},
    responseType: 'blob',
  });
}

// ── TestCaseCategory ──

export interface TestCaseCategory {
  id: string;
  name: string;
  case_count: number;
}

export function listCategories() {
  return client.get<TestCaseCategory[]>('/sops/test-case-categories');
}

export function createCategory(name: string) {
  return client.post('/sops/test-case-categories', { name });
}

export function updateCategory(id: string, name: string) {
  return client.put(`/sops/test-case-categories/${id}`, { name });
}

export function deleteCategory(id: string) {
  return client.delete(`/sops/test-case-categories/${id}`);
}

// ── TestCase ──

export interface TestCase {
  id: string;
  title: string;
  category_id: string | null;
  module: string | null;
  priority: string;
  precondition: string | null;
  steps: string | null;
  expected_result: string | null;
  status: string;
  remarks: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TestCaseListOut {
  items: TestCase[];
  total: number;
  page: number;
  page_size: number;
}

export function listTestCases(params?: Record<string, any>) {
  return client.get<TestCaseListOut>('/sops/test-cases', { params });
}

export function createTestCase(data: Partial<TestCase>) {
  return client.post<TestCase>('/sops/test-cases', data);
}

export function updateTestCase(id: string, data: Partial<TestCase>) {
  return client.put<TestCase>(`/sops/test-cases/${id}`, data);
}

export function deleteTestCase(id: string) {
  return client.delete(`/sops/test-cases/${id}`);
}

export function importTestCases(file: File, onProgress?: (pct: number) => void, signal?: AbortSignal) {
  const form = new FormData();
  form.append('file', file);
  return client.post('/sops/test-cases/import', form, {
    signal,
    onUploadProgress: (e) => {
      if (e.total && onProgress) onProgress((e.loaded / e.total) * 100);
    },
  });
}

export function exportTestCases() {
  return client.get('/sops/test-cases/export', { responseType: 'blob' });
}

// ── ScriptFile ──

export interface ScriptFile {
  id: string;
  name: string;
  description: string | null;
  file_json: {
    original_filename: string;
    stored_filename: string;
    size: number;
    uploaded_at: string;
  } | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function listScripts() {
  return client.get<ScriptFile[]>('/sops/scripts');
}

export function createScript(name: string, description: string | undefined, file: File, onProgress?: (pct: number) => void, signal?: AbortSignal) {
  const form = new FormData();
  form.append('file', file);
  return client.post<ScriptFile>(`/sops/scripts?name=${encodeURIComponent(name)}${description ? `&description=${encodeURIComponent(description)}` : ''}`, form, {
    signal,
    onUploadProgress: (e) => {
      if (e.total && onProgress) onProgress((e.loaded / e.total) * 100);
    },
  });
}

export function deleteScript(id: string) {
  return client.delete(`/sops/scripts/${id}`);
}

export function getScriptDownloadUrl(id: string) {
  return client.get(`/sops/scripts/${id}/download`, { responseType: 'blob' });
}
