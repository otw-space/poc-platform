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
    const baseParams: Record<string, any> = { page_size: 100 };
    if (filters.name) baseParams.name = filters.name;
    if (filters.region) baseParams.region = filters.region;
    if (filters.city) baseParams.city = filters.city;
    if (filters.sales) baseParams.sales = filters.sales;
    if (filters.status_id) baseParams.status_id = filters.status_id;
    if (filters.poc_type_id) baseParams.poc_type_id = filters.poc_type_id;
    if (filters.date_from) baseParams.date_from = filters.date_from;
    if (filters.date_to) baseParams.date_to = filters.date_to;

    // Fetch first page to get total
    getProjects({ ...baseParams, page: 1 })
      .then(async (r1) => {
        let all = r1.data.items;
        const total = r1.data.total;
        if (total > 100) {
          const pages = Math.ceil(total / 100);
          const reqs = [];
          for (let p = 2; p <= pages; p++) reqs.push(getProjects({ ...baseParams, page: p }));
          const results = await Promise.all(reqs);
          results.forEach(r => { all = all.concat(r.data.items); });
        }
        setProjects(all);
        setTotal(total);
      })
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const getOptionLabel = (opts: PocOption[], id: number) => opts.find(o => o.id === id)?.label || '';

  return {
    projects, total, page, loading, filters,
    setPage, setFilters, fetchProjects,
    statusOptions, typeOptions, implOptions, getOptionLabel,
  };
}
