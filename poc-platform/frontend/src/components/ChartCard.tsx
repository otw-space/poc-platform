import { useEffect, useState } from 'react';
import { Card, Spin, Empty } from 'antd';
import { Column, Bar, Pie, Line, DualAxes } from '@ant-design/charts';
import { queryProjectData } from '../api/projects';
import type { ChartConfig } from '../api/dashboards';

export default function ChartCard({ config }: { config: ChartConfig }) {
  const [data, setData] = useState<{ x: string; y: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    queryProjectData({
      filters: [],
      x_field: config.x_field,
      y_field: config.y_field,
    })
      .then((r) => setData(r.data.data))
      .finally(() => setLoading(false));
  }, [config.x_field, config.y_field]);

  const commonConfig = {
    data,
    xField: 'x',
    yField: 'y',
    height: config.h || 400,
    autoFit: true,
    legend: { position: 'top' as const },
    label: {
      style: { fill: '#666', fontSize: 12 },
    },
  };

  const renderChart = () => {
    if (loading) return <Spin style={{ display: 'block', margin: '60px auto' }} />;
    if (data.length === 0) return <Empty description="暂无数据" />;

    switch (config.type) {
      case 'column':
        return <Column {...commonConfig} />;
      case 'bar':
        return <Bar {...commonConfig} />;
      case 'pie':
        return <Pie {...commonConfig} angleField="y" colorField="x" radius={0.8} />;
      case 'line':
        return <Line {...commonConfig} />;
      case 'dual-axes':
        return <DualAxes {...commonConfig} geometryOptions={[{ geometry: 'column' }, { geometry: 'line' }]} />;
      default:
        return <Column {...commonConfig} />;
    }
  };

  return (
    <Card title={config.title || '未命名图表'} style={{ height: '100%' }}>
      {renderChart()}
    </Card>
  );
}
