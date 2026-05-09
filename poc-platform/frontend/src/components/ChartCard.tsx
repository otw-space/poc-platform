import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, Spin, Empty, Popover, Button, Space, message } from 'antd';
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

const LS_KEY = 'chart_sizes';

function loadSizes(): Record<string, { w: number; h: number }> {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch { return {}; }
}

function saveSize(chartId: string, w: number, h: number) {
  const sizes = loadSizes();
  sizes[chartId] = { w, h };
  localStorage.setItem(LS_KEY, JSON.stringify(sizes));
}

function getInitialSize(chartId: string, defaultH: number) {
  const sizes = loadSizes();
  const saved = sizes[chartId];
  return saved ? saved : { w: 400, h: defaultH || 400 };
}

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
  borderRadius: '0 0 4px 0',
  zIndex: 10,
  ...(corner === 'tl' ? { top: 0, left: 0, transform: 'rotate(180deg)' } : {}),
  ...(corner === 'tr' ? { top: 0, right: 0, transform: 'rotate(270deg)' } : {}),
  ...(corner === 'bl' ? { bottom: 0, left: 0, transform: 'rotate(90deg)' } : {}),
  ...(corner === 'br' ? { bottom: 0, right: 0 } : {}),
});

export default function ChartCard({ config, onEdit, onDelete }: ChartCardProps) {
  const [data, setData] = useState<{ x: string; y: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const initial = getInitialSize(config.id, config.h || 400);
  const [size, setSize] = useState(initial);
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const rafRef = useRef<number>(0);

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
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;

        let newW = startW;
        let newH = startH;

        if (corner === 'tr' || corner === 'br') newW = startW + dx;
        if (corner === 'tl' || corner === 'bl') newW = startW - dx;
        if (corner === 'bl' || corner === 'br') newH = startH + dy;
        if (corner === 'tl' || corner === 'tr') newH = startH - dy;

        const clampedW = Math.max(200, newW);
        const clampedH = Math.max(200, newH);
        setSize({ w: clampedW, h: clampedH });
      });
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      saveSize(config.id, sizeRef.current.w, sizeRef.current.h);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [config.id]);

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(false);
    fetchData();
    message.success('已刷新');
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(false);
    onEdit?.(config.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(false);
    onDelete?.(config.id);
  };

  const overlay = (
    <Space direction="vertical" style={{ padding: '4px 0' }}>
      <Button type="text" icon={<ReloadOutlined />} onClick={handleRefresh} block style={{ textAlign: 'left' }}>
        刷新数据
      </Button>
      <Button type="text" icon={<EditOutlined />} onClick={handleEdit} block style={{ textAlign: 'left' }}>
        编辑
      </Button>
      <Button type="text" danger icon={<DeleteOutlined />} onClick={handleDelete} block style={{ textAlign: 'left' }}>
        删除
      </Button>
    </Space>
  );

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
          height={size.h}
          autoFit
          label={{ type: 'outer' as const, content: '{name} {percentage}' }}
          legend={{ position: 'bottom' as const }}
          interactions={[{ type: 'element-active' }]}
        />
      );
    }

    const commonConfig = {
      data,
      xField: 'x',
      yField: 'y',
      height: size.h,
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
    <div style={{ position: 'relative', width: size.w, minWidth: 200, flexShrink: 0 }}>
      <Card
        title={config.title || '未命名图表'}
        extra={
          <Popover
            content={overlay}
            trigger="click"
            open={open}
            onOpenChange={setOpen}
            placement="bottomRight"
            overlayInnerStyle={{ padding: 4 }}
          >
            <MoreOutlined style={{ fontSize: 18, cursor: 'pointer', padding: 4 }} />
          </Popover>
        }
        style={{ height: '100%' }}
      >
        {renderChart()}
      </Card>
      {(['tl', 'tr', 'bl', 'br'] as Corner[]).map((corner) => (
        <div key={corner} onMouseDown={(e) => handleResizeStart(e, corner)} style={CORNER_STYLES(corner)} />
      ))}
    </div>
  );
}
