import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, Spin, Empty, message, Form, Input, Select, Popover, Switch, Statistic } from 'antd';
import { MoreOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, CheckOutlined, DownloadOutlined as ChartDownloadOutlined, ProjectOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { Column, Bar, Pie, Line, DualAxes } from '@ant-design/charts';
import { queryProjectData } from '../api/projects';
import ColorSchemePicker, { COLOR_SCHEMES, generateGradientColors } from './ColorSchemePicker';
import ChartFilterBuilder from './ChartFilterBuilder';
import ProjectListModal from './ProjectListModal';
import type { ChartConfig, Dashboard } from '../api/dashboards';
import { CHART_TYPES, DIMENSION_FIELDS, METRIC_FIELDS } from '../constants/chart';

interface ChartCardProps {
  config: ChartConfig;
  dashboardId?: string;
  dashboards?: Dashboard[];
  isEditing?: boolean;
  onEditStart?: (chartId: string) => void;
  onEditEnd?: (chartId: string) => void;
  onDelete?: (id: string) => void;
  onUpdate?: (chartId: string, updates: Partial<ChartConfig>) => void;
  onMoveChart?: (chartId: string, fromDashboardId: string, toDashboardId: string) => void;
  onUpdateDashboard?: (dashboardId: string, updates: Partial<Dashboard>) => void;
}

export default function ChartCard({ config, dashboardId, dashboards, isEditing, onEditStart, onEditEnd, onDelete, onUpdate, onMoveChart, onUpdateDashboard }: ChartCardProps) {
  const [data, setData] = useState<{ x: string; y: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editTargetDashboardId, setEditTargetDashboardId] = useState<string | undefined>(undefined);
  const [chartInstance, setChartInstance] = useState<any>(null);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [projectModalFilters, setProjectModalFilters] = useState<{ field: string; op: string; value: any }[]>([]);
  const [projectModalTitle, setProjectModalTitle] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  const filtersKey = JSON.stringify(config.filters || []);

  const fetchData = useCallback(() => {
    setLoading(true);
    const payload: any = {
      filters: config.filters || [],
      x_field: config.x_field || 'region',
      y_field: config.y_field,
    };
    if (config.type === 'stat') payload.aggregate = true;
    queryProjectData(payload)
      .then((r) => setData(r.data.data))
      .finally(() => setLoading(false));
  }, [config.x_field, config.y_field, config.type, filtersKey]);

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

  const handleChartClick = (chart: any, event: any) => {
    if (event.type !== 'element:click') return;
    const clickedData = event.data?.data;
    if (!clickedData || clickedData.x === undefined) return;
    const clickedX = String(clickedData.x);
    const dimensionFilter = { field: config.x_field, op: 'eq', value: clickedX };
    const combined = [...(config.filters || []), dimensionFilter];
    const fieldLabel = DIMENSION_FIELDS.find(f => f.value === config.x_field)?.label || config.x_field;
    setProjectModalTitle(`${fieldLabel}: ${clickedX}`);
    setProjectModalFilters(combined);
    setProjectModalOpen(true);
  };

  const handleStatClick = () => {
    setProjectModalTitle(config.title || '统计结果');
    setProjectModalFilters(config.filters || []);
    setProjectModalOpen(true);
  };

  const doEdit = () => { setMenuOpen(false); setEditTargetDashboardId(dashboardId); onEditStart?.(config.id); };
  const doDelete = () => { setMenuOpen(false); onDelete?.(config.id); };
  const doFinishEdit = () => {
    if (editTargetDashboardId && dashboardId && editTargetDashboardId !== dashboardId) {
      onMoveChart?.(config.id, dashboardId, editTargetDashboardId);
    }
    onEditEnd?.(config.id);
  };

  const handleDownloadImage = () => {
    if (chartInstance?.toDataURL) {
      const url = chartInstance.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `${config.title || '图表'}.png`;
      a.click();
      message.success('图表已导出');
    }
  };

  // reset editTargetDashboardId when edit mode starts
  useEffect(() => {
    if (isEditing) setEditTargetDashboardId(dashboardId);
  }, [isEditing, dashboardId]);

  const baseColorScheme = COLOR_SCHEMES[config.colorScheme || 'default-blue'] || COLOR_SCHEMES['default-blue'];
  const gradientColors = generateGradientColors(baseColorScheme.colors, Math.max(data.length, 4));

  const yLabel = config.y_field === 'count' ? '项目数量' : config.y_field === 'avg_duration' ? '平均工期' : '数值';
  const isDuration = config.y_field === 'avg_duration';

  const formatVal = (v: any) => {
    const num = typeof v === 'number' ? v : parseFloat(v);
    const s = !isNaN(num) ? (num % 1 === 0 ? String(num) : num.toFixed(1)) : String(v ?? '');
    return isDuration ? `${s}天` : s;
  };

  const tooltipFn = (d: any) => ({
    name: yLabel,
    value: formatVal(d.y),
  });

  const pieTooltipConfig = {
    title: (d: any) => d.x,
    items: [(d: any) => ({ name: yLabel, value: formatVal(d.y) })],
  };

  const renderChart = () => {
    if (loading) return <Spin style={{ display: 'block', margin: '60px auto' }} />;

    if (config.type === 'stat') {
      const value = data.length > 0 ? data[0].y : 0;
      const isCount = config.y_field === 'count';
      const prefix = isCount ? <ProjectOutlined /> : <ClockCircleOutlined />;
      return (
        <div onClick={handleStatClick} style={{ textAlign: 'center', padding: '40px 0', cursor: 'pointer' }}>
          <Statistic
            title={config.title || (isCount ? '项目总数' : '平均工期')}
            value={isCount ? Math.round(value) : value}
            precision={isCount ? 0 : 1}
            prefix={prefix}
            suffix={isCount ? '' : '天'}
            valueStyle={{ fontSize: 48, fontWeight: 700, color: isCount ? '#1677ff' : '#52c41a' }}
          />
          <div style={{ fontSize: 12, color: '#999', marginTop: 8 }}>点击查看项目详情</div>
        </div>
      );
    }

    if (data.length === 0) return <Empty description="暂无数据" />;

    if (config.type === 'pie') {
      return (
        <Pie
          key={`${config.id}-${data.length}-${JSON.stringify(data).length}`}
          data={data}
          angleField="y"
          colorField="x"
          radius={0.8}
          height={config.h || 300}
          scale={{ color: { range: gradientColors } }}
          tooltip={pieTooltipConfig}
          label={{ text: (d: any) => formatVal(d.y), position: 'outside', style: { fontWeight: 500 } }}
          autoFit
          onReady={(chart: any) => setChartInstance(chart)}
          onEvent={handleChartClick}
        />
      );
    }

    const categoryBase = {
      data,
      xField: 'x',
      yField: 'y',
      height: config.h || 300,
      autoFit: true,
      colorField: 'x',
      scale: { color: { range: gradientColors } },
      tooltip: tooltipFn,
    };
    switch (config.type) {
      case 'column': return <Column {...categoryBase} legend={{ position: 'top' as const }} onReady={(chart: any) => setChartInstance(chart)} onEvent={handleChartClick} />;
      case 'bar': return <Bar {...categoryBase} legend={{ position: 'top' as const }} onReady={(chart: any) => setChartInstance(chart)} onEvent={handleChartClick} />;
      case 'line': return <Line data={data} xField="x" yField="y" height={config.h || 300} autoFit scale={{ color: { range: [gradientColors[0]] } }} tooltip={tooltipFn} legend={{ position: 'top' as const }} onReady={(chart: any) => setChartInstance(chart)} onEvent={handleChartClick} />;
      case 'dual-axes':
        return <DualAxes {...categoryBase} legend={{ position: 'top' as const }} geometryOptions={[{ geometry: 'column' }, { geometry: 'line' }]} onReady={(chart: any) => setChartInstance(chart)} onEvent={handleChartClick} />;
      default: return <Column {...categoryBase} legend={{ position: 'top' as const }} onReady={(chart: any) => setChartInstance(chart)} onEvent={handleChartClick} />;
    }
  };

  const dashOptions = (dashboards || []).filter(d => (d.config?.charts || []).length > 0 || d.id === dashboardId).map(d => ({
    label: d.name,
    value: d.id,
  }));

  const editContent = (
    <div style={{ minWidth: 360, maxWidth: 560 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        <Form.Item label="标题" style={{ marginBottom: 0 }}>
          <Input size="small" value={config.title} onChange={(e) => onUpdate?.(config.id, { title: e.target.value })} placeholder="图表标题" />
        </Form.Item>
        <Form.Item label="类型" style={{ marginBottom: 0 }}>
          <Select size="small" value={config.type} onChange={(v) => onUpdate?.(config.id, { type: v })} options={CHART_TYPES} style={{ width: '100%' }} />
        </Form.Item>
        {config.type !== 'stat' && (
          <Form.Item label="X轴维度" style={{ marginBottom: 0 }}>
            <Select size="small" value={config.x_field} onChange={(v) => onUpdate?.(config.id, { x_field: v })} options={DIMENSION_FIELDS} style={{ width: '100%' }} />
          </Form.Item>
        )}
        <Form.Item label="Y轴指标" style={{ marginBottom: 0 }}>
          <Select size="small" value={config.y_field} onChange={(v) => onUpdate?.(config.id, { y_field: v })} options={METRIC_FIELDS} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item label="配色方案" style={{ marginBottom: 0 }}>
          <ColorSchemePicker value={config.colorScheme || 'default-blue'} onChange={(v) => onUpdate?.(config.id, { colorScheme: v })} />
        </Form.Item>
        <Form.Item label="公开" style={{ marginBottom: 0 }}>
          <Switch
            size="small"
            checked={dashboards?.find(d => d.id === dashboardId)?.is_public ?? false}
            onChange={(checked) => { if (dashboardId) onUpdateDashboard?.(dashboardId, { is_public: checked }); }}
          />
        </Form.Item>
        {dashOptions.length > 1 && (
          <Form.Item label="所属仪表盘" style={{ marginBottom: 0 }}>
            <Select size="small" value={editTargetDashboardId} onChange={setEditTargetDashboardId} options={dashOptions} style={{ width: '100%' }} />
          </Form.Item>
        )}
      </div>
      <div style={{ marginTop: 8, borderTop: '1px solid #f0f0f0', paddingTop: 8 }}>
        <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>筛选条件（可选）</div>
        <ChartFilterBuilder
          filters={config.filters || []}
          onChange={(f) => onUpdate?.(config.id, { filters: f })}
        />
      </div>
    </div>
  );

  const menuBtnStyle: React.CSSProperties = {
    display: 'block', width: '100%', padding: '8px 16px', border: 'none', background: 'none',
    cursor: 'pointer', textAlign: 'left', fontSize: 14, lineHeight: '22px', borderRadius: 0,
  };

  return (
    <div className="chart-card-wrapper" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Popover
        content={editContent}
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>编辑图表</span>
            <button type="button" onClick={doFinishEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1677ff', fontSize: 14 }}>
              <CheckOutlined /> 完成
            </button>
          </div>
        }
        trigger="click"
        open={isEditing}
        onOpenChange={(open) => { if (!open) doFinishEdit(); }}
        placement="bottomLeft"
        overlayStyle={{ maxWidth: '90vw' }}
      >
        <div style={{ flex: 1 }}>
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
                    <button type="button" style={menuBtnStyle} onClick={() => { setMenuOpen(false); handleDownloadImage(); }}>
                      <ChartDownloadOutlined style={{ marginRight: 8 }} />导出图片
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
        </div>
      </Popover>
      <ProjectListModal
        open={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        filters={projectModalFilters}
        title={projectModalTitle}
      />
    </div>
  );
}
