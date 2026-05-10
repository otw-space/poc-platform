# Dashboard UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge DashboardList/Builder/View into a single DashboardCanvas with react-grid-layout free drag canvas, color scheme presets, modal-based creation, and inline editing.

**Architecture:** Single-page `/dashboards` canvas with group tabs filtering charts across all dashboards. react-grid-layout provides drag/resize on a 12-column responsive grid. Creation via modal, editing via inline panel. Layout coordinates stored per-chart in backend.

**Tech Stack:** React 18, TypeScript, Ant Design 5, @ant-design/charts 2, react-grid-layout, axios

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `package.json` | Modify | Add `react-grid-layout` dep |
| `api/dashboards.ts` | Modify | Add `colorScheme`, `x`, `y` fields to ChartConfig |
| `components/ColorSchemePicker.tsx` | Create | Color scheme selector with swatch preview |
| `components/CreateDashboardModal.tsx` | Create | Modal form for creating dashboards with initial charts |
| `components/ChartCard.tsx` | Modify | Remove corner markers, add colorScheme rendering, add inline edit panel |
| `pages/DashboardCanvas.tsx` | Create | Unified canvas page (replaces List + View + Builder) |
| `App.tsx` | Modify | Consolidate dashboard routes to single `/dashboards` |
| `pages/DashboardList.tsx` | Delete | Merged into DashboardCanvas |
| `pages/DashboardView.tsx` | Delete | Merged into DashboardCanvas |
| `pages/DashboardBuilder.tsx` | Delete | Replaced by CreateDashboardModal + inline edit |

---

### Task 1: Install react-grid-layout

**Files:**
- Modify: `poc-platform/frontend/package.json`

- [ ] **Step 1: Add dependency and install**

```bash
cd poc-platform/frontend && npm install react-grid-layout
```

- [ ] **Step 2: Verify install**

```bash
cd poc-platform/frontend && node -e "require('react-grid-layout'); console.log('OK')"
```
Expected: `OK` (no error)

- [ ] **Step 3: Commit**

```bash
git add poc-platform/frontend/package.json poc-platform/frontend/package-lock.json
git commit -m "chore: add react-grid-layout for dashboard drag/resize"
```

---

### Task 2: Update API types

**Files:**
- Modify: `poc-platform/frontend/src/api/dashboards.ts`

- [ ] **Step 1: Add fields to ChartConfig and DashboardConfig**

Read `poc-platform/frontend/src/api/dashboards.ts`. Replace the `ChartConfig` interface:

```ts
export interface ChartConfig {
  id: string;
  type: string;
  title: string;
  x_field: string;
  y_field: string;
  group_field?: string | null;
  w: number;
  h: number;
  x?: number;
  y?: number;
  colorScheme?: string;
}
```

And update `DashboardConfig`:

```ts
export interface DashboardConfig {
  filters: { field: string; op: string; value: any }[];
  charts: ChartConfig[];
}
```

No other API function changes needed — `updateDashboard` already accepts `Partial<Dashboard>` with `config`.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd poc-platform/frontend && npx tsc --noEmit
```
Expected: No new errors from types change. (May have existing errors in other files.)

- [ ] **Step 3: Commit**

```bash
git add poc-platform/frontend/src/api/dashboards.ts
git commit -m "feat: add colorScheme and x/y fields to ChartConfig for dashboard redesign"
```

---

### Task 3: Create ColorSchemePicker component

**Files:**
- Create: `poc-platform/frontend/src/components/ColorSchemePicker.tsx`

- [ ] **Step 1: Write the component**

Create `poc-platform/frontend/src/components/ColorSchemePicker.tsx`:

```tsx
import { Select, Space } from 'antd';

export const COLOR_SCHEMES: Record<string, { name: string; colors: string[] }> = {
  'default-blue':  { name: '默认蓝', colors: ['#1677FF', '#69B1FF', '#4096FF', '#91CAFF'] },
  'tech-purple':   { name: '科技紫', colors: ['#722ED1', '#D3ADF7', '#9254DE', '#EFDBFF'] },
  'fresh-green':   { name: '清新绿', colors: ['#52C41A', '#B7EB8F', '#73D13D', '#D9F7BE'] },
  'warm-orange':   { name: '暖橙',   colors: ['#FA8C16', '#FFD591', '#FFA940', '#FFE7BA'] },
  'dark-theme':    { name: '深色系', colors: ['#141414', '#434343', '#595959', '#8C8C8C'] },
  'macaron':       { name: '马卡龙', colors: ['#FFB3BA', '#BAFFC9', '#BAE1FF', '#FFFFBA'] },
  'coast':         { name: '海岸',   colors: ['#13C2C2', '#87E8DE', '#36CFC9', '#B5F5EC'] },
  'sunset':        { name: '日落',   colors: ['#F5222D', '#FA8C16', '#FADB14', '#FF9C6E'] },
};

