import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Space, Spin, Tag, message } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { getDashboard, updateDashboard, type Dashboard } from '../api/dashboards';
import ChartCard from '../components/ChartCard';

export default function DashboardView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);

  const fetch = () => {
    getDashboard(id!).then((r) => setDashboard(r.data));
  };

  useEffect(() => { fetch(); }, [id]);

  const handleEditChart = (chartId: string) => {
    // TODO: inline chart editing in future iteration
    message.info('编辑功能：可在图表配置中修改');
  };

  const handleDeleteChart = async (chartId: string) => {
    if (!dashboard) return;
    const charts = (dashboard.config?.charts || []).filter((c) => c.id !== chartId);
    await updateDashboard(dashboard.id, {
      config: { ...dashboard.config, charts },
    });
    message.success('图表已删除');
    fetch();
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
            onEdit={handleEditChart}
            onDelete={handleDeleteChart}
          />
        ))}
      </div>
    </div>
  );
}
