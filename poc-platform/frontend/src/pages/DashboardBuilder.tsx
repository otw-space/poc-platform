import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Form, Input, Select, Button, Switch, Space, message, Row, Col, Divider, Spin } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { createDashboard, updateDashboard, getDashboard, type ChartConfig } from '../api/dashboards';

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

export default function DashboardBuilder() {
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const isEdit = !!editId;

  const [name, setName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [charts, setCharts] = useState<ChartConfig[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (editId) {
      setLoading(true);
      getDashboard(editId)
        .then((r) => {
          setName(r.data.name);
          setIsPublic(r.data.is_public);
          setCharts(r.data.config?.charts || []);
        })
        .catch(() => message.error('加载仪表盘失败'))
        .finally(() => setLoading(false));
    }
  }, [editId]);

  const addChart = () => {
    setCharts((prev) => [
      ...prev,
      { id: generateId(), type: 'column', title: '', x_field: 'region', y_field: 'count', w: 12, h: 400 },
    ]);
  };

  const updateChart = (id: string, updates: Partial<ChartConfig>) => {
    setCharts((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const removeChart = (id: string) => {
    setCharts((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSave = async () => {
    if (!name.trim()) { message.error('请输入仪表盘名称'); return; }
    if (charts.length === 0) { message.error('请至少添加一个图表'); return; }
    setSaving(true);
    try {
      if (isEdit) {
        await updateDashboard(editId!, {
          name,
          is_public: isPublic,
          config: { filters: [], charts },
        });
        message.success('更新成功');
        navigate(`/dashboards/${editId}`);
      } else {
        const res = await createDashboard({
          name,
          is_public: isPublic,
          config: { filters: [], charts },
        });
        message.success('保存成功');
        navigate(`/dashboards/${res.data.id}`);
      }
    } catch {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spin style={{ display: 'block', margin: '100px auto' }} />;

  return (
    <Card title={isEdit ? '编辑仪表盘' : '新建仪表盘'} style={{ maxWidth: 900, margin: '0 auto' }}>
      <Space style={{ marginBottom: 24 }}>
        <Input placeholder="仪表盘名称" value={name} onChange={(e) => setName(e.target.value)} style={{ width: 240 }} />
        <Space>
          <Switch checked={isPublic} onChange={setIsPublic} />
          <span>公开</span>
        </Space>
      </Space>

      {charts.map((chart, idx) => (
        <Card
          key={chart.id}
          size="small"
          title={`图表 ${idx + 1}: ${chart.title || '(未命名)'}`}
          extra={<Button danger size="small" icon={<DeleteOutlined />} onClick={() => removeChart(chart.id)} />}
          style={{ marginBottom: 16 }}
        >
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item label="标题" style={{ marginBottom: 8 }}>
                <Input value={chart.title} onChange={(e) => updateChart(chart.id, { title: e.target.value })} placeholder="图表标题" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="图表类型" style={{ marginBottom: 8 }}>
                <Select value={chart.type} onChange={(v) => updateChart(chart.id, { type: v })} options={CHART_TYPES} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="X轴维度" style={{ marginBottom: 8 }}>
                <Select value={chart.x_field} onChange={(v) => updateChart(chart.id, { x_field: v })} options={DIMENSION_FIELDS} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Y轴指标" style={{ marginBottom: 8 }}>
                <Select value={chart.y_field} onChange={(v) => updateChart(chart.id, { y_field: v })} options={METRIC_FIELDS} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Card>
      ))}

      <Divider />
      <Space>
        <Button icon={<PlusOutlined />} onClick={addChart}>添加图表</Button>
        <Button type="primary" onClick={handleSave} loading={saving}>保存仪表盘</Button>
        <Button onClick={() => navigate('/dashboards')}>取消</Button>
      </Space>
    </Card>
  );
}
