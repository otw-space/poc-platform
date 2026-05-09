# PoC 项目管理平台 — 设计文档

> 日期：2026-05-09 | 状态：已确认

## 1. 概述

构建一个 Web 平台，用于管理 PoC（Proof of Concept）项目的全生命周期信息，并提供自定义仪表盘功能进行数据可视化分析。支持多用户协作，区分管理员与普通用户角色。

## 2. 技术选型

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端框架 | React 18 + TypeScript | SPA 单页应用 |
| UI 组件库 | Ant Design 5 | 表格、表单、图表组件丰富 |
| 图表库 | Ant Design Charts (@ant-design/charts) | 基于 G2Plot，支持柱状图/饼图/条形图/折线图/组合图 |
| 状态管理 | React Context + useReducer | 轻量级，够用 |
| 路由 | React Router v6 | 前端路由 |
| 后端框架 | FastAPI (Python 3.11+) | 异步 REST API |
| ORM | SQLAlchemy 2.0 + Alembic | 数据库迁移 |
| 数据库 | SQLite（默认）/ PostgreSQL（可选） | 通过环境变量切换 |
| 鉴权 | JWT (python-jose) + bcrypt | Token 认证 |
| 节假日计算 | chinese-holidays | 中国法定节假日 |
| 部署 | Uvicorn 一体化服务 | 同时服务 API 和静态文件 |

## 3. 数据模型

### 3.1 用户表 (users)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | 主键 |
| username | String(50) | UNIQUE, NOT NULL | 登录用户名 |
| password_hash | String(128) | NOT NULL | bcrypt 哈希 |
| display_name | String(50) | NOT NULL | 显示名称 |
| role | Enum('admin', 'user') | NOT NULL, DEFAULT 'user' | 角色 |
| is_active | Boolean | DEFAULT True | 是否启用 |
| created_at | DateTime | DEFAULT now | 创建时间 |

### 3.2 选项字典表 (poc_options)

统一的选项字典，管理所有下拉选项。通过 category 区分不同类型。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | Integer | PK, AUTOINCREMENT | 主键 |
| category | Enum('poc_type', 'impl_method', 'status') | NOT NULL | 选项类别 |
| label | String(50) | NOT NULL | 显示名称 |
| is_default | Boolean | DEFAULT False | 系统默认（不可删除） |
| sort_order | Integer | DEFAULT 0 | 排序 |
| created_at | DateTime | DEFAULT now | 创建时间 |

**默认数据：**
- poc_type: 实施型, 试用型
- impl_method: SaaS, 本地化部署, 便携设备
- status: 未开始, 准备中, 进行中, 已完成, 搁置

### 3.3 PoC 项目表 (poc_projects)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | 主键 |
| name | String(200) | NOT NULL | 项目名称 |
| region | String(100) | NOT NULL | 区域 |
| city | String(100) | NOT NULL | 城市 |
| sales | String(50) | NOT NULL | 销售负责人 |
| pm | String(50) | NOT NULL | 项目经理 |
| start_date | Date | NOT NULL | 开始日期 |
| end_date | Date | NOT NULL | 完成日期 |
| duration_days | Integer | 自动计算 | 工期（工作日天数） |
| poc_type_id | Integer | FK → poc_options.id | PoC类型 |
| impl_method_id | Integer | FK → poc_options.id | 实施方式 |
| status_id | Integer | FK → poc_options.id | 状态 |
| result | Text | NULLABLE | PoC结果描述 |
| created_by | UUID | FK → users.id | 创建者 |
| created_at | DateTime | DEFAULT now | 创建时间 |
| updated_at | DateTime | ON UPDATE now | 更新时间 |

### 3.4 仪表盘表 (dashboards)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | 主键 |
| name | String(200) | NOT NULL | 仪表盘名称 |
| user_id | UUID | FK → users.id | 所属用户 |
| config | JSON | NOT NULL | 仪表盘配置（图表、筛选、布局） |
| is_public | Boolean | DEFAULT False | 是否公开给其他用户 |
| created_at | DateTime | DEFAULT now | 创建时间 |
| updated_at | DateTime | ON UPDATE now | 更新时间 |

