import { useEffect, useState, useCallback, useRef } from 'react';
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

type Corner = 'tl' | 'tr' | 'bl' | 'br';

const CORNER_CURSORS: Record<Corner, string> = {
  tl: 'nwse-resize',
  tr: 'nesw-resize',
  bl: 'nesw-resize',
  br: 'nwse-resize',
};

const CORNER_STYLES = (corner: Corner): React.CSSProperties => ({
  position: 'absolute',
  width: 16,
  height: 16,
  cursor: CORNER_CURSORS[corner],
  background: 'linear-gradient(135deg, transparent 50%, #d9d9d9 50%)',
  borderRadius: '0 0 6px 0',
  ...(corner === 'tl' ? { top: 0, left: 0, transform: 'rotate(180deg)' } : {}),
  ...(corner === 'tr' ? { top: 0, right: 0, transform: 'rotate(270deg)' } : {}),
  ...(corner === 'bl' ? { bottom: 0, left: 0, transform: 'rotate(90deg)' } : {}),
  ...(corner === 'br' ? { bottom: 0, right: 0 } : {}),
});

export default function ChartCard({ config, onEdit, onDelete }: ChartCardProps) {
  const [data, setData] = useState<{ x: string; y: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [size, setSize] = useState({ w: 300, h: config.h || 400 });
  const sizeRef = useRef(size);
  sizeRef.current = size;

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

  const handleResizeStart = useCallback((e: React.MouseEvent, corner: Corner) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = sizeRef.current.w;
    const startH = sizeRef.current.h;

    const onMouseMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;

      let newW = startW;
      let newH = startH;

      // Right-side corners: expand/shrink width rightward
      if (corner === 'tr' || corner === 'br') newW = startW + dx;
      // Left-side corners: expand/shrink width leftward
      if (corner === 'tl' || corner === 'bl') newW = startW - dx;
      // Bottom corners: expand/shrink height downward
      if (corner === 'bl' || corner === 'br') newH = startH + dy;
      // Top corners: expand/shrink height upward
      if (corner === 'tl' || corner === 'tr') newH = startH - dy;

      setSize({
        w: Math.max(200, newW),
        h: Math.max(200, newH),
      });
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  const menuItems = {
    items: [
      { key: 'refresh', icon: <ReloadOutlined />, label: '刷新数据' },
      { key: 'edit', icon: <EditOutlined />, label: '编辑' },
      { key: 'delete', icon: <DeleteOutlined />, label: '删除', danger: true },
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === 'refresh') { fetchData(); message.success('已刷新'); return; }
      if (key === 'edit') { onEdit?.(config.id); return; }
      if (key === 'delete') { onDelete?.(config.id); return; }
    },
  };

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

  const corners: Corner[] = ['tl', 'tr', 'bl', 'br'];

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
            <MoreOutlined style={{ fontSize: 18, cursor: 'pointer', padding: 4 }} onClick={(e) => e.stopPropagation()} />
          </Dropdown>
        }
        style={{ height: '100%' }}
      >
        {renderChart()}
      </Card>
      {corners.map((corner) => (
        <div key={corner} onMouseDown={(e) => handleResizeStart(e, corner)} style={CORNER_STYLES(corner)} />
      ))}
    </div>
  );
}
