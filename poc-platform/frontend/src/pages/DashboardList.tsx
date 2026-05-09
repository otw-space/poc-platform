import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Button, Space, Popconfirm, message, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { getDashboards, deleteDashboard, type Dashboard } from '../api/dashboards';
import dayjs from 'dayjs';

export default function DashboardList() {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetch = () => {
    setLoading(true);
    getDashboards()
      .then((r) => setDashboards(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  const handleDelete = async (id: string) => {
    await deleteDashboard(id);
    message.success('删除成功');
    fetch();
  };

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    {
      title: '可见性', dataIndex: 'is_public', key: 'is_public',
      render: (v: boolean) => v ? <Tag color="blue">公开</Tag> : <Tag>私有</Tag>,
    },
    {
      title: '图表数', key: 'chart_count',
      render: (_: any, r: Dashboard) => r.config?.charts?.length || 0,
    },
    {
      title: '更新时间', dataIndex: 'updated_at', key: 'updated_at',
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作', key: 'actions',
      render: (_: any, r: Dashboard) => (
        <Space>
          <a onClick={() => navigate(`/dashboards/${r.id}`)}>查看</a>
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(r.id)}>
            <a style={{ color: '#ff4d4f' }}>删除</a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="数据仪表盘"
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/dashboards/new')}>新建仪表盘</Button>}
    >
      <Table rowKey="id" columns={columns} dataSource={dashboards} loading={loading} />
    </Card>
  );
}
