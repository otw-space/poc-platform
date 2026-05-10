import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, Spin, Empty, message, Form, Input, Select } from 'antd';
import { MoreOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, CheckOutlined } from '@ant-design/icons';
import { Column, Bar, Pie, Line, DualAxes } from '@ant-design/charts';
import { queryProjectData } from '../api/projects';
import ColorSchemePicker, { COLOR_SCHEMES } from './ColorSchemePicker';
import type { ChartConfig } from '../api/dashboards';

interface ChartCardProps {
  config: ChartConfig;
  dashboardId?: string;
  isEditing?: boolean;
  onEditStart?: (chartId: string) => void;
  onEditEnd?: (chartId: string) => void;
  onDelete?: (id: string) => void;
  onUpdate?: (chartId: string, updates: Partial<ChartConfig>) => void;
}

const CHART_TYPES = [
  { label: '柱状图', value: 'column' },
  { label: '条形图', value: 'bar' },
  { label: '饼图', value: 'pie' },
  { label: '折线图', value: 'line' },
  { label: '组合图', value: 'dual-axes' },
];

const DIMENSION_FIELDS = [
  { label: '区域', value: 'region' },
  { label: '城市', value: 'city' },
  { label: '销售', value: 'sales' },
  { label: '项目经理', value: 'pm' },
  { label: 'PoC类型', value: 'poc_type' },
  { label: '实施方式', value: 'impl_method' },
  { label: '状态', value: 'status' },
];

const METRIC_FIELDS = [
  { label: '项目数量', value: 'count' },
  { label: '平均工期', value: 'avg_duration' },
];

export default function ChartCard({ config, dashboardId, isEditing, onEditStart, onEditEnd, onDelete, onUpdate }: ChartCardProps) {
  const [data, setData] = useState<{ x: string; y: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
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

  const doRefresh = () => { setMenuOpen(false); fetchData(); message.success('已刷新'); };
  const doEdit = () => { setMenuOpen(false); onEditStart?.(config.id); };
  const doDelete = () => { setMenuOpen(false); onDelete?.(config.id); };
  const doFinishEdit = () => { onEditEnd?.(config.id); };

  const colorScheme = COLOR_SCHEMES[config.colorScheme || 'default-blue'] || COLOR_SCHEMES['default-blue'];
  const chartColor = config.type === 'pie' ? colorScheme.colors : colorScheme.colors[0];

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
          height={config.h || 300}
          color={colorScheme.colors}
          autoFit
        />
      );
    }

    const cc = {
      data,
      xField: 'x',
      yField: 'y',
      height: config.h || 300,
      autoFit: true,
      color: chartColor,
    };
    switch (config.type) {
      case 'column': return <Column {...cc} legend={{ position: 'top' as const }} />;
      case 'bar': return <Bar {...cc} legend={{ position: 'top' as const }} />;
      case 'line': return <Line {...cc} legend={{ position: 'top' as const }} />;
      case 'dual-axes':
        return <DualAxes {...cc} legend={{ position: 'top' as const }} geometryOptions={[{ geometry: 'column' }, { geometry: 'line' }]} />;
      default: return <Column {...cc} legend={{ position: 'top' as const }} />;
    }
  };

  const menuBtnStyle: React.CSSProperties = {
    display: 'block', width: '100%', padding: '8px 16px', border: 'none', background: 'none',
    cursor: 'pointer', textAlign: 'left', fontSize: 14, lineHeight: '22px', borderRadius: 0,
  };

  return (
    <div className="chart-card-wrapper" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Card
        title={config.title || '未命名图表'}
        size="small"
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
        style={{ flex: 1 }}
      >
        {renderChart()}
      </Card>

      {isEditing && (
        <Card
          size="small"
          style={{ marginTop: 8, background: '#fafafa' }}
          title="编辑图表"
          extra={
            <button
              type="button"
              onClick={doFinishEdit}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1677ff', fontSize: 14 }}
            >
              <CheckOutlined /> 完成
            </button>
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            <Form.Item label="标题" style={{ marginBottom: 0 }}>
              <Input
                value={config.title}
                onChange={(e) => onUpdate?.(config.id, { title: e.target.value })}
                placeholder="图表标题"
              />
            </Form.Item>
            <Form.Item label="类型" style={{ marginBottom: 0 }}>
              <Select
                value={config.type}
                onChange={(v) => onUpdate?.(config.id, { type: v })}
                options={CHART_TYPES}
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item label="X轴维度" style={{ marginBottom: 0 }}>
              <Select
                value={config.x_field}
                onChange={(v) => onUpdate?.(config.id, { x_field: v })}
                options={DIMENSION_FIELDS}
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item label="Y轴指标" style={{ marginBottom: 0 }}>
              <Select
                value={config.y_field}
                onChange={(v) => onUpdate?.(config.id, { y_field: v })}
                options={METRIC_FIELDS}
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item label="配色方案" style={{ marginBottom: 0 }}>
              <ColorSchemePicker
                value={config.colorScheme || 'default-blue'}
                onChange={(v) => onUpdate?.(config.id, { colorScheme: v })}
              />
            </Form.Item>
          </div>
        </Card>
      )}
    </div>
  );
}
