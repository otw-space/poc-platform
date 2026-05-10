import { useState } from 'react';
import { Modal, Form, Input, Select, Switch, Button, message, Space, Divider } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { createDashboard, type ChartConfig } from '../api/dashboards';
import ColorSchemePicker from './ColorSchemePicker';

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

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateDashboardModal({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [charts, setCharts] = useState<ChartConfig[]>([
    { id: generateId(), type: 'column', title: '', x_field: 'region', y_field: 'count', w: 4, h: 300, colorScheme: 'default-blue' },
  ]);
  const [saving, setSaving] = useState(false);

  const addChart = () => {
    setCharts((prev) => [
      ...prev,
      { id: generateId(), type: 'column', title: '', x_field: 'region', y_field: 'count', w: 4, h: 300, colorScheme: 'default-blue' },
    ]);
  };

  const updateChart = (id: string, updates: Partial<ChartConfig>) => {
    setCharts((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const removeChart = (id: string) => {
    setCharts((prev) => prev.filter((c) => c.id !== id));
  };

  const handleCreate = async () => {
    if (!name.trim()) { message.error('请输入仪表盘名称'); return; }
    if (charts.length === 0) { message.error('请至少添加一个图表'); return; }
    setSaving(true);
    try {
      await createDashboard({
        name,
        is_public: isPublic,
        config: { filters: [], charts },
      });
      message.success('仪表盘创建成功');
      setName('');
      setIsPublic(false);
      setCharts([
        { id: generateId(), type: 'column', title: '', x_field: 'region', y_field: 'count', w: 4, h: 300, colorScheme: 'default-blue' },
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
    setCharts([
      { id: generateId(), type: 'column', title: '', x_field: 'region', y_field: 'count', w: 4, h: 300, colorScheme: 'default-blue' },
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
      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="仪表盘名称"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ width: 240 }}
        />
        <Space>
          <Switch checked={isPublic} onChange={setIsPublic} />
          <span>公开</span>
        </Space>
      </Space>

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
            <Form.Item label="X轴维度" style={{ marginBottom: 0 }}>
              <Select
                value={chart.x_field}
                onChange={(v) => updateChart(chart.id, { x_field: v })}
                options={DIMENSION_FIELDS}
                style={{ width: '100%' }}
              />
            </Form.Item>
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
        </div>
      ))}

      <Divider style={{ margin: '12px 0' }} />
      <Button icon={<PlusOutlined />} onClick={addChart}>添加图表</Button>
    </Modal>
  );
}
