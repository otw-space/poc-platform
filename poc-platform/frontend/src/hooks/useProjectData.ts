import { useState, useEffect, useCallback } from 'react';
import { getProjects, type PocProject } from '../api/projects';
import { getOptions, type PocOption } from '../api/options';

export interface ProjectFilters {
  name?: string;
  region?: string;
  city?: string;
  sales?: string;
  status_id?: number;
  poc_type_id?: number;
  date_from?: string;
  date_to?: string;
}

export function useProjectData() {
  const [projects, setProjects] = useState<PocProject[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<ProjectFilters>({});
  const [statusOptions, setStatusOptions] = useState<PocOption[]>([]);
  const [typeOptions, setTypeOptions] = useState<PocOption[]>([]);
  const [implOptions, setImplOptions] = useState<PocOption[]>([]);

  useEffect(() => {
    getOptions('status').then(r => setStatusOptions(r.data));
    getOptions('poc_type').then(r => setTypeOptions(r.data));
    getOptions('impl_method').then(r => setImplOptions(r.data));
  }, []);

  const fetchProjects = useCallback(() => {
    setLoading(true);
    const params: Record<string, any> = { page, page_size: 200 };
    if (filters.name) params.name = filters.name;
    if (filters.region) params.region = filters.region;
    if (filters.city) params.city = filters.city;
    if (filters.sales) params.sales = filters.sales;
    if (filters.status_id) params.status_id = filters.status_id;
    if (filters.poc_type_id) params.poc_type_id = filters.poc_type_id;
    if (filters.date_from) params.date_from = filters.date_from;
    if (filters.date_to) params.date_to = filters.date_to;
    getProjects(params)
      .then(r => { setProjects(r.data.items); setTotal(r.data.total); })
      .finally(() => setLoading(false));
  }, [page, filters]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const getOptionLabel = (opts: PocOption[], id: number) => opts.find(o => o.id === id)?.label || '';

  return {
    projects, total, page, loading, filters,
    setPage, setFilters, fetchProjects,
    statusOptions, typeOptions, implOptions, getOptionLabel,
  };
}
