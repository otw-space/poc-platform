import client from './client';
import type { User } from './auth';

export function getUsers() {
  return client.get<User[]>('/users/');
}

export function createUser(data: { username: string; password?: string; display_name?: string; role_id?: string }) {
  return client.post<User>('/users/', data);
}

export function resetPassword(userId: string, newPassword: string) {
  return client.put(`/users/${userId}/password`, { new_password: newPassword });
}

export function toggleActive(userId: string) {
  return client.put(`/users/${userId}/toggle-active`);
}
