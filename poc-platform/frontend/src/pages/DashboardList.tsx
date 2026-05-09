import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Button, Space, Popconfirm, message, Empty, Tag, Spin } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { getDashboards, deleteDashboard, updateDashboard, type Dashboard } from '../api/dashboards';
import ChartCard from '../components/ChartCard';

export default function DashboardList() {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetch = () => {
    setLoading(true);
    getDashboards()
      .then((r) => setDashboards(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  const handleDeleteDashboard = async (id: string) => {
    await deleteDashboard(id);
    message.success('删除成功');
    fetch();
  };

  const handleEditChart = (chartId: string) => {
    message.info('编辑功能：可在图表配置中修改');
  };

  const handleDeleteChart = async (dashboardId: string, chartId: string) => {
    const dashboard = dashboards.find((d) => d.id === dashboardId);
    if (!dashboard) return;
    const charts = (dashboard.config?.charts || []).filter((c) => c.id !== chartId);
    await updateDashboard(dashboardId, {
      config: { ...dashboard.config, charts },
    });
    message.success('图表已删除');
    fetch();
  };

  if (loading) return <Spin style={{ display: 'block', margin: '100px auto' }} />;

  if (dashboards.length === 0) {
    return (
      <Empty description="暂无仪表盘">
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/dashboards/new')}>
          新建仪表盘
        </Button>
      </Empty>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>数据仪表盘</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/dashboards/new')}>
          新建仪表盘
        </Button>
      </div>

      {dashboards.map((dashboard) => (
        <div key={dashboard.id} style={{ marginBottom: 32 }}>
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <h3 style={{ margin: 0 }}>{dashboard.name}</h3>
              {dashboard.is_public && <Tag color="blue">公开</Tag>}
            </Space>
            <Space>
              <a onClick={() => navigate(`/dashboards/${dashboard.id}`)}>全屏查看</a>
              <Popconfirm title="确认删除？" onConfirm={() => handleDeleteDashboard(dashboard.id)}>
                <a style={{ color: '#ff4d4f' }}><DeleteOutlined /> 删除</a>
              </Popconfirm>
            </Space>
          </div>
          <Row gutter={[16, 16]}>
            {(dashboard.config?.charts || []).map((chart) => (
              <Col key={chart.id} span={chart.w || 12}>
                <ChartCard
                  config={chart}
                  onEdit={handleEditChart}
                  onDelete={(chartId) => handleDeleteChart(dashboard.id, chartId)}
                />
              </Col>
            ))}
          </Row>
        </div>
      ))}
    </div>
  );
}
