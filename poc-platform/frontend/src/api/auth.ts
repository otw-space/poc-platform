import client from './client';

export interface User {
  id: string;
  username: string;
  display_name: string;
  role: string;
  is_active: boolean;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export function login(username: string, password: string) {
  return client.post<LoginResponse>('/auth/login', { username, password });
}

export function getMe() {
  return client.get<User>('/auth/me');
}