**仪表盘 config JSON 结构：**
```json
{
  "filters": [
    {"field": "region", "op": "eq", "value": "华东"},
    {"field": "status", "op": "in", "value": ["进行中", "已完成"]},
    {"field": "start_date", "op": "gte", "value": "2026-01-01"}
  ],
  "charts": [
    {
      "id": "uuid",
      "type": "bar|pie|line|column|dual-axes",
      "title": "图表标题",
      "x_field": "city",
      "y_field": "count",
      "group_field": null,
      "w": 12,
      "h": 400
    }
  ]
}
```

支持的筛选操作符：eq (等于), neq (不等于), in (包含于), gte (大于等于), lte (小于等于), like (模糊匹配)。

支持的指标函数：count (计数), avg_duration (平均工期)。

## 4. 系统架构

### 4.1 部署架构

```
┌─────────────────────────────────┐
│      Uvicorn :8000              │
│  ┌───────────────────────────┐  │
│  │  FastAPI Application      │  │
│  │  /api/*  → REST API 路由   │  │
│  │  /*      → React SPA 静态  │  │
│  └───────────────────────────┘  │
│              │                   │
│  ┌───────────────────────────┐  │
│  │  SQLite / PostgreSQL      │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### 4.2 前端路由

| 路径 | 页面 | 权限 |
|------|------|------|
| /login | 登录页 | 公开 |
| /projects | 项目列表（表格+筛选） | 登录用户 |
| /projects/new | 新建项目 | 登录用户 |
| /projects/:id/edit | 编辑项目 | 登录用户 |
| /projects/:id | 项目详情 | 登录用户 |
| /dashboards | 仪表盘列表 | 登录用户 |
| /dashboards/:id | 查看仪表盘 | 登录用户 |
| /dashboards/new | 构建新仪表盘 | 登录用户 |
| /settings | 系统设置（选项+用户管理） | admin |

### 4.3 后端 API 模块

| 模块 | 路由前缀 | 主要端点 |
|------|---------|---------|
| auth | /api/auth | POST /login, GET /me |
| projects | /api/projects | CRUD, GET /stats (聚合数据) |
| options | /api/options | GET /{category}, POST, PUT, DELETE |
| dashboards | /api/dashboards | CRUD, POST /{id}/data (执行查询) |
| users | /api/users | CRUD (admin only) |

### 4.4 工期计算

在项目创建/更新时自动计算 duration_days：
1. 获取 start_date 到 end_date 之间的所有日期
2. 排除周六和周日
3. 排除中国法定节假日（通过 chinese-holidays 库，内置国务院发布的节假日安排）
4. 返回剩余工作日天数

计算在后端 `POST/PUT /api/projects` 中自动触发，前端展示为只读。

### 4.5 权限模型

| 操作 | admin | user |
|------|-------|------|
| 管理自己的项目 | ✓ | ✓ |
| 查看公开仪表盘 | ✓ | ✓ |
| 管理自己的仪表盘 | ✓ | ✓ |
| 管理系统选项 | ✓ | ✗ |
| 管理用户 | ✓ | ✗ |
| 查看所有项目 | ✓ | ✗ |

## 5. 前端页面设计

### 5.1 项目列表页

- 顶部筛选栏：项目名称（模糊搜索）、区域、城市、状态、PoC类型、销售
- 数据表格：展示所有字段，状态/类型以标签展示，工期列显示 X天
- 分页：支持每页 10/20/50 条
- 操作列：查看、编辑、删除（删除需确认）
- 右上角"新建项目"按钮

### 5.2 项目表单（新建/编辑）

- 所有字段均为必填（除 PoC 结果）
- 日期使用 DatePicker 组件，格式 YYYY-MM-DD
- 工期字段只读，提交时由后端计算返回
- 下拉选项从后端动态加载
- 表单验证：开始日期不能晚于完成日期

### 5.3 项目详情页

- 信息以描述列表形式展示
- 状态使用彩色标签
- 底部显示 PoC 结果完整文本
- 提供编辑/删除按钮

### 5.4 仪表盘构建器

构建流程：1) 设置全局筛选条件 → 2) 添加图表卡片 → 3) 配置每个图表的类型和维度 → 4) 保存

- 筛选条件：支持多条件 AND 组合
- 图表类型选择：柱状图、条形图、饼图、折线图、组合图
- 维度配置：X 轴字段（分类维度）、Y 轴指标（count/avg_duration）
- 布局：响应式网格，图表卡片可调整宽度（3/6/12 栅格）
- 实时预览：配置即时渲染图表
- 保存为个人视图，可选择设为公开

### 5.5 仪表盘查看页

- 响应式网格布局渲染所有图表卡片
- 顶部显示仪表盘名称和筛选条件摘要
- 支持切换查看模式（仅查看 / 编辑模式）

### 5.6 系统设置页

- Tab 切换：PoC类型 | 实施方式 | 状态
- 每类选项表格：名称、是否默认、排序、操作
- 系统默认项不可删除，行内显示 lock 标识
- 支持行内新增、编辑、删除（自定义项）

### 5.7 用户管理（admin only）

- 用户表格：用户名、显示名、角色、状态
- 新建用户弹窗：用户名、显示名、密码、角色
- 支持重置密码、启用/禁用用户
- 不能删除自己

## 6. 项目目录结构

```
poc-platform/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI 入口
│   │   ├── config.py            # 配置管理
│   │   ├── database.py          # 数据库连接
│   │   ├── models/              # SQLAlchemy 模型
│   │   │   ├── user.py
│   │   │   ├── poc_option.py
│   │   │   ├── poc_project.py
│   │   │   └── dashboard.py
│   │   ├── schemas/             # Pydantic 模型
│   │   │   ├── user.py
│   │   │   ├── poc_option.py
│   │   │   ├── poc_project.py
│   │   │   └── dashboard.py
│   │   ├── routers/             # API 路由
│   │   │   ├── auth.py
│   │   │   ├── projects.py
│   │   │   ├── options.py
│   │   │   ├── dashboards.py
│   │   │   └── users.py
│   │   ├── services/            # 业务逻辑
│   │   │   ├── auth.py
│   │   │   ├── project.py
│   │   │   ├── dashboard.py
│   │   │   └── holiday.py       # 节假日/工期计算
│   │   └── middleware/
│   │       └── auth.py          # JWT 中间件
│   ├── alembic/                 # 数据库迁移
│   ├── requirements.txt
│   └── seed.py                  # 初始数据填充
├── frontend/
│   ├── src/
│   │   ├── api/                 # API 请求层
│   │   ├── components/          # 通用组件
│   │   │   ├── Layout.tsx
│   │   │   ├── FilterBar.tsx
│   │   │   └── ChartCard.tsx
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── ProjectList.tsx
│   │   │   ├── ProjectForm.tsx
│   │   │   ├── ProjectDetail.tsx
│   │   │   ├── DashboardList.tsx
│   │   │   ├── DashboardView.tsx
│   │   │   ├── DashboardBuilder.tsx
│   │   │   └── Settings.tsx
│   │   ├── context/             # 全局状态
│   │   ├── hooks/               # 自定义 hooks
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## 7. 启动与部署

### 开发模式
```bash
# 后端
cd backend && uvicorn app.main:app --reload --port 8000

# 前端
cd frontend && npm run dev
```

### 生产部署
```bash
# 构建前端
cd frontend && npm run build

# 一体化启动
cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000
# FastAPI 将 / 指向 frontend/dist/ 下的静态文件
```
