import { useState } from 'react';
import { Card, Tag, Button, Popover, message, Spin, Empty } from 'antd';
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
  loading: boolean;
  onStatusChange: (projectId: string, statusId: number) => Promise<void>;
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
        <div style={{ fontSize: 12, color: '#666' }}>
          {project.region} · {project.city} · {project.pm}
        </div>
        <div style={{ marginTop: 4 }}>
          {typeLabel && <Tag color="blue" style={{ fontSize: 11 }}>{typeLabel}</Tag>}
        </div>
      </Card>
    </div>
  );
}

export default function ProjectKanbanView({ projects, statusOptions, typeOptions, loading, onStatusChange }: Props) {
  const { dark } = useTheme();
  const [saving, setSaving] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const columns = statusOptions.map(s => ({
    ...s,
    items: projects.filter(p => p.status_id === s.id),
  }));

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const targetStatusId = Number((over.id as string).split('-')[1]);
    if (isNaN(targetStatusId)) return;
    setSaving(true);
    try {
      await onStatusChange(active.id as string, targetStatusId);
    } catch { message.error('移动失败'); }
    setSaving(false);
  };

  if (loading) return <Spin style={{ display: 'block', margin: '60px auto' }} />;
  if (projects.length === 0) return <Empty description="暂无项目" />;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div style={{ display: 'flex', gap: 12, overflow: 'auto', paddingBottom: 8 }}>
        {columns.map(col => (
          <div key={col.id} style={{ flex: 1, minWidth: 200, maxWidth: 280 }}>
            <div style={{ fontWeight: 600, fontSize: 14, padding: '8px 12px', marginBottom: 8, borderRadius: 6, background: dark ? '#1f1f1f' : '#f5f5f5', color: dark ? '#e8e8e8' : undefined }}>
              {col.label} <span style={{ color: '#999', fontWeight: 400 }}>({col.items.length})</span>
            </div>
            <SortableContext items={col.items.map(p => p.id)} strategy={verticalListSortingStrategy}>
              <div style={{ minHeight: 100 }}>
                {col.items.map(p => (
                  <ProjectCard key={p.id} id={p.id} project={p} typeOptions={typeOptions} />
                ))}
              </div>
            </SortableContext>
            {saving && <Spin size="small" style={{ display: 'block', marginTop: 8 }} />}
          </div>
        ))}
      </div>
    </DndContext>
  );
}
