import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Spin } from 'antd';
import { ProjectOutlined, PlayCircleOutlined, PlusCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { Column, Pie } from '@ant-design/charts';
import { getProjects } from '../api/projects';
import { getOptions } from '../api/options';
import { useTheme } from '../context/ThemeContext';
import dayjs from 'dayjs';

export default function DashboardHome() {
  const { dark, token } = useTheme();
  const chartTheme = dark ? 'dark' : 'classic';
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, inProgress: 0, thisMonth: 0, avgDuration: 0 });
  const [statusData, setStatusData] = useState<{ x: string; y: number }[]>([]);
  const [regionData, setRegionData] = useState<{ x: string; y: number }[]>([]);

  useEffect(() => {
    Promise.all([
      getProjects({ page: 1, page_size: 100 }),
      getOptions('status'),
      getOptions('poc_type'),
    ]).then(([projRes, statusRes]) => {
      const projects = projRes.data.items;
      const statusOpts = statusRes.data;
      const now = dayjs();
      const thisMonthStart = now.startOf('month');

      const getLabel = (id: number) => statusOpts.find(o => o.id === id)?.label || '';
      const inProgressStatusIds = statusOpts.filter(o => o.label === '进行中').map(o => o.id);

      const inProgress = projects.filter(p => inProgressStatusIds.includes(p.status_id)).length;
      const thisMonthCount = projects.filter(p => dayjs(p.created_at).isAfter(thisMonthStart)).length;
      const avgDur = projects.length > 0 ? Math.round(projects.reduce((s, p) => s + (p.duration_days || 0), 0) / projects.length) : 0;

      setStats({ total: projects.length, inProgress, thisMonth: thisMonthCount, avgDuration: avgDur });

      // Status distribution
      const statusCount: Record<string, number> = {};
      projects.forEach(p => { const l = getLabel(p.status_id); statusCount[l] = (statusCount[l] || 0) + 1; });
      setStatusData(Object.entries(statusCount).map(([k, v]) => ({ x: k, y: v })));

      // Region distribution
      const regionCount: Record<string, number> = {};
      projects.forEach(p => { regionCount[p.region] = (regionCount[p.region] || 0) + 1; });
      setRegionData(Object.entries(regionCount).map(([k, v]) => ({ x: k, y: v })));

      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, []);

  if (loading) return <Spin style={{ display: 'block', margin: '100px auto' }} />;

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>数据概览</h2>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}><Card><Statistic title="项目总数" value={stats.total} prefix={<ProjectOutlined />} /></Card></Col>
        <Col span={6}><Card><Statistic title="进行中" value={stats.inProgress} prefix={<PlayCircleOutlined />} valueStyle={{ color: token.colorPrimary }} /></Card></Col>
        <Col span={6}><Card><Statistic title="本月新增" value={stats.thisMonth} prefix={<PlusCircleOutlined />} valueStyle={{ color: token.colorSuccess }} /></Card></Col>
        <Col span={6}><Card><Statistic title="平均工期(天)" value={stats.avgDuration} prefix={<ClockCircleOutlined />} /></Card></Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Card title="项目状态分布">
            <Pie theme={chartTheme} data={statusData} angleField="y" colorField="x" radius={0.8} height={300} autoFit
              scale={{ color: { range: [token.colorPrimary, token.colorSuccess, token.colorWarning, token.colorError, '#722ED1'] } }}
              label={{ text: 'y', position: 'outside', style: { fontWeight: 500 } }}
              tooltip={{ title: (d: any) => d.x, items: [(d: any) => ({ name: '项目数量', value: String(d.y) })] }} />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="区域分布">
            <Column theme={chartTheme} data={regionData} xField="x" yField="y" height={300} autoFit
              scale={{ color: { range: [token.colorPrimary, token.colorPrimaryHover, token.colorPrimaryBorder, token.colorPrimaryBorderHover, token.colorPrimaryBgHover] } }}
              legend={false}
              tooltip={(d: any) => ({ name: '项目数量', value: String(d.y) })} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
