import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Input, Select, Space, Tag, Popconfirm, message, Card, DatePicker, Popover, Dropdown, Spin, Modal } from 'antd';
import { PlusOutlined, SearchOutlined, DownloadOutlined, AppstoreOutlined, UnorderedListOutlined, TableOutlined, CalendarOutlined, MoreOutlined } from '@ant-design/icons';
import { Resizable } from 'react-resizable';
import 'react-resizable/css/styles.css';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import { useTheme } from '../context/ThemeContext';
import { useProjectData } from '../hooks/useProjectData';
import { deleteProject, updateProject, type PocProject } from '../api/projects';
import { type PocOption } from '../api/options';
import ProjectDrawer from '../components/ProjectDrawer';
import ProjectKanbanView from '../components/views/ProjectKanbanView';
import ProjectGalleryView from '../components/views/ProjectGalleryView';
import ProjectCalendarView from '../components/views/ProjectCalendarView';
import ProjectToolbar, { type ToolbarState } from '../components/views/ProjectToolbar';

function generateXLSX(projects: PocProject[], typeOptions: PocOption[], implOptions: PocOption[], statusOptions: PocOption[]): Blob {
  const getLabel = (opts: PocOption[], id: number) => opts.find(o => o.id === id)?.label || '';
  const headers = ['项目名称', '区域', '城市', '销售', '项目经理', '开始日期', '完成日期', '工期', 'PoC类型', '实施方式', '状态'];
  const rows = projects.map(p => [
    p.name, p.region, p.city, p.sales, p.pm,
    p.start_date, p.end_date,
    p.duration_days ? `${p.duration_days}天` : '',
    getLabel(typeOptions, p.poc_type_id),
    getLabel(implOptions, p.impl_method_id),
    getLabel(statusOptions, p.status_id),
  ]);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = headers.map((_, i) => ({ wch: i === 0 ? 25 : i >= 4 && i <= 7 ? 12 : 10 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '项目列表');
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

const STATUS_COLORS: Record<string, string> = {
  '未开始': 'default',
  '准备中': 'blue',
  '进行中': 'processing',
  '已完成': 'success',
  '搁置': 'warning',
};

const LS_KEY = 'project_table_widths';

const DEFAULT_WIDTHS: Record<string, number> = {
  name: 220,
  region: 80,
  city: 80,
  sales: 80,
  pm: 80,
  start_date: 100,
  end_date: 100,
  duration_days: 70,
  poc_type_id: 90,
  impl_method_id: 90,
  status_id: 90,
  actions: 160,
};

function loadWidths(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch { return {}; }
}

function saveWidths(widths: Record<string, number>) {
  localStorage.setItem(LS_KEY, JSON.stringify(widths));
}

function ResizableTitle(props: any) {
  const { onResize, width, ...rest } = props;
  if (!width) return <th {...rest} />;
  return (
    <Resizable width={width} height={0} onResize={onResize} draggableOpts={{ enableUserSelectHack: false }}>
      <th {...rest} style={{ cursor: 'col-resize' }} />
    </Resizable>
  );
}

export default function ProjectList() {
  const {
    projects, total, page, loading, filters,
    setPage, setFilters, fetchProjects,
    statusOptions, typeOptions, implOptions, getOptionLabel,
  } = useProjectData();
  // View management — stored in localStorage
  type ViewConfig = { id: string; name: string; type: 'table' | 'kanban' | 'gallery' | 'calendar'; locked?: boolean };
  const [views, setViews] = useState<ViewConfig[]>(() => {
    try { const saved = JSON.parse(localStorage.getItem('project_views') || 'null'); if (saved?.length) return saved; } catch {}
    return [{ id: 'default', name: '表格视图', type: 'table' }];
  });
  const [activeViewId, setActiveViewId] = useState(views[0].id);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const activeView = views.find(v => v.id === activeViewId) || views[0];

  useEffect(() => { localStorage.setItem('project_views', JSON.stringify(views)); }, [views]);

  const addView = (type: ViewConfig['type']) => {
    const nameMap = { table: '表格', kanban: '看板', gallery: '画廊', calendar: '日历' };
    const newView: ViewConfig = { id: Date.now().toString(), name: `${nameMap[type]}视图 ${views.length + 1}`, type };
    setViews(prev => [...prev, newView]);
    setActiveViewId(newView.id);
  };

  const updateView = (id: string, updates: Partial<ViewConfig>) => {
    setViews(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v));
  };

  const removeView = (id: string) => {
    const v = views.find(vv => vv.id === id);
    if (views.length <= 1 || v?.locked) return;
    setViews(prev => prev.filter(vv => vv.id !== id));
    if (activeViewId === id) setActiveViewId(views[0].id === id ? views[1]?.id || 'default' : views[0].id);
  };
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => ({
    ...DEFAULT_WIDTHS,
    ...loadWidths(),
  }));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { dark } = useTheme();

  // Toolbar state
  const [toolbar, setToolbar] = useState<ToolbarState>({ searchField: 'name', search: '', filters: [], filterMode: 'and', sortBy: '', sortOrder: 'desc', groupBy: [] });
  const updateToolbar = (v: Partial<ToolbarState>) => setToolbar(prev => ({ ...prev, ...v }));

  const fieldVal = (p: any, field: string) => {
    if (field === 'status_id') return getOptionLabel(statusOptions, p.status_id);
    if (field === 'poc_type_id') return getOptionLabel(typeOptions, p.poc_type_id);
    if (field === 'impl_method_id') return getOptionLabel(implOptions, p.impl_method_id);
    return String(p[field as keyof typeof p] || '');
  };

  // Apply client-side filters, sort, search
  const filtered = projects.filter(p => {
    // Search on selected field (fuzzy match)
    if (toolbar.search) {
      const fv = fieldVal(p, toolbar.searchField || 'name').toLowerCase();
      if (!fv.includes(toolbar.search.toLowerCase())) return false;
    }
    // Filters
    if (toolbar.filters.length === 0) return true;
    const rawVal = (pp: any, field: string) => {
      if (field === 'status_id') return String(pp.status_id);
      if (field === 'poc_type_id') return String(pp.poc_type_id);
      if (field === 'impl_method_id') return String(pp.impl_method_id);
      return String(pp[field as keyof typeof pp] || '');
    };
    const results = toolbar.filters.filter(f => f.value).map(f => rawVal(p, f.field) === f.value);
    return toolbar.filterMode === 'and' ? results.every(Boolean) : results.some(Boolean);
  });

  const sorted = [...filtered].sort((a, b) => {
    if (!toolbar.sortBy) return 0;
    const va = fieldVal(a, toolbar.sortBy);
    const vb = fieldVal(b, toolbar.sortBy);
    return toolbar.sortOrder === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
  });

  // Multi-level grouping
  const buildGroups = (items: typeof sorted, level: number): any[] => {
    if (level >= toolbar.groupBy.length) return items;
    const field = toolbar.groupBy[level];
    const map = new Map<string, typeof sorted>();
    items.forEach(p => {
      const key = fieldVal(p, field) || '未分组';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([key, groupItems]) => ({
      key,
      count: groupItems.length,
      items: buildGroups(groupItems, level + 1),
    }));
  };
  const grouped = toolbar.groupBy.length > 0 ? buildGroups(sorted, 0) : null;

  const handleStatusChange = async (projectId: string, statusId: number) => {
    await updateProject(projectId, { status_id: statusId });
    fetchProjects();
  };

  const handleDelete = async (id: string) => {
    await deleteProject(id);
    message.success('删除成功');
    fetchProjects();
  };

  const handleResize = useCallback((key: string) => (_e: any, { size }: any) => {
    const newWidths = { ...columnWidths, [key]: Math.max(60, size.width) };
    setColumnWidths(newWidths);
    saveWidths(newWidths);
  }, [columnWidths]);

  const w = (key: string) => columnWidths[key] || DEFAULT_WIDTHS[key] || 100;

  const resizableCol = (col: any) => ({
    ...col,
    width: w(col.key || col.dataIndex),
    onHeaderCell: (column: any) => ({
      width: column.width,
      onResize: handleResize(col.key || col.dataIndex),
    }),
  });

  const columns = [
    resizableCol({
      title: '项目名称', dataIndex: 'name', key: 'name', ellipsis: true,
      render: (v: string, record: PocProject) => (
        <a onClick={() => { setSelectedProjectId(record.id); setDrawerOpen(true); }}>{v}</a>
      ),
    }),
    resizableCol({ title: '区域', dataIndex: 'region', key: 'region' }),
    resizableCol({ title: '城市', dataIndex: 'city', key: 'city' }),
    resizableCol({ title: '销售', dataIndex: 'sales', key: 'sales' }),
    resizableCol({ title: '项目经理', dataIndex: 'pm', key: 'pm' }),
    resizableCol({ title: '开始', dataIndex: 'start_date', key: 'start_date' }),
    resizableCol({ title: '完成', dataIndex: 'end_date', key: 'end_date' }),
    resizableCol({
      title: '工期', dataIndex: 'duration_days', key: 'duration_days',
      render: (v: number | null) => v ? `${v}天` : '-',
    }),
    resizableCol({
      title: 'PoC类型', dataIndex: 'poc_type_id', key: 'poc_type_id',
      render: (v: number) => <Tag>{getOptionLabel(typeOptions, v)}</Tag>,
    }),
    resizableCol({
      title: '实施方式', dataIndex: 'impl_method_id', key: 'impl_method_id',
      render: (v: number) => <Tag>{getOptionLabel(implOptions, v)}</Tag>,
    }),
    resizableCol({
      title: '状态', dataIndex: 'status_id', key: 'status_id', width: w('status_id'),
      render: (v: number, record: PocProject) => {
        const label = getOptionLabel(statusOptions, v);
        return (
          <Popover
            trigger="click"
            content={
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 80 }}>
                {statusOptions.map(o => (
                  <Button
                    key={o.id}
                    size="small"
                    type={o.id === v ? 'primary' : 'text'}
                    onClick={async () => {
                      try {
                        await updateProject(record.id, { status_id: o.id });
                        message.success(`状态已更新为「${o.label}」`);
                        fetchProjects();
                      } catch { message.error('更新失败'); }
                    }}
                  >
                    {o.label}
                  </Button>
                ))}
              </div>
            }
          >
            <Tag color={STATUS_COLORS[label] || 'default'} style={{ cursor: 'pointer' }}>{label}</Tag>
          </Popover>
        );
      },
    }),
    {
      title: '操作', key: 'actions', width: w('actions'),
      render: (_: any, record: PocProject) => (
        <Space>
          <a onClick={() => { setSelectedProjectId(record.id); setDrawerOpen(true); }}>查看</a>
          <a onClick={() => navigate(`/projects/${record.id}/edit`)}>编辑</a>
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)}>
            <a style={{ color: '#ff4d4f' }}>删除</a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const exportXLSX = () => {
    const blob = generateXLSX(projects, typeOptions, implOptions, statusOptions);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `项目列表_${dayjs().format('YYYY-MM-DD')}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('导出成功');
  };

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflow: 'auto', flex: 1 }}>
          {views.map(v => {
            const icons: Record<string, React.ReactNode> = { table: <TableOutlined />, kanban: <AppstoreOutlined />, gallery: <UnorderedListOutlined />, calendar: <CalendarOutlined /> };
            return (
              <div key={v.id} style={{ display: 'flex', alignItems: 'center', border: activeViewId === v.id ? '2px solid #1677ff' : '2px solid transparent', borderRadius: 6, padding: '2px 2px 2px 10px', cursor: 'pointer', background: activeViewId === v.id ? (dark ? '#1a3a5c' : '#e6f4ff') : 'transparent', color: dark ? '#e8e8e8' : undefined }}
                onClick={() => setActiveViewId(v.id)}>
                <span style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{icons[v.type]} {v.name}{v.locked ? ' 🔒' : ''}</span>
                <Dropdown trigger={['click']} menu={{ items: [
                  { key: 'rename', label: '重命名', onClick: () => { setRenameId(v.id); setRenameValue(v.name); } },
                  { key: 'lock', label: v.locked ? '解锁' : '锁定', icon: v.locked ? <></> : <></>, onClick: () => updateView(v.id, { locked: !v.locked }) },
                  { type: 'divider' },
                  { key: 'delete', label: '删除', danger: true, disabled: v.locked, onClick: () => removeView(v.id) },
                ] }}>
                  <Button size="small" type="text" icon={<MoreOutlined />} style={{ minWidth: 24, padding: 0, color: '#999' }}
                    onClick={e => e.stopPropagation()} />
                </Dropdown>
              </div>
            );
          })}
          <Dropdown menu={{ items: [
            { key: 'table', icon: <TableOutlined />, label: '表格视图', onClick: () => addView('table') },
            { key: 'kanban', icon: <AppstoreOutlined />, label: '看板视图', onClick: () => addView('kanban') },
            { key: 'gallery', icon: <UnorderedListOutlined />, label: '画廊视图', onClick: () => addView('gallery') },
            { key: 'calendar', icon: <CalendarOutlined />, label: '日历视图', onClick: () => addView('calendar') },
          ] }}>
            <Button size="small" type="text" icon={<PlusOutlined />} style={{ fontSize: 16, marginLeft: 4 }} />
          </Dropdown>
        </div>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/projects/new')}>新建项目</Button>
          <Button icon={<DownloadOutlined />} onClick={exportXLSX}>导出 Excel</Button>
        </Space>
      </div>

      {(activeView.type !== 'table') && (
        <div style={{ marginBottom: 12 }}>{/* spacers are fine */}</div>
      )}

      {activeView.type === 'table' && (
        <div>
          <ProjectToolbar value={toolbar} onChange={updateToolbar} statusOptions={statusOptions} typeOptions={typeOptions} />
          {grouped ? (
            grouped.map((g: any) => {
              const isLeaf = !Array.isArray(g.items[0]?.items);
              return (
                <div key={g.key} style={{ marginBottom: 16 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, padding: '8px 12px', background: dark ? '#1f1f1f' : '#f5f5f5', borderRadius: '6px 6px 0 0', borderBottom: '2px solid #1677ff' }}>
                    {g.key} <span style={{ color: '#999', fontWeight: 400, fontSize: 12 }}>({g.count} 个项目)</span>
                  </div>
                  {isLeaf ? (
                    <Table rowKey="id" columns={columns} dataSource={g.items} loading={loading}
                      scroll={{ x: 'max-content' }} pagination={false} size="small" showHeader={true} />
                  ) : (
                    g.items.map((sg: any) => (
                      <div key={sg.key} style={{ marginTop: 8 }}>
                        <div style={{ fontWeight: 500, fontSize: 13, padding: '6px 12px', background: dark ? '#252525' : '#fafafa', borderLeft: '3px solid #1677ff' }}>
                          {sg.key} <span style={{ color: '#999', fontWeight: 400, fontSize: 11 }}>({sg.count} 个项目)</span>
                        </div>
                        <Table rowKey="id" columns={columns} dataSource={sg.items} loading={loading}
                          scroll={{ x: 'max-content' }} pagination={false} size="small" showHeader={false} />
                      </div>
                    ))
                  )}
                </div>
              );
            })
          ) : (
            <Table
              rowKey="id" columns={columns} dataSource={sorted} loading={loading}
              scroll={{ x: 'max-content' }} components={{ header: { cell: ResizableTitle } }}
              pagination={{ current: page, total, pageSize: 20, showTotal: t => `共 ${t} 条`, showSizeChanger: false, onChange: setPage }}
            />
          )}
        </div>
      )}

      {activeView.type === 'kanban' && (
        <div>
          <ProjectToolbar value={toolbar} onChange={updateToolbar} statusOptions={statusOptions} typeOptions={typeOptions} showGroup={false} />
          <ProjectKanbanView projects={sorted} statusOptions={statusOptions} typeOptions={typeOptions} implOptions={implOptions}
            loading={loading} groupBy={toolbar.groupBy[0] || 'status_id'}
            groupOptions={[]} onGroupByChange={v => updateToolbar({ groupBy: [v] })} onStatusChange={handleStatusChange} />
        </div>
      )}

      {activeView.type === 'gallery' && (
        <div>
          <ProjectToolbar value={toolbar} onChange={updateToolbar} statusOptions={statusOptions} typeOptions={typeOptions} showGroup={false} />
          <ProjectGalleryView projects={sorted} statusOptions={statusOptions} typeOptions={typeOptions}
            implOptions={implOptions} loading={loading} onSelect={id => { setSelectedProjectId(id); setDrawerOpen(true); }} />
        </div>
      )}

      {activeView.type === 'calendar' && (
        <div>
          <ProjectToolbar value={toolbar} onChange={updateToolbar} statusOptions={statusOptions} typeOptions={typeOptions} showGroup={false} />
          <ProjectCalendarView projects={sorted} statusOptions={statusOptions} typeOptions={typeOptions}
            loading={loading} onSelect={id => { setSelectedProjectId(id); setDrawerOpen(true); }} />
        </div>
      )}

      <Modal title="重命名视图" open={!!renameId} onOk={() => { if (renameId) { updateView(renameId, { name: renameValue }); setRenameId(null); } }}
        onCancel={() => setRenameId(null)}>
        <Input value={renameValue} onChange={e => setRenameValue(e.target.value)} onPressEnter={() => { if (renameId) { updateView(renameId, { name: renameValue }); setRenameId(null); } }} />
      </Modal>
      <ProjectDrawer projectId={selectedProjectId} open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelectedProjectId(null); }}
        onEdit={id => navigate(`/projects/${id}/edit`)}
        onDelete={async id => { await deleteProject(id); message.success('删除成功'); fetchProjects(); }}
        onFileChanged={fetchProjects} />
    </Card>
  );
}
