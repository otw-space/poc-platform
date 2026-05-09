import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Row, Col, Button, Space, Spin, Tag } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { getDashboard, type Dashboard } from '../api/dashboards';
import ChartCard from '../components/ChartCard';

export default function DashboardView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);

  useEffect(() => {
    getDashboard(id!).then((r) => setDashboard(r.data));
  }, [id]);

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

      <Row gutter={[16, 16]}>
        {charts.map((chart) => (
          <Col key={chart.id} span={chart.w || 12}>
            <ChartCard config={chart} />
          </Col>
        ))}
      </Row>
    </div>
  );
}
