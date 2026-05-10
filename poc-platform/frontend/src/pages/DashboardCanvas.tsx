import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Button, Spin, Empty, Tabs, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Responsive, WidthProvider, type Layout } from 'react-grid-layout/legacy';
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

  // Build layout from chart coordinates (rowHeight: 100)
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

  const layoutSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Handle layout change — optimistic state update + debounced persist
  const handleLayoutChange = useCallback(
    (newLayout: Layout) => {
      const current = dashboardsRef.current;
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

      // Optimistic state update (immediate, every pixel)
      setDashboards((prev) =>
        prev.map((db) => {
          const updatedCharts = dbUpdates.get(db.id);
          if (updatedCharts) {
            return { ...db, config: { ...db.config, charts: updatedCharts } };
          }
          return db;
        })
      );

      // Debounced API persistence
      if (layoutSaveTimerRef.current) clearTimeout(layoutSaveTimerRef.current);
      layoutSaveTimerRef.current = setTimeout(() => {
        for (const [dbId, charts] of dbUpdates) {
          const db = dashboardsRef.current.find((d) => d.id === dbId);
          if (!db) continue;
          updateDashboard(dbId, { config: { ...(db.config || { filters: [] }), charts } })
            .catch(() => { fetch(); message.error('保存布局失败'); });
        }
      }, 800);
    },
    [fetch]
  );

  // Debounced save for chart updates
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveChartChanges = useCallback((dbId: string, charts: ChartConfig[]) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      updateDashboard(dbId, { config: { ...(dashboardsRef.current.find(d => d.id === dbId)?.config || { filters: [] }), charts } })
        .catch(() => { fetch(); message.error('更新失败'); });
    }, 500);
  }, [fetch]);

  // Handle chart inline update (optimistic state + debounced persisting)
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

    saveChartChanges(db.id, newCharts);
  };

  // Handle chart delete
  const handleDeleteChart = async (chartId: string) => {
    const db = findDashboard(chartId);
    if (!db) return;

    const newCharts = (db.config?.charts || []).filter((c) => c.id !== chartId);

    if (newCharts.length === 0) {
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
          onLayoutChange={(currentLayout) => handleLayoutChange(currentLayout)}
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
