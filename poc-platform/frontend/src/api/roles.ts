import client from './client';

export interface RolePermission {
  module: string;
  action: string;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  is_super: boolean;
  permissions: RolePermission[];
}

export function getRoles() {
  return client.get<Role[]>('/roles/');
}

export function createRole(data: { name: string; description?: string; permissions: RolePermission[] }) {
  return client.post<Role>('/roles/', data);
}

export function updateRole(id: string, data: { name?: string; description?: string; permissions?: RolePermission[] }) {
  return client.put<Role>(`/roles/${id}`, data);
}

export function deleteRole(id: string) {
  return client.delete(`/roles/${id}`);
}
