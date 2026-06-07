import { Badge, Calendar, Spin, Empty, Tag } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useTheme } from '../../context/ThemeContext';
import type { PocProject } from '../../api/projects';
import type { PocOption } from '../../api/options';

interface Props {
  projects: PocProject[];
  statusOptions: PocOption[];
  typeOptions: PocOption[];
  loading: boolean;
  onSelect: (id: string) => void;
  titleField?: string;
  hiddenColumns?: string[];
}

const STATUS_COLORS: Record<string, string> = {
  '未开始': 'default', '准备中': 'blue', '进行中': 'processing', '已完成': 'success', '搁置': 'warning',
};

export default function ProjectCalendarView({ projects, statusOptions, typeOptions, loading, onSelect, titleField = 'name' }: Props) {
  const { token } = useTheme();
  const fieldVal = (p: PocProject, field: string) => {
    if (field === 'status_id') return getLabel(statusOptions, p.status_id);
    if (field === 'poc_type_id') return getLabel(typeOptions, p.poc_type_id);
    return String(p[field as keyof typeof p] || '');
  };
  const getLabel = (opts: PocOption[], id: number) => opts.find(o => o.id === id)?.label || '';

  const dateCellRender = (date: Dayjs) => {
    const dayStr = date.format('YYYY-MM-DD');
    const matched = projects.filter(p => p.start_date === dayStr || p.end_date === dayStr);
    if (matched.length === 0) return null;
    return (
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {matched.slice(0, 3).map(p => {
          const status = getLabel(statusOptions, p.status_id);
          const color = STATUS_COLORS[status] || 'default';
          const isStart = p.start_date === dayStr;
          return (
            <li key={p.id} style={{ marginBottom: 2 }}>
              <a onClick={(e) => { e.stopPropagation(); onSelect(p.id); }} style={{ fontSize: 11 }}>
                <Badge color={isStart ? (color === 'processing' ? token.colorPrimary : token.colorSuccess) : token.colorError} text={
                  <span style={{ fontSize: 11 }}>{titleField === 'name' ? p.name : fieldVal(p, titleField) || p.name}</span>
                } />
              </a>
            </li>
          );
        })}
        {matched.length > 3 && <li style={{ fontSize: 11, color: token.colorTextTertiary }}>+{matched.length - 3} 更多</li>}
      </ul>
    );
  };

  const monthCellRender = (date: Dayjs) => {
    const monthStr = date.format('YYYY-MM');
    const count = projects.filter(p => p.start_date?.startsWith(monthStr) || p.end_date?.startsWith(monthStr)).length;
    if (count === 0) return null;
    return <div style={{ fontSize: 12, color: token.colorTextTertiary, textAlign: 'center' }}>{count} 个项目</div>;
  };

  if (loading) return <Spin style={{ display: 'block', margin: '60px auto' }} />;
  if (projects.length === 0) return <Empty description="暂无项目" />;

  return (
    <Calendar
      dateCellRender={dateCellRender}
      monthCellRender={monthCellRender}
    />
  );
}