interface Props {
  value?: string;
  onChange?: (value: string) => void;
}

export default function ColorSchemePicker({ value = 'default-blue', onChange }: Props) {
  return (
    <Select
      value={value}
      onChange={onChange}
      style={{ width: 200 }}
      options={Object.entries(COLOR_SCHEMES).map(([key, scheme]) => ({
        value: key,
        label: (
          <Space>
            {scheme.colors.map((c, i) => (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  width: 14,
                  height: 14,
                  borderRadius: 3,
                  backgroundColor: c,
                  border: '1px solid rgba(0,0,0,0.1)',
                }}
              />
            ))}
            <span>{scheme.name}</span>
          </Space>
        ),
      }))}
    />
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd poc-platform/frontend && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add poc-platform/frontend/src/components/ColorSchemePicker.tsx
git commit -m "feat: add ColorSchemePicker with 8 preset palettes"
```

---

### Task 4: Update ChartCard — remove corner markers, add colorScheme, add inline edit

**Files:**
- Modify: `poc-platform/frontend/src/components/ChartCard.tsx`

- [ ] **Step 1: Rewrite ChartCard**

Replace `poc-platform/frontend/src/components/ChartCard.tsx` with the updated version:

```tsx
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
  const chartColors = config.type === 'pie' ? colorScheme.colors : [colorScheme.colors[0]];

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
      color: chartColors,
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
            <Form.Item label="标题" style={{ marginBottom: 0 }}>
              <Input
                size="small"
                value={config.title}
                onChange={(e) => onUpdate?.(config.id, { title: e.target.value })}
                placeholder="图表标题"
              />
            </Form.Item>
            <Form.Item label="类型" style={{ marginBottom: 0 }}>
              <Select
                size="small"
                value={config.type}
                onChange={(v) => onUpdate?.(config.id, { type: v })}
                options={CHART_TYPES}
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item label="X轴维度" style={{ marginBottom: 0 }}>
              <Select
                size="small"
                value={config.x_field}
                onChange={(v) => onUpdate?.(config.id, { x_field: v })}
                options={DIMENSION_FIELDS}
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item label="Y轴指标" style={{ marginBottom: 0 }}>
              <Select
                size="small"
                value={config.y_field}
                onChange={(v) => onUpdate?.(config.id, { y_field: v })}
                options={METRIC_FIELDS}
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item label="配色" style={{ marginBottom: 0 }}>
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd poc-platform/frontend && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add poc-platform/frontend/src/components/ChartCard.tsx
git commit -m "feat: remove corner markers, add colorScheme support and inline edit panel to ChartCard"
```

---

### Task 5: Create CreateDashboardModal

**Files:**
- Create: `poc-platform/frontend/src/components/CreateDashboardModal.tsx`

- [ ] **Step 1: Write the component**

Create `poc-platform/frontend/src/components/CreateDashboardModal.tsx`:

```tsx
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
    { id: generateId(), type: 'column', title: '', x_field: 'region', y_field: 'count', w: 4, h: 3, colorScheme: 'default-blue' },
  ]);
  const [saving, setSaving] = useState(false);

  const addChart = () => {
    setCharts((prev) => [
      ...prev,
      { id: generateId(), type: 'column', title: '', x_field: 'region', y_field: 'count', w: 4, h: 3, colorScheme: 'default-blue' },
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
      // Reset form state
      setName('');
      setIsPublic(false);
      setCharts([
        { id: generateId(), type: 'column', title: '', x_field: 'region', y_field: 'count', w: 4, h: 3, colorScheme: 'default-blue' },
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
      { id: generateId(), type: 'column', title: '', x_field: 'region', y_field: 'count', w: 4, h: 3, colorScheme: 'default-blue' },
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
            <Form.Item label="标题" style={{ marginBottom: 0 }}>
              <Input
                size="small"
                value={chart.title}
                onChange={(e) => updateChart(chart.id, { title: e.target.value })}
                placeholder="图表标题"
              />
            </Form.Item>
            <Form.Item label="类型" style={{ marginBottom: 0 }}>
              <Select
                size="small"
                value={chart.type}
                onChange={(v) => updateChart(chart.id, { type: v })}
                options={CHART_TYPES}
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item label="X轴维度" style={{ marginBottom: 0 }}>
              <Select
                size="small"
                value={chart.x_field}
                onChange={(v) => updateChart(chart.id, { x_field: v })}
                options={DIMENSION_FIELDS}
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item label="Y轴指标" style={{ marginBottom: 0 }}>
              <Select
                size="small"
                value={chart.y_field}
                onChange={(v) => updateChart(chart.id, { y_field: v })}
                options={METRIC_FIELDS}
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item label="配色" style={{ marginBottom: 0 }}>
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd poc-platform/frontend && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add poc-platform/frontend/src/components/CreateDashboardModal.tsx
git commit -m "feat: add CreateDashboardModal for modal-based dashboard creation"
```

---

### Task 6: Create DashboardCanvas page

**Files:**
- Create: `poc-platform/frontend/src/pages/DashboardCanvas.tsx`

- [ ] **Step 1: Write the canvas page**

Create `poc-platform/frontend/src/pages/DashboardCanvas.tsx`:

```tsx
import { useEffect, useState, useRef, useCallback } from 'react';
import { Button, Spin, Empty, Tabs, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import {
  getDashboards,
  updateDashboard,
  deleteDashboard,
  type Dashboard,
  type ChartConfig,
} from '../api/dashboards';
import ChartCard from '../components/ChartCard';
import CreateDashboardModal from '../components/CreateDashboardModal';

const ResponsiveGridLayout = WidthProvider(Responsive);

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

export default function DashboardCanvas() {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingChartId, setEditingChartId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');

  const dashboardsRef = useRef(dashboards);
  dashboardsRef.current = dashboards;

  const fetch = useCallback(() => {
    setLoading(true);
    getDashboards()
      .then((r) => setDashboards(r.data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  // Build flat chart list with dashboard context
  const allCharts: { chart: ChartConfig; dashboard: Dashboard }[] = [];
  for (const db of dashboards) {
    for (const chart of (db.config?.charts || [])) {
      allCharts.push({ chart, dashboard: db });
    }
  }

  // Filter by active tab
  const visibleCharts = activeTab === 'all'
    ? allCharts
    : allCharts.filter((c) => c.dashboard.id === activeTab);

  // Build layout from chart coordinates (rowHeight scaled)
  const layout = visibleCharts.map(({ chart }) => ({
    i: chart.id,
    x: chart.x ?? 0,
    y: chart.y ?? 0,
    w: chart.w || 4,
    h: Math.round((chart.h || 300) / 100),
    minW: 2,
    minH: 2,
  }));

  // Find the dashboard for a chart
  const findDashboard = (chartId: string): Dashboard | undefined => {
    return dashboards.find((db) =>
      (db.config?.charts || []).some((c) => c.id === chartId)
    );
  };

  // Handle layout change — persist to backend
  const handleLayoutChange = useCallback(
    (newLayout: { i: string; x: number; y: number; w: number; h: number }[]) => {
      const current = dashboardsRef.current;
      // Map layout changes back to the correct dashboard's charts
      const dbUpdates = new Map<string, ChartConfig[]>();

      for (const item of newLayout) {
        const db = current.find((d) =>
          (d.config?.charts || []).some((c) => c.id === item.i)
        );
        if (!db) continue;

        const charts = dbUpdates.get(db.id) || [...(db.config?.charts || [])];
        const idx = charts.findIndex((c) => c.id === item.i);
        if (idx >= 0) {
          charts[idx] = { ...charts[idx], x: item.x, y: item.y, w: item.w, h: item.h * 100 };
        }
        dbUpdates.set(db.id, charts);
      }

      // Optimistic state update
      setDashboards((prev) =>
        prev.map((db) => {
          const updatedCharts = dbUpdates.get(db.id);
          if (updatedCharts) {
            return { ...db, config: { ...db.config, charts: updatedCharts } };
          }
          return db;
        })
      );

      // Persist each updated dashboard
      for (const [dbId, charts] of dbUpdates) {
        const db = current.find((d) => d.id === dbId);
        if (!db) continue;
        updateDashboard(dbId, {
          config: { ...(db.config || { filters: [] }), charts },
        }).catch(() => {
          // Revert on failure
          fetch();
          message.error('保存布局失败');
        });
      }
    },
    [fetch]
  );

  // Handle chart inline update
  const handleChartUpdate = (chartId: string, updates: Partial<ChartConfig>) => {
    const db = findDashboard(chartId);
    if (!db) return;

    const newCharts = (db.config?.charts || []).map((c) =>
      c.id === chartId ? { ...c, ...updates } : c
    );

    setDashboards((prev) =>
      prev.map((d) =>
        d.id === db.id ? { ...d, config: { ...d.config, charts: newCharts } } : d
      )
    );

    updateDashboard(db.id, { config: { ...db.config, charts: newCharts } }).catch(() => {
      fetch();
      message.error('更新失败');
    });
  };

  // Handle chart delete
  const handleDeleteChart = async (chartId: string) => {
    const db = findDashboard(chartId);
    if (!db) return;

    const newCharts = (db.config?.charts || []).filter((c) => c.id !== chartId);

    if (newCharts.length === 0) {
      // Delete whole dashboard if last chart
      setDashboards((prev) => prev.filter((d) => d.id !== db.id));
      try {
        await deleteDashboard(db.id);
        message.success('仪表盘已删除');
      } catch {
        message.error('删除失败');
        fetch();
      }
      return;
    }

    setDashboards((prev) =>
      prev.map((d) =>
        d.id === db.id ? { ...d, config: { ...d.config, charts: newCharts } } : d
      )
    );

    try {
      await updateDashboard(db.id, { config: { ...db.config, charts: newCharts } });
      message.success('图表已删除');
    } catch {
      message.error('删除失败');
      fetch();
    }
  };

  // Build tab items
  const tabItems = [
    {
      key: 'all',
      label: '全部',
    },
    ...dashboards
      .filter((d) => (d.config?.charts || []).length > 0)
      .map((d) => ({
        key: d.id,
        label: d.name,
      })),
  ];

  if (loading) return <Spin style={{ display: 'block', margin: '100px auto' }} />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          style={{ flex: 1 }}
          tabBarExtraContent={
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
              新建仪表盘
            </Button>
          }
        />
      </div>

      {visibleCharts.length === 0 ? (
        <Empty description="暂无仪表盘">
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            新建仪表盘
          </Button>
        </Empty>
      ) : (
        <ResponsiveGridLayout
          className="layout"
          layouts={{ lg: layout }}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4 }}
          rowHeight={100}
          margin={[16, 16]}
          compactType="vertical"
          isResizable
          isDraggable
          draggableHandle=".ant-card-head"
          onLayoutChange={(l) => handleLayoutChange(l)}
        >
          {visibleCharts.map(({ chart, dashboard }) => (
            <div key={chart.id} style={{ position: 'relative' }}>
              <ChartCard
                config={chart}
                dashboardId={dashboard.id}
                isEditing={editingChartId === chart.id}
                onEditStart={(id) => setEditingChartId(id)}
                onEditEnd={() => setEditingChartId(null)}
                onDelete={handleDeleteChart}
                onUpdate={handleChartUpdate}
              />
            </div>
          ))}
        </ResponsiveGridLayout>
      )}

      <CreateDashboardModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={fetch}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd poc-platform/frontend && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add poc-platform/frontend/src/pages/DashboardCanvas.tsx
git commit -m "feat: add DashboardCanvas with react-grid-layout drag/resize and tab filtering"
```

---

### Task 7: Update App.tsx routes

**Files:**
- Modify: `poc-platform/frontend/src/App.tsx`

- [ ] **Step 1: Replace routes**

Read `poc-platform/frontend/src/App.tsx`. Replace the import and route sections:

Remove these imports:
```tsx
import DashboardList from './pages/DashboardList';
import DashboardView from './pages/DashboardView';
import DashboardBuilder from './pages/DashboardBuilder';
```

Add this import:
```tsx
import DashboardCanvas from './pages/DashboardCanvas';
```

Remove these routes:
```tsx
<Route path="dashboards" element={<DashboardList />} />
<Route path="dashboards/new" element={<DashboardBuilder />} />
<Route path="dashboards/:id" element={<DashboardView />} />
```

Add this single route:
```tsx
<Route path="dashboards" element={<DashboardCanvas />} />
```

The final App.tsx should look like:

```tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import ProjectList from './pages/ProjectList';
import ProjectForm from './pages/ProjectForm';
import ProjectDetail from './pages/ProjectDetail';
import DashboardCanvas from './pages/DashboardCanvas';
import Settings from './pages/Settings';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spin style={{ display: 'block', margin: '200px auto' }} />;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <Spin style={{ display: 'block', margin: '200px auto' }} />;
  if (!user) return <Navigate to="/login" />;
  if (!isAdmin) return <Navigate to="/" />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/projects" />} />
        <Route path="projects" element={<ProjectList />} />
        <Route path="projects/new" element={<ProjectForm />} />
        <Route path="projects/:id/edit" element={<ProjectForm />} />
        <Route path="projects/:id" element={<ProjectDetail />} />
        <Route path="dashboards" element={<DashboardCanvas />} />
        <Route
          path="settings"
          element={
            <AdminRoute>
              <Settings />
            </AdminRoute>
          }
        />
      </Route>
    </Routes>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd poc-platform/frontend && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add poc-platform/frontend/src/App.tsx
git commit -m "refactor: consolidate dashboard routes into single DashboardCanvas"
```

---

### Task 8: Delete old dashboard pages

**Files:**
- Delete: `poc-platform/frontend/src/pages/DashboardList.tsx`
- Delete: `poc-platform/frontend/src/pages/DashboardView.tsx`
- Delete: `poc-platform/frontend/src/pages/DashboardBuilder.tsx`

- [ ] **Step 1: Delete files**

```bash
rm poc-platform/frontend/src/pages/DashboardList.tsx
rm poc-platform/frontend/src/pages/DashboardView.tsx
rm poc-platform/frontend/src/pages/DashboardBuilder.tsx
```

- [ ] **Step 2: Verify TypeScript still compiles**

```bash
cd poc-platform/frontend && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add poc-platform/frontend/src/pages/DashboardList.tsx poc-platform/frontend/src/pages/DashboardView.tsx poc-platform/frontend/src/pages/DashboardBuilder.tsx
git commit -m "refactor: remove old DashboardList, DashboardView, DashboardBuilder pages"
```

---

### Task 9: Final verification

**Files:** None (verify only)

- [ ] **Step 1: Check import hygiene**

```bash
grep -r "DashboardList\|DashboardView\|DashboardBuilder" poc-platform/frontend/src --include="*.tsx" --include="*.ts"
```
Expected: No matches (all references removed).

- [ ] **Step 2: TypeScript check**

```bash
cd poc-platform/frontend && npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 3: Start dev server**

```bash
cd poc-platform/frontend && npm run dev
```

Open browser to dashboard page and verify:
- [ ] Dragging charts works
- [ ] Resizing charts works (transparent handles, no colored corners)
- [ ] Color scheme picker appears in modal and inline edit
- [ ] Charts render with selected colors
- [ ] Create modal opens, creates dashboard, charts appear on canvas
- [ ] Tab filtering switches between groups
- [ ] Inline edit panel expands/collapses
- [ ] Delete chart removes from canvas

- [ ] **Step 4: Commit any final fixes**

If fixes needed, commit them separately.
```

---

## Self-Review

**1. Spec coverage check:**
- [x] Remove corner color markers (Task 4 — ChartCard rewrite removes corner divs)
- [x] Color scheme combinations (Task 3 — ColorSchemePicker, Task 4 — applies colors to charts)
- [x] Free drag positioning + auto-reflow (Task 6 — react-grid-layout with compactType 'vertical')
- [x] Modal-based creation → direct canvas (Task 5 — CreateDashboardModal, Task 6 — onCreated refreshes canvas)

**2. Placeholder scan:** No TBD, TODO, "implement later", vague references.

**3. Type consistency check:**
- `ChartConfig` has `colorScheme`, `x`, `y` — consistent across DashboardCanvas, ChartCard, CreateDashboardModal
- `COLOR_SCHEMES` from ColorSchemePicker imported in ChartCard, CreateDashboardModal
- `generateId()` defined identically in CreateDashboardModal and DashboardCanvas
- Props interfaces match across components

**No gaps found. Plan is complete.**
