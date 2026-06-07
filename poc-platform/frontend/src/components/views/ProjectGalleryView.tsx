import { Card, Tag, Spin, Empty } from 'antd';
import { ProjectOutlined, EnvironmentOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useTheme } from '../../context/ThemeContext';
import type { PocProject } from '../../api/projects';
import type { PocOption } from '../../api/options';

interface Props {
  projects: PocProject[];
  statusOptions: PocOption[];
  typeOptions: PocOption[];
  implOptions: PocOption[];
  loading: boolean;
  onSelect: (id: string) => void;
  titleField?: string;
  hiddenColumns?: string[];
}

const STATUS_COLORS: Record<string, string> = {
  '未开始': 'default', '准备中': 'blue', '进行中': 'processing', '已完成': 'success', '搁置': 'warning',
};

export default function ProjectGalleryView({ projects, statusOptions, typeOptions, implOptions, loading, onSelect, titleField = 'name', hiddenColumns = [] }: Props) {
  const { token } = useTheme();
  const fieldVal = (p: PocProject, field: string) => {
    if (field === 'status_id') return getLabel(statusOptions, p.status_id);
    if (field === 'poc_type_id') return getLabel(typeOptions, p.poc_type_id);
    if (field === 'impl_method_id') return getLabel(implOptions, p.impl_method_id);
    return String(p[field as keyof typeof p] || '');
  };
  const show = (col: string) => !hiddenColumns.includes(col);
  const getLabel = (opts: PocOption[], id: number) => opts.find(o => o.id === id)?.label || '';

  if (loading) return <Spin style={{ display: 'block', margin: '60px auto' }} />;
  if (projects.length === 0) return <Empty description="暂无项目" />;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
      {projects.map(p => {
        const status = getLabel(statusOptions, p.status_id);
        const statusColor = STATUS_COLORS[status] || 'default';
        return (
          <Card
            key={p.id}
            hoverable
            size="small"
            onClick={() => onSelect(p.id)}
            cover={
              <div style={{ height: 80, background: `linear-gradient(135deg, ${statusColor === 'processing' ? token.colorPrimary : statusColor === 'success' ? token.colorSuccess : statusColor === 'warning' ? token.colorWarning : token.colorFill}22 0%, ${statusColor === 'processing' ? token.colorPrimary : statusColor === 'success' ? token.colorSuccess : statusColor === 'warning' ? token.colorWarning : token.colorFill}08 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ProjectOutlined style={{ fontSize: 32, opacity: 0.3, color: statusColor === 'processing' ? token.colorPrimary : statusColor === 'success' ? token.colorSuccess : token.colorTextTertiary }} />
              </div>
            }
          >
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {titleField === 'name' ? p.name : fieldVal(p, titleField) || p.name}
            </div>
            {show('status_id') && <Tag color={statusColor}>{status}</Tag>}
            {show('poc_type_id') && <Tag>{getLabel(typeOptions, p.poc_type_id)}</Tag>}
            <div style={{ marginTop: 8, fontSize: 12, color: token.colorTextTertiary }}>
              {show('region') && <div><EnvironmentOutlined style={{ marginRight: 4 }} />{p.region} · {p.city}</div>}
              {show('start_date') && <div><ClockCircleOutlined style={{ marginRight: 4 }} />{p.start_date} ~ {p.end_date}</div>}
              {(show('pm') || show('sales')) && <div>{show('pm') ? p.pm : ''}{show('pm') && show('sales') ? ' · ' : ''}{show('sales') ? p.sales : ''}</div>}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
