import { useEffect, useState } from 'react';
import { Modal, Table, Tag, Spin, Empty } from 'antd';
import { getProjects, type PocProject } from '../api/projects';
import { getOptions, type PocOption } from '../api/options';
import ProjectDrawer from './ProjectDrawer';
import dayjs from 'dayjs';

interface Props {
  open: boolean;
  onClose: () => void;
  filters: { field: string; op: string; value: any }[];
  title?: string;
}

export default function ProjectListModal({ open, onClose, filters, title }: Props) {
  const [projects, setProjects] = useState<PocProject[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [typeOpts, setTypeOpts] = useState<PocOption[]>([]);
  const [statusOpts, setStatusOpts] = useState<PocOption[]>([]);
  const [implOpts, setImplOpts] = useState<PocOption[]>([]);

  const filtersKey = JSON.stringify(filters);

  useEffect(() => {
    if (open) {
      Promise.all([
        getOptions('poc_type'),
        getOptions('status'),
        getOptions('impl_method'),
      ]).then(([t, s, i]) => {
        setTypeOpts(t.data);
        setStatusOpts(s.data);
        setImplOpts(i.data);
      });
    }
  }, [open]);

  // Reset page when filters change
  useEffect(() => {
    if (open) setPage(1);
  }, [open, filtersKey]);

  useEffect(() => {
    if (!open) {
      setProjects([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    const params: Record<string, any> = { page, page_size: 20 };
    for (const f of filters) {
      const isText = ['region', 'city', 'sales', 'pm'].includes(f.field);
      const isDate = f.field === 'start_date' || f.field === 'end_date';
      const isOption = ['poc_type', 'impl_method', 'status'].includes(f.field);

      if (isText) {
        if (f.op === 'eq') params[f.field] = f.value;
        else if (f.op === 'like') params.name = f.value; // text like => search by name
        // neq cannot be mapped to list API directly, skip
      } else if (isDate) {
        const key = f.field === 'start_date' ? 'date_from' : 'date_to';
        if (f.op === 'eq' || f.op === 'gte') params[key] = f.value;
        else if (f.op === 'lte') params[f.field === 'start_date' ? 'date_to' : 'date_from'] = f.value;
      } else if (isOption) {
        const cat = f.field === 'poc_type' ? 'poc_type' : f.field === 'impl_method' ? 'impl_method' : 'status';
        const paramKey = `${cat}_id`;
        const opts = cat === 'poc_type' ? typeOpts : cat === 'impl_method' ? implOpts : statusOpts;
        if (f.op === 'eq') {
          const opt = opts.find(o => o.label === f.value);
          if (opt) params[paramKey] = opt.id;
        }
        // in/neq cannot be mapped to list API directly, skip
      }
    }
    getProjects(params)
      .then((r) => { setProjects(r.data.items); setTotal(r.data.total); })
      .catch((err) => { console.error('ProjectListModal fetch error:', err); })
      .finally(() => setLoading(false));
  }, [open, filtersKey, page, typeOpts, statusOpts, implOpts]);

  const getLabel = (opts: PocOption[], id: number) => opts.find(o => o.id === id)?.label || '';

  const columns = [
    {
      title: '项目名称', dataIndex: 'name', key: 'name', width: 180, ellipsis: true,
      render: (v: string, r: PocProject) => (
        <a onClick={() => setDrawerId(r.id)}>{v}</a>
      ),
    },
    { title: '区域', dataIndex: 'region', key: 'region', width: 80 },
    { title: '城市', dataIndex: 'city', key: 'city', width: 80 },
    { title: '销售', dataIndex: 'sales', key: 'sales', width: 80 },
    { title: '项目经理', dataIndex: 'pm', key: 'pm', width: 80 },
    { title: '开始', dataIndex: 'start_date', key: 'start_date', width: 90 },
    { title: '完成', dataIndex: 'end_date', key: 'end_date', width: 90 },
    {
      title: '工期', key: 'duration', width: 60,
      render: (_: any, r: PocProject) => r.duration_days ? `${r.duration_days}天` : '-',
    },
    {
      title: 'PoC类型', key: 'poc_type', width: 90,
      render: (_: any, r: PocProject) => <Tag>{getLabel(typeOpts, r.poc_type_id)}</Tag>,
    },
    {
      title: '实施方式', key: 'impl_method', width: 90,
      render: (_: any, r: PocProject) => <Tag>{getLabel(implOpts, r.impl_method_id)}</Tag>,
    },
    {
      title: '状态', key: 'status', width: 80,
      render: (_: any, r: PocProject) => <Tag>{getLabel(statusOpts, r.status_id)}</Tag>,
    },
  ];

  return (
    <>
      <Modal
        title={title || '项目列表'}
        open={open}
        onCancel={onClose}
        width={1100}
        footer={null}
        destroyOnClose
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={projects}
          loading={loading}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: loading ? <Spin /> : <Empty description="暂无匹配项目" /> }}
          pagination={{
            current: page,
            total,
            pageSize: 20,
            showTotal: (t) => `共 ${t} 个项目`,
            showSizeChanger: false,
            onChange: (p) => setPage(p),
          }}
        />
      </Modal>
      <ProjectDrawer
        projectId={drawerId}
        open={!!drawerId}
        onClose={() => setDrawerId(null)}
        onEdit={() => {}}
        onDelete={() => {}}
        onFileChanged={() => {}}
      />
    </>
  );
}
