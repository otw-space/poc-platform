import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Input, Select, Space, Tag, Popconfirm, message, Card } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { getProjects, deleteProject, type PocProject } from '../api/projects';
import { getOptions, type PocOption } from '../api/options';

const STATUS_COLORS: Record<string, string> = {
  '未开始': 'default',
  '准备中': 'blue',
  '进行中': 'processing',
  '已完成': 'success',
  '搁置': 'warning',
};

export default function ProjectList() {
  const [projects, setProjects] = useState<PocProject[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [statusOptions, setStatusOptions] = useState<PocOption[]>([]);
  const [typeOptions, setTypeOptions] = useState<PocOption[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    getOptions('status').then((r) => setStatusOptions(r.data));
    getOptions('poc_type').then((r) => setTypeOptions(r.data));
  }, []);

  const fetchProjects = () => {
    setLoading(true);
    getProjects({ page, page_size: 20, ...filters })
      .then((r) => {
        setProjects(r.data.items);
        setTotal(r.data.total);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProjects(); }, [page, filters]);

  const getOptionLabel = (options: PocOption[], id: number) =>
    options.find((o) => o.id === id)?.label || '';

  const handleDelete = async (id: string) => {
    await deleteProject(id);
    message.success('删除成功');
    fetchProjects();
  };

  const columns = [
    { title: '项目名称', dataIndex: 'name', key: 'name', ellipsis: true },
    { title: '区域', dataIndex: 'region', key: 'region', width: 80 },
    { title: '城市', dataIndex: 'city', key: 'city', width: 80 },
    { title: '销售', dataIndex: 'sales', key: 'sales', width: 80 },
    { title: '项目经理', dataIndex: 'pm', key: 'pm', width: 80 },
    { title: '开始', dataIndex: 'start_date', key: 'start_date', width: 100 },
    { title: '完成', dataIndex: 'end_date', key: 'end_date', width: 100 },
    {
      title: '工期', dataIndex: 'duration_days', key: 'duration_days', width: 70,
      render: (v: number | null) => v ? `${v}天` : '-',
    },
    {
      title: 'PoC类型', dataIndex: 'poc_type_id', key: 'poc_type_id', width: 90,
      render: (v: number) => <Tag>{getOptionLabel(typeOptions, v)}</Tag>,
    },
    {
      title: '状态', dataIndex: 'status_id', key: 'status_id', width: 90,
      render: (v: number) => {
        const label = getOptionLabel(statusOptions, v);
        return <Tag color={STATUS_COLORS[label]}>{label}</Tag>;
      },
    },
    {
      title: '操作', key: 'actions', width: 180,
      render: (_: any, record: PocProject) => (
        <Space>
          <a onClick={() => navigate(`/projects/${record.id}`)}>查看</a>
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
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/projects/new')}>
          新建项目
        </Button>
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={projects}
        loading={loading}
        scroll={{ x: 1400 }}
        pagination={{
          current: page,
          total,
          pageSize: 20,
          showTotal: (t) => `共 ${t} 条`,
          showSizeChanger: false,
          onChange: setPage,
        }}
      />
    </Card>
  );
}
