import client from './client';

export interface Dashboard {
  id: string;
  name: string;
  user_id: string;
  config: DashboardConfig;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface DashboardConfig {
  filters: { field: string; op: string; value: any }[];
  charts: ChartConfig[];
}

export interface ChartConfig {
  id: string;
  type: string;
  title: string;
  x_field: string;
  y_field: string;
  group_field?: string | null;
  w: number;
  h: number;
  x?: number;
  y?: number;
  colorScheme?: string;
  filters?: { field: string; op: string; value: any }[];
}

export function getDashboards() {
  return client.get<Dashboard[]>('/dashboards/');
}

export function getDashboard(id: string) {
  return client.get<Dashboard>(`/dashboards/${id}`);
}

export function createDashboard(data: Partial<Dashboard>) {
  return client.post<Dashboard>('/dashboards/', data);
}

export function updateDashboard(id: string, data: Partial<Dashboard>) {
  return client.put<Dashboard>(`/dashboards/${id}`, data);
}

export function deleteDashboard(id: string) {
  return client.delete(`/dashboards/${id}`);
}

export function deleteChart(dashboardId: string, chartId: string) {
  return client.delete(`/dashboards/${dashboardId}/charts/${chartId}`);
}

export function restoreChart(dashboardId: string, chartId: string) {
  return client.post(`/dashboards/${dashboardId}/charts/${chartId}/restore`);
}
