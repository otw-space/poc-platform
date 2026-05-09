import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Space, Spin, Tag, message } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { getDashboard, updateDashboard, deleteDashboard, type Dashboard } from '../api/dashboards';
import ChartCard from '../components/ChartCard';

export default function DashboardView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);

  const fetch = () => {
    getDashboard(id!).then((r) => setDashboard(r.data));
  };

  useEffect(() => { fetch(); }, [id]);

  const handleEditChart = (chartId: string, dashboardId?: string) => {
    if (dashboardId) {
      navigate(`/dashboards/new?edit=${dashboardId}`);
    }
  };

  const dashboardRef = useRef(dashboard);
  dashboardRef.current = dashboard;

  const handleDeleteChart = async (chartId: string) => {
    const current = dashboardRef.current;
    if (!current) return;
    const charts = (current.config?.charts || []).filter((c) => c.id !== chartId);

    if (charts.length === 0) {
      try {
        await deleteDashboard(current.id);
        message.success('仪表盘已删除');
        navigate('/dashboards');
      } catch {
        message.error('删除失败');
      }
      return;
    }

    const newConfig = { ...current.config, charts };
    setDashboard({ ...current, config: newConfig });

    try {
      await updateDashboard(current.id, { config: newConfig });
      message.success('图表已删除');
    } catch {
      message.error('删除失败');
      fetch();
    }
  };

  if (!dashboard) return <Spin style={{ display: 'block', margin: '100px auto' }} />;

  const charts = dashboard.config?.charts || [];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <h2 style={{ margin: 0 }}>{dashboard.name}</h2>
          {dashboard.is_public && <Tag color="blue">公开</Tag>}
        </Space>
        <Button icon={<EditOutlined />} onClick={() => navigate(`/dashboards/new?edit=${id}`)}>编辑</Button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        {charts.map((chart) => (
          <ChartCard
            key={chart.id}
            config={chart}
            dashboardId={dashboard.id}
            onEdit={handleEditChart}
            onDelete={handleDeleteChart}
          />
        ))}
      </div>
    </div>
  );
}
