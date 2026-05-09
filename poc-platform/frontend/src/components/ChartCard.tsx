import { useEffect, useState, useCallback } from 'react';
import { Card, Spin, Empty, Dropdown, message } from 'antd';
import { MoreOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { Column, Bar, Pie, Line, DualAxes } from '@ant-design/charts';
import { queryProjectData } from '../api/projects';
import type { ChartConfig } from '../api/dashboards';

interface ChartCardProps {
  config: ChartConfig;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export default function ChartCard({ config, onEdit, onDelete }: ChartCardProps) {
  const [data, setData] = useState<{ x: string; y: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [size, setSize] = useState({ w: 300, h: config.h || 400 });

  const fetchData = useCallback(() => {
    setLoading(true);
    queryProjectData({
      filters: [],
      x_field: config.x_field,
      y_field: config.y_field,
    })
      .then((r) => setData(r.data.data))
      .finally(() => setLoading(false));
  }, [config.x_field, config.y_field]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const menuItems = {
    items: [
      { key: 'refresh', icon: <ReloadOutlined />, label: '刷新数据' },
      ...(onEdit ? [{ key: 'edit', icon: <EditOutlined />, label: '编辑' }] : []),
      ...(onDelete ? [{ key: 'delete', icon: <DeleteOutlined />, label: '删除', danger: true }] : []),
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === 'refresh') { fetchData(); message.success('已刷新'); }
      if (key === 'edit') onEdit?.(config.id);
      if (key === 'delete') onDelete?.(config.id);
    },
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = size.w;
    const startH = size.h;

    const onMouseMove = (ev: MouseEvent) => {
      setSize({
        w: Math.max(200, startW + (ev.clientX - startX)),
        h: Math.max(200, startH + (ev.clientY - startY)),
      });
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [size]);

  const renderChart = () => {
    if (loading) return <Spin style={{ display: 'block', margin: '60px auto' }} />;
    if (data.length === 0) return <Empty description="暂无数据" />;

    if (config.type === 'pie') {
      return (
        <Pie
          data={data}
          angleField="y"
          colorField="x"
          radius={0.8}
          height={size.h || 400}
          autoFit
          label={{
            type: 'outer' as const,
            content: '{name} {percentage}',
          }}
          legend={{ position: 'bottom' as const }}
          interactions={[{ type: 'element-active' }]}
        />
      );
    }

    const commonConfig = {
      data,
      xField: 'x',
      yField: 'y',
      height: size.h || 400,
      autoFit: true,
      label: { style: { fill: '#666', fontSize: 12 } },
    };

    switch (config.type) {
      case 'column':
        return <Column {...commonConfig} legend={{ position: 'top' as const }} />;
      case 'bar':
        return <Bar {...commonConfig} legend={{ position: 'top' as const }} />;
      case 'line':
        return <Line {...commonConfig} legend={{ position: 'top' as const }} />;
      case 'dual-axes':
        return <DualAxes {...commonConfig} legend={{ position: 'top' as const }} geometryOptions={[{ geometry: 'column' }, { geometry: 'line' }]} />;
      default:
        return <Column {...commonConfig} legend={{ position: 'top' as const }} />;
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        width: size.w,
        height: 'auto',
        minWidth: 200,
        minHeight: 200,
      }}
    >
      <Card
        title={config.title || '未命名图表'}
        extra={
          <Dropdown menu={menuItems} trigger={['click']}>
            <MoreOutlined style={{ fontSize: 18, cursor: 'pointer', padding: 4 }} />
          </Dropdown>
        }
        style={{ height: '100%' }}
      >
        {renderChart()}
      </Card>
      <div
        onMouseDown={handleMouseDown}
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: 16,
          height: 16,
          cursor: 'nwse-resize',
          background: 'linear-gradient(135deg, transparent 50%, #d9d9d9 50%)',
          borderRadius: '0 0 6px 0',
        }}
      />
    </div>
  );
}
