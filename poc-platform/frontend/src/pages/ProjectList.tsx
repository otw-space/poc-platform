import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Input, Select, Space, Tag, Popconfirm, message, Card, DatePicker, Popover } from 'antd';
import { PlusOutlined, SearchOutlined, DownloadOutlined } from '@ant-design/icons';
import { Resizable } from 'react-resizable';
import 'react-resizable/css/styles.css';
import dayjs from 'dayjs';
import { getProjects, deleteProject, updateProject, type PocProject } from '../api/projects';
import { getOptions, type PocOption } from '../api/options';
import ProjectDrawer from '../components/ProjectDrawer';

function generateCSV(projects: PocProject[], typeOptions: PocOption[], statusOptions: PocOption[]): string {
  const getLabel = (opts: PocOption[], id: number) => opts.find(o => o.id === id)?.label || '';
  const headers = ['项目名称', '区域', '城市', '销售', '项目经理', '开始日期', '完成日期', '工期', 'PoC类型', '状态'];
  const rows = projects.map(p => [
    p.name, p.region, p.city, p.sales, p.pm,
    p.start_date, p.end_date,
    p.duration_days ? `${p.duration_days}天` : '',
    getLabel(typeOptions, p.poc_type_id),
    getLabel(statusOptions, p.status_id),
  ]);
  const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  return [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
}

const STATUS_COLORS: Record<string, string> = {
  '未开始': 'default',
  '准备中': 'blue',
  '进行中': 'processing',
  '已完成': 'success',
  '搁置': 'warning',
};

const LS_KEY = 'project_table_widths';

const DEFAULT_WIDTHS: Record<string, number> = {
  name: 220,
  region: 80,
  city: 80,
  sales: 80,
  pm: 80,
  start_date: 100,
  end_date: 100,
  duration_days: 70,
  poc_type_id: 90,
  status_id: 90,
  actions: 160,
};

function loadWidths(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch { return {}; }
}

function saveWidths(widths: Record<string, number>) {
  localStorage.setItem(LS_KEY, JSON.stringify(widths));
}

function ResizableTitle(props: any) {
  const { onResize, width, ...rest } = props;
  if (!width) return <th {...rest} />;
  return (
    <Resizable width={width} height={0} onResize={onResize} draggableOpts={{ enableUserSelectHack: false }}>
      <th {...rest} style={{ cursor: 'col-resize' }} />
    </Resizable>
  );
}

export default function ProjectList() {
  const [projects, setProjects] = useState<PocProject[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [statusOptions, setStatusOptions] = useState<PocOption[]>([]);
  const [typeOptions, setTypeOptions] = useState<PocOption[]>([]);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => ({
    ...DEFAULT_WIDTHS,
    ...loadWidths(),
  }));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    getOptions('status').then((r) => setStatusOptions(r.data));
    getOptions('poc_type').then((r) => setTypeOptions(r.data));
  }, []);

  const fetchProjects = useCallback(() => {
    setLoading(true);
    getProjects({ page, page_size: 20, ...filters })
      .then((r) => {
        setProjects(r.data.items);
        setTotal(r.data.total);
      })
      .finally(() => setLoading(false));
  }, [page, filters]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const getOptionLabel = (options: PocOption[], id: number) =>
    options.find((o) => o.id === id)?.label || '';

  const handleDelete = async (id: string) => {
    await deleteProject(id);
    message.success('删除成功');
    fetchProjects();
  };

  const handleResize = useCallback((key: string) => (_e: any, { size }: any) => {
    const newWidths = { ...columnWidths, [key]: Math.max(60, size.width) };
    setColumnWidths(newWidths);
    saveWidths(newWidths);
  }, [columnWidths]);

  const w = (key: string) => columnWidths[key] || DEFAULT_WIDTHS[key] || 100;

  const resizableCol = (col: any) => ({
    ...col,
    width: w(col.key || col.dataIndex),
    onHeaderCell: (column: any) => ({
      width: column.width,
      onResize: handleResize(col.key || col.dataIndex),
    }),
  });

  const columns = [
    resizableCol({ title: '项目名称', dataIndex: 'name', key: 'name', ellipsis: true }),
    resizableCol({ title: '区域', dataIndex: 'region', key: 'region' }),
    resizableCol({ title: '城市', dataIndex: 'city', key: 'city' }),
    resizableCol({ title: '销售', dataIndex: 'sales', key: 'sales' }),
    resizableCol({ title: '项目经理', dataIndex: 'pm', key: 'pm' }),
    resizableCol({ title: '开始', dataIndex: 'start_date', key: 'start_date' }),
    resizableCol({ title: '完成', dataIndex: 'end_date', key: 'end_date' }),
    resizableCol({
      title: '工期', dataIndex: 'duration_days', key: 'duration_days',
      render: (v: number | null) => v ? `${v}天` : '-',
    }),
    resizableCol({
      title: 'PoC类型', dataIndex: 'poc_type_id', key: 'poc_type_id',
      render: (v: number) => <Tag>{getOptionLabel(typeOptions, v)}</Tag>,
    }),
    resizableCol({
      title: '状态', dataIndex: 'status_id', key: 'status_id', width: w('status_id'),
      render: (v: number, record: PocProject) => {
        const label = getOptionLabel(statusOptions, v);
        return (
          <Popover
            trigger="click"
            content={
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 80 }}>
                {statusOptions.map(o => (
                  <Button
                    key={o.id}
                    size="small"
                    type={o.id === v ? 'primary' : 'text'}
                    onClick={async () => {
                      try {
                        await updateProject(record.id, { status_id: o.id });
                        message.success(`状态已更新为「${o.label}」`);
                        fetchProjects();
                      } catch { message.error('更新失败'); }
                    }}
                  >
                    {o.label}
                  </Button>
                ))}
              </div>
            }
          >
            <Tag color={STATUS_COLORS[label] || 'default'} style={{ cursor: 'pointer' }}>{label}</Tag>
          </Popover>
        );
      },
    }),
    {
      title: '操作', key: 'actions', width: w('actions'),
      render: (_: any, record: PocProject) => (
        <Space>
          <a onClick={() => { setSelectedProjectId(record.id); setDrawerOpen(true); }}>查看</a>
          <a onClick={() => navigate(`/projects/${record.id}/edit`)}>编辑</a>
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)}>
            <a style={{ color: '#ff4d4f' }}>删除</a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card>
      <Space style={{ marginBottom: 16, flexWrap: 'wrap' }}>
        <Input
          placeholder="项目名称"
          prefix={<SearchOutlined />}
          allowClear
          style={{ width: 180 }}
          onChange={(e) => setFilters((f) => ({ ...f, name: e.target.value || undefined }))}
        />
        <Input placeholder="区域" allowClear style={{ width: 120 }} onChange={(e) => setFilters((f) => ({ ...f, region: e.target.value || undefined }))} />
        <Input placeholder="城市" allowClear style={{ width: 120 }} onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value || undefined }))} />
        <Input placeholder="销售" allowClear style={{ width: 120 }} onChange={(e) => setFilters((f) => ({ ...f, sales: e.target.value || undefined }))} />
        <Select
          placeholder="状态"
          allowClear
          style={{ width: 120 }}
          options={statusOptions.map((o) => ({ label: o.label, value: o.id }))}
          onChange={(v) => setFilters((f) => ({ ...f, status_id: v || undefined }))}
        />
        <Select
          placeholder="PoC类型"
          allowClear
          style={{ width: 120 }}
          options={typeOptions.map((o) => ({ label: o.label, value: o.id }))}
          onChange={(v) => setFilters((f) => ({ ...f, poc_type_id: v || undefined }))}
        />
        <DatePicker.RangePicker
          style={{ width: 240 }}
          placeholder={['开始日期', '结束日期']}
          onChange={(dates) => {
            if (dates && dates[0] && dates[1]) {
              setFilters(f => ({ ...f, date_from: dates[0]!.format('YYYY-MM-DD'), date_to: dates[1]!.format('YYYY-MM-DD') }));
            } else {
              setFilters(f => {
                const nf = { ...f };
                delete nf.date_from;
                delete nf.date_to;
                return nf;
              });
            }
          }}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/projects/new')}>
          新建项目
        </Button>
        <Button icon={<DownloadOutlined />} onClick={() => {
          const csv = '﻿' + generateCSV(projects, typeOptions, statusOptions);
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `项目列表_${dayjs().format('YYYY-MM-DD')}.csv`;
          a.click();
          URL.revokeObjectURL(url);
          message.success('导出成功');
        }}>导出</Button>
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={projects}
        loading={loading}
        components={{ header: { cell: ResizableTitle } }}
        pagination={{
          current: page,
          total,
          pageSize: 20,
          showTotal: (t) => `共 ${t} 条`,
          showSizeChanger: false,
          onChange: setPage,
        }}
      />

      <ProjectDrawer
        projectId={selectedProjectId}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelectedProjectId(null); }}
        onEdit={(id) => navigate(`/projects/${id}/edit`)}
        onDelete={async (id) => {
          await deleteProject(id);
          message.success('删除成功');
          fetchProjects();
        }}
        onFileChanged={fetchProjects}
      />
    </Card>
  );
}
