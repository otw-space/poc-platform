# Dashboard UX Redesign Spec

## Overview

四合一优化：消除角标 → 配色系统 → 自由拖放布局 → 扁平化创建流程。将 DashboardList / DashboardBuilder / DashboardView 三个页面合并为一个 `DashboardCanvas` 统一画布。

## 1. Remove Corner Color Markers

- `ChartCard` 四角 resize handle 的灰色渐变三角标记 (`linear-gradient(135deg, transparent 50%, #d9d9d9 50%)`) 全部移除
- 保留四角 + 四边拖拽缩放能力，改用透明热区 (16px × 16px)
- hover 时显示细边框/手柄提示（opacity 0→1 过渡），视觉上不突兀
- 移除 `CORNER_CURSORS` 颜色逻辑，cursor 样式保留

## 2. Color Scheme System

### Presets (8 套)

| id | 名称 | 色盘 |
|----|------|------|
| `default-blue` | 默认蓝 | `#1677FF #69B1FF #4096FF #91CAFF` |
| `tech-purple` | 科技紫 | `#722ED1 #D3ADF7 #9254DE #EFDBFF` |
| `fresh-green` | 清新绿 | `#52C41A #B7EB8F #73D13D #D9F7BE` |
| `warm-orange` | 暖橙 | `#FA8C16 #FFD591 #FFA940 #FFE7BA` |
| `dark-theme` | 深色系 | `#141414 #434343 #595959 #8C8C8C` |
| `macaron` | 马卡龙 | `#FFB3BA #BAFFC9 #BAE1FF #FFFFBA` |
| `coast` | 海岸 | `#13C2C2 #87E8DE #36CFC9 #B5F5EC` |
| `sunset` | 日落 | `#F5222D #FA8C16 #FADB14 #FF9C6E` |

### Rules

- 饼图自动使用多色盘（macaron / sunset），柱状/折线/条形用渐变色盘
- `ChartConfig` 新增 `colorScheme` 字段，默认 `'default-blue'`
- 配色选择器位于行内编辑面板，Select 下拉 + 色块预览

## 3. React-Grid-Layout Free Drag Canvas

### Setup

```
npm install react-grid-layout
```

### Grid Parameters

| 参数 | 值 |
|------|-----|
| 列数 (`cols`) | 12 |
| 行高 (`rowHeight`) | 100px |
| 间隔 (`margin`) | [16, 16] |
| 默认尺寸 | `{ w: 4, h: 3 }` (~400px × 300px) |
| 最小尺寸 | `{ w: 2, h: 2 }` (~200px × 200px) |
| 断点 | `lg: 1200, md: 996, sm: 768, xs: 480` |
| 响应式列数 | `lg: 12, md: 10, sm: 6, xs: 4` |

### Drag & Resize

- 拖动手柄：图表标题栏（`.drag-handle` class）
- 缩放手柄：四角透明热区，hover 显示边框提示
- 碰撞检测：react-grid-layout 内置 `compactType: 'vertical'`
- 布局吸附到 12 列网格，放不下时自动下移
- `onLayoutChange` 触发 debounced PATCH 持久化

### Layout Persistence

- 后端 `DashboardConfig` 新增 `layout: LayoutItem[]` 字段
- `onLayoutChange` debounce 1s → `PATCH /dashboards/:id { config: { ...config, layout } }`
- 首次加载从后端 `config.layout` 恢复；无保存坐标时使用默认自动流排布

## 4. Flattened Creation Flow

### Navigation

**Before:** `/dashboards` → `/dashboards/new` → `/dashboards/:id` (3 层跳转)
**After:** `/dashboards` 单一页面，所有操作在此完成

### Component Architecture

```
DashboardCanvas
├── GroupTabs — 顶部标签栏
│   ├── Tab: "全部" + 各仪表盘名称
│   └── + 按钮 → CreateDashboardModal
├── GridLayout — react-grid-layout 画布
│   └── ChartCard[] — 每个图表一个可拖放卡片
│       ├── Chart (根据 type + colorScheme 渲染)
│       ├── Resize handles (透明热区)
│       └── DropdownMenu: 编辑 | 刷新 | 删除
└── CreateDashboardModal — 新建仪表盘弹窗
```

### CreateDashboardModal

- 点击标签栏 "+" → 弹出 Ant Design Modal (600px 宽)
- 表单项：
  - 仪表盘名称 (Input)
  - 初始图表配置（默认携带 1 个）：
    - 图表标题 (Input)
    - 图表类型 (Select: 柱状图/条形图/饼图/折线图/组合图)
    - X 轴维度 (Select)
    - Y 轴指标 (Select)
    - 配色方案 (Select + 色块预览)
  - "+ 添加图表" 按钮追加图表
  - 公开开关 (Switch)
- 提交：POST /dashboards → 画布上出现新图表 → 新增标签 → 关闭模态框
- 取消：关闭模态框，不产生任何变更

### Inline Edit (行内编辑)

- 图表菜单 → "编辑" → ChartCard 下方展开编辑面板（非模态框）
- 编辑面板字段：标题、类型、X/Y 维度、配色 — 与创建时相同
- 修改通过 debounced PATCH 实时保存
- 点击"完成"或面板外失焦 → 收起面板

## 5. Data Model Changes

### ChartConfig (additions)

```ts
export interface ChartConfig {
  id: string;
  type: string;
  title: string;
  x_field: string;
  y_field: string;
  group_field?: string | null;
  colorScheme?: string;      // NEW: 'default-blue' | 'tech-purple' | ...
  w: number;
  h: number;
}
```

### DashboardConfig (additions)

```ts
export interface DashboardConfig {
  filters: { field: string; op: string; value: any }[];
  charts: ChartConfig[];
  layout?: LayoutItem[];      // NEW: react-grid-layout layout items
}

interface LayoutItem {
  i: string;   // chartId
  x: number;
  y: number;
  w: number;
  h: number;
}
```

## 6. Files to Change

| File | Action |
|------|--------|
| `package.json` | Add `react-grid-layout` |
| `App.tsx` | Remove `/dashboards/new` and `/dashboards/:id` routes, keep only `/dashboards` |
| `pages/DashboardCanvas.tsx` | **New** — unified canvas page (merge DashboardList + DashboardView + DashboardBuilder) |
| `components/ChartCard.tsx` | Remove corner color markers, add colorScheme support, add inline edit panel |
| `components/ColorSchemePicker.tsx` | **New** — color scheme selector with swatch preview |
| `components/CreateDashboardModal.tsx` | **New** — modal for creating dashboards |
| `api/dashboards.ts` | Update ChartConfig type with `colorScheme`, DashboardConfig with `layout` |
| `pages/DashboardList.tsx` | **Delete** — merged into DashboardCanvas |
| `pages/DashboardView.tsx` | **Delete** — merged into DashboardCanvas |
| `pages/DashboardBuilder.tsx` | **Delete** — replaced by CreateDashboardModal + inline edit |
| `components/Layout.tsx` | Update navigation links if needed |
