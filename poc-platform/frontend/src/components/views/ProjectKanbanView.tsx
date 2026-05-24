import { useState } from 'react';
import { Card, Tag, Spin, Empty, Select } from 'antd';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTheme } from '../../context/ThemeContext';
import type { PocProject } from '../../api/projects';
import type { PocOption } from '../../api/options';

interface Props {
  projects: PocProject[];
  statusOptions: PocOption[];
  typeOptions: PocOption[];
  implOptions: PocOption[];
  loading: boolean;
  groupBy: string;
  groupOptions: { label: string; value: string }[];
  onGroupByChange: (v: string) => void;
  onStatusChange: (projectId: string, value: string) => Promise<void>;
}

function ProjectCard({ project, typeOptions, id }: { project: PocProject; typeOptions: PocOption[]; id: string }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: 'grab',
  };
  const typeLabel = typeOptions.find(o => o.id === project.poc_type_id)?.label || '';
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card size="small" hoverable style={{ marginBottom: 8 }}>
        <div style={{ fontWeight: 500, marginBottom: 4, fontSize: 13 }}>{project.name}</div>
        <div style={{ fontSize: 12, color: '#999' }}>{project.region} · {project.city} · {project.pm}</div>
        {typeLabel && <Tag color="blue" style={{ fontSize: 11, marginTop: 4 }}>{typeLabel}</Tag>}
      </Card>
    </div>
  );
}

const GROUP_OPTIONS = [
  { label: '状态', value: 'status_id' },
  { label: 'PoC类型', value: 'poc_type_id' },
  { label: '实施方式', value: 'impl_method_id' },
  { label: '区域', value: 'region' },
  { label: '城市', value: 'city' },
  { label: '销售', value: 'sales' },
  { label: '项目经理', value: 'pm' },
];

export default function ProjectKanbanView({ projects, statusOptions, typeOptions, implOptions, loading, groupBy, onGroupByChange, onStatusChange }: Props) {
  const { dark } = useTheme();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Build columns based on groupBy field
  const getOpts = (): PocOption[] => {
    if (groupBy === 'status_id') return statusOptions;
    if (groupBy === 'poc_type_id') return typeOptions;
    if (groupBy === 'impl_method_id') return implOptions;
    return [];
  };

  const getVal = (p: PocProject, field: string) => {
    if (field === 'status_id') return String(p.status_id);
    if (field === 'poc_type_id') return String(p.poc_type_id);
    if (field === 'impl_method_id') return String(p.impl_method_id);
    return String(p[field as keyof typeof p] || '未分组');
  };

  const opts = getOpts();
  const fieldOpts = opts.length > 0;

  // If grouped by a field with options (status/type/impl), use option labels
  // Otherwise group by string values
  const columns = fieldOpts
    ? opts.map(o => ({
        ...o,
        items: projects.filter(p => getVal(p, groupBy) === String(o.id)),
      }))
    : (() => {
        const map = new Map<string, PocProject[]>();
        projects.forEach(p => {
          const v = getVal(p, groupBy) || '未分组';
          if (!map.has(v)) map.set(v, []);
          map.get(v)!.push(p);
        });
        return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([label, items]) => ({
          id: label, label, items,
        }));
      })();

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const targetColId = String((over.id as string).split('::')[0]);
    // Only meaningful for status change; other fields are read-only grouping
    if (groupBy === 'status_id') {
      await onStatusChange(active.id as string, targetColId);
    }
  };

  if (loading) return <Spin style={{ display: 'block', margin: '60px auto' }} />;
  if (projects.length === 0) return <Empty description="暂无项目" />;

  return (
    <div>
      <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: '#999' }}>分组字段：</span>
        <Select size="small" value={groupBy} onChange={onGroupByChange}
          options={GROUP_OPTIONS} style={{ width: 120 }} />
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div style={{ display: 'flex', gap: 12, overflow: 'auto', paddingBottom: 8 }}>
          {columns.map(col => (
            <div key={col.id} style={{ flex: 1, minWidth: 200, maxWidth: 280 }}>
              <div style={{ fontWeight: 600, fontSize: 14, padding: '8px 12px', marginBottom: 8, borderRadius: 6, background: dark ? '#1f1f1f' : '#f5f5f5', color: dark ? '#e8e8e8' : undefined }}>
                {col.label} <span style={{ color: dark ? '#888' : '#999', fontWeight: 400 }}>({col.items.length})</span>
              </div>
              <SortableContext items={col.items.map(p => `${col.id}::${p.id}`)} strategy={verticalListSortingStrategy}>
                <div style={{ minHeight: 100 }}>
                  {col.items.map(p => (
                    <ProjectCard key={p.id} id={`${col.id}::${p.id}`} project={p} typeOptions={typeOptions} />
                  ))}
                </div>
              </SortableContext>
            </div>
          ))}
        </div>
      </DndContext>
    </div>
  );
}
