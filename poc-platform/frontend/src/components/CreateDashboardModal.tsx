import { useState, useMemo } from 'react';
import { Modal, Form, Input, Select, Switch, Button, message, Space, Divider, AutoComplete } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { createDashboard, updateDashboard, type ChartConfig, type Dashboard } from '../api/dashboards';
import ColorSchemePicker from './ColorSchemePicker';
import ChartFilterBuilder from './ChartFilterBuilder';
import { CHART_TYPES, DIMENSION_FIELDS, METRIC_FIELDS } from '../constants/chart';

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  existingDashboards: Dashboard[];
}

export default function CreateDashboardModal({ open, onClose, onCreated, existingDashboards }: Props) {
  const [name, setName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [selectedDashboardId, setSelectedDashboardId] = useState<string | null>(null);
  const [charts, setCharts] = useState<ChartConfig[]>([
    { id: generateId(), type: 'column', title: '', x_field: 'region', y_field: 'count', w: 4, h: 300, colorScheme: 'default-blue', filters: [] },
  ]);
  const [saving, setSaving] = useState(false);

  const newName = name.trim();
  const existingMatch = useMemo(() => {
    if (!newName) return null;
    return existingDashboards.find(d => d.name === newName) || null;
  }, [newName, existingDashboards]);

  const dashboardOptions = existingDashboards
    .filter(d => (d.config?.charts || []).length > 0)
    .map(d => ({ value: d.name, label: d.name, id: d.id }));

  const addChart = () => {
    setCharts((prev) => [
      ...prev,
      { id: generateId(), type: 'column', title: '', x_field: 'region', y_field: 'count', w: 4, h: 300, colorScheme: 'default-blue', filters: [] },
    ]);
  };

  const updateChart = (id: string, updates: Partial<ChartConfig>) => {
    setCharts((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const removeChart = (id: string) => {
    setCharts((prev) => prev.filter((c) => c.id !== id));
  };

  const handleCreate = async () => {
    if (!newName) { message.error('请输入仪表盘名称'); return; }
    if (charts.length === 0) { message.error('请至少添加一个图表'); return; }
    setSaving(true);
    try {
      // If name matches existing dashboard, add charts to it
      if (existingMatch) {
        const existingCharts = existingMatch.config?.charts || [];
        await updateDashboard(existingMatch.id, {
          config: { ...(existingMatch.config || { filters: [] }), charts: [...existingCharts, ...charts] },
        });
        message.success(`已添加到「${existingMatch.name}」`);
      } else {
        await createDashboard({
          name: newName,
          is_public: isPublic,
          config: { filters: [], charts },
        });
        message.success('仪表盘创建成功');
      }
      setName('');
      setIsPublic(false);
      setSelectedDashboardId(null);
      setCharts([
        { id: generateId(), type: 'column', title: '', x_field: 'region', y_field: 'count', w: 4, h: 300, colorScheme: 'default-blue', filters: [] },
      ]);
      onCreated();
      onClose();
    } catch {
      message.error('创建失败');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setName('');
    setIsPublic(false);
    setSelectedDashboardId(null);
    setCharts([
      { id: generateId(), type: 'column', title: '', x_field: 'region', y_field: 'count', w: 4, h: 300, colorScheme: 'default-blue', filters: [] },
    ]);
    onClose();
  };

  return (
    <Modal
      title="新建仪表盘"
      open={open}
      onCancel={handleCancel}
      width={680}
      footer={[
        <Button key="cancel" onClick={handleCancel}>取消</Button>,
        <Button key="create" type="primary" loading={saving} onClick={handleCreate}>创建并查看</Button>,
      ]}
    >
      <div style={{ marginBottom: 16 }}>
        <Space>
          <AutoComplete
            placeholder="搜索或输入仪表盘名称"
            value={name}
            onChange={(v) => { setName(v); setSelectedDashboardId(null); }}
            onSelect={(v) => { setName(v); }}
            options={dashboardOptions}
            style={{ width: 280 }}
            filterOption={(inputValue, option) =>
              option?.label?.toString().toLowerCase().includes(inputValue.toLowerCase()) ?? false
            }
          />
          <Space>
            <Switch checked={isPublic} onChange={setIsPublic} />
            <span>公开</span>
          </Space>
        </Space>
        {existingMatch && newName && (
          <div style={{ marginTop: 6, fontSize: 12, color: '#1677ff' }}>
            已匹配已有仪表盘「{existingMatch.name}」，图表将自动添加到其中
          </div>
        )}
      </div>

      {charts.map((chart, idx) => (
        <div
          key={chart.id}
          style={{
            marginBottom: 12,
            padding: 12,
            border: '1px solid #f0f0f0',
            borderRadius: 8,
            background: '#fafafa',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>图表 {idx + 1}</span>
            {charts.length > 1 && (
              <Button danger size="small" icon={<DeleteOutlined />} onClick={() => removeChart(chart.id)} />
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            <Form.Item label="标题" style={{ marginBottom: 0 }}>
              <Input
                value={chart.title}
                onChange={(e) => updateChart(chart.id, { title: e.target.value })}
                placeholder="图表标题"
              />
            </Form.Item>
            <Form.Item label="类型" style={{ marginBottom: 0 }}>
              <Select
                value={chart.type}
                onChange={(v) => updateChart(chart.id, { type: v })}
                options={CHART_TYPES}
                style={{ width: '100%' }}
              />
            </Form.Item>
            {chart.type !== 'stat' && (
              <Form.Item label="X轴维度" style={{ marginBottom: 0 }}>
                <Select
                  value={chart.x_field}
                  onChange={(v) => updateChart(chart.id, { x_field: v })}
                  options={DIMENSION_FIELDS}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            )}
            <Form.Item label="Y轴指标" style={{ marginBottom: 0 }}>
              <Select
                value={chart.y_field}
                onChange={(v) => updateChart(chart.id, { y_field: v })}
                options={METRIC_FIELDS}
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item label="配色方案" style={{ marginBottom: 0 }}>
              <ColorSchemePicker
                value={chart.colorScheme || 'default-blue'}
                onChange={(v) => updateChart(chart.id, { colorScheme: v })}
              />
            </Form.Item>
          </div>
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>筛选条件（可选）</div>
            <ChartFilterBuilder
              filters={chart.filters || []}
              onChange={(f) => updateChart(chart.id, { filters: f })}
            />
          </div>
        </div>
      ))}

      <Divider style={{ margin: '12px 0' }} />
      <Button icon={<PlusOutlined />} onClick={addChart}>添加图表</Button>
    </Modal>
  );
}
