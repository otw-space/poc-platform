import client from './client';

export interface RecycleBinItem {
  id: string;
  type: 'project' | 'dashboard' | 'log' | 'option' | 'diagram' | 'chart' | 'sop_document' | 'test_case' | 'script' | 'sop_category';
  name: string;
  deleted_at: string;
  deleted_by: string | null;
  extra: Record<string, any> | null;
}

export interface RecycleBinResponse {
  items: RecycleBinItem[];
  total: number;
}

export function getRecycleBin() {
  return client.get<RecycleBinResponse>('/recycle-bin/');
}

export function restoreItem(type: string, id: string) {
  return client.post(`/recycle-bin/restore/${type}/${id}`);
}

export function permanentDeleteItem(type: string, id: string) {
  return client.delete(`/recycle-bin/permanent/${type}/${id}`);
}
