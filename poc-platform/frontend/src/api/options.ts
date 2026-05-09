import client from './client';

export interface PocOption {
  id: number;
  category: string;
  label: string;
  is_default: boolean;
  sort_order: number;
}

export function getOptions(category: string) {
  return client.get<PocOption[]>(`/options/${category}`);
}

export function createOption(data: { category: string; label: string }) {
  return client.post<PocOption>('/options/', data);
}

export function updateOption(id: number, data: { label?: string; sort_order?: number }) {
  return client.put<PocOption>(`/options/${id}`, data);
}

export function deleteOption(id: number) {
  return client.delete(`/options/${id}`);
}
