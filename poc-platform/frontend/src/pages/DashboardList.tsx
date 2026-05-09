import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Space, message, Empty, Tag, Spin } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { getDashboards, updateDashboard, type Dashboard } from '../api/dashboards';
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

  const handleEditChart = (chartId: string, dashboardId?: string) => {
    if (dashboardId) {
      navigate(`/dashboards/new?edit=${dashboardId}`);
    }
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
          <div style={{ marginBottom: 12 }}>
            <Space>
              <h3 style={{ margin: 0 }}>{dashboard.name}</h3>
              {dashboard.is_public && <Tag color="blue">公开</Tag>}
            </Space>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            {(dashboard.config?.charts || []).map((chart) => (
              <ChartCard
                key={chart.id}
                config={chart}
                dashboardId={dashboard.id}
                onEdit={handleEditChart}
                onDelete={(chartId) => handleDeleteChart(dashboard.id, chartId)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
