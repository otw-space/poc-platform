import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, Spin, Empty, message } from 'antd';
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
  tl: 'nwse-resize', tr: 'nesw-resize', bl: 'nesw-resize', br: 'nwse-resize',
};

export default function ChartCard({ config, onEdit, onDelete }: ChartCardProps) {
  const [data, setData] = useState<{ x: string; y: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const initial = getInitialSize(config.id, config.h || 400);
  const [size, setSize] = useState(initial);
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const rafRef = useRef<number>(0);
  const menuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    setTimeout(() => document.addEventListener('click', handler), 0);
    return () => document.removeEventListener('click', handler);
  }, [menuOpen]);

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
        let newW = startW, newH = startH;
        if (corner === 'tr' || corner === 'br') newW = startW + dx;
        if (corner === 'tl' || corner === 'bl') newW = startW - dx;
        if (corner === 'bl' || corner === 'br') newH = startH + dy;
        if (corner === 'tl' || corner === 'tr') newH = startH - dy;
        setSize({ w: Math.max(200, newW), h: Math.max(200, newH) });
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

  const doRefresh = () => { setMenuOpen(false); fetchData(); message.success('已刷新'); };
  const doEdit = () => { setMenuOpen(false); onEdit?.(config.id); };
  const doDelete = () => { setMenuOpen(false); onDelete?.(config.id); };

  const renderChart = () => {
    if (loading) return <Spin style={{ display: 'block', margin: '60px auto' }} />;
    if (data.length === 0) return <Empty description="暂无数据" />;

    if (config.type === 'pie') {
      return (
        <Pie
          data={data} angleField="y" colorField="x" radius={0.8} height={size.h} autoFit
          label={{ type: 'outer' as const, content: '{name} {percentage}' }}
          legend={{ position: 'bottom' as const }}
          interactions={[{ type: 'element-active' }]}
        />
      );
    }

    const cc = { data, xField: 'x', yField: 'y', height: size.h, autoFit: true };
    switch (config.type) {
      case 'column': return <Column {...cc} legend={{ position: 'top' as const }} />;
      case 'bar': return <Bar {...cc} legend={{ position: 'top' as const }} />;
      case 'line': return <Line {...cc} legend={{ position: 'top' as const }} />;
      case 'dual-axes': return <DualAxes {...cc} legend={{ position: 'top' as const }} geometryOptions={[{ geometry: 'column' }, { geometry: 'line' }]} />;
      default: return <Column {...cc} legend={{ position: 'top' as const }} />;
    }
  };

  const corners: Corner[] = ['tl', 'tr', 'bl', 'br'];
  const cornerStyle = (c: Corner): React.CSSProperties => ({
    position: 'absolute', width: 16, height: 16, cursor: CORNER_CURSORS[c], zIndex: 10,
    background: 'linear-gradient(135deg, transparent 50%, #d9d9d9 50%)', borderRadius: '0 0 4px 0',
    ...(c === 'tl' ? { top: 0, left: 0, transform: 'rotate(180deg)' } : {}),
    ...(c === 'tr' ? { top: 0, right: 0, transform: 'rotate(270deg)' } : {}),
    ...(c === 'bl' ? { bottom: 0, left: 0, transform: 'rotate(90deg)' } : {}),
    ...(c === 'br' ? { bottom: 0, right: 0 } : {}),
  });

  const menuBtnStyle: React.CSSProperties = {
    display: 'block', width: '100%', padding: '8px 16px', border: 'none', background: 'none',
    cursor: 'pointer', textAlign: 'left', fontSize: 14, lineHeight: '22px', borderRadius: 0,
  };

  return (
    <div style={{ position: 'relative', width: size.w, minWidth: 200, flexShrink: 0 }}>
      <Card
        title={config.title || '未命名图表'}
        extra={
          <div ref={menuRef} style={{ position: 'relative', display: 'inline-block' }}>
            <MoreOutlined
              style={{ fontSize: 18, cursor: 'pointer', padding: 4 }}
              onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
            />
            {menuOpen && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, zIndex: 1050,
                background: '#fff', borderRadius: 8, boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
                minWidth: 140, padding: '4px 0', border: '1px solid #f0f0f0',
              }}>
                <button type="button" style={menuBtnStyle} onClick={doRefresh}>
                  <ReloadOutlined style={{ marginRight: 8 }} />刷新数据
                </button>
                <button type="button" style={menuBtnStyle} onClick={doEdit}>
                  <EditOutlined style={{ marginRight: 8 }} />编辑
                </button>
                <button type="button" style={{ ...menuBtnStyle, color: '#ff4d4f' }} onClick={doDelete}>
                  <DeleteOutlined style={{ marginRight: 8 }} />删除
                </button>
              </div>
            )}
          </div>
        }
        style={{ height: '100%' }}
      >
        {renderChart()}
      </Card>
      {corners.map((c) => (
        <div key={c} onMouseDown={(e) => handleResizeStart(e, c)} style={cornerStyle(c)} />
      ))}
    </div>
  );
}
