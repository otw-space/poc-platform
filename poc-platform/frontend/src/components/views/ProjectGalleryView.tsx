import { Card, Tag, Spin, Empty } from 'antd';
import { ProjectOutlined, EnvironmentOutlined, ClockCircleOutlined } from '@ant-design/icons';
import type { PocProject } from '../../api/projects';
import type { PocOption } from '../../api/options';

interface Props {
  projects: PocProject[];
  statusOptions: PocOption[];
  typeOptions: PocOption[];
  implOptions: PocOption[];
  loading: boolean;
  onSelect: (id: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  '未开始': 'default', '准备中': 'blue', '进行中': 'processing', '已完成': 'success', '搁置': 'warning',
};

export default function ProjectGalleryView({ projects, statusOptions, typeOptions, implOptions, loading, onSelect }: Props) {
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
              <div style={{ height: 80, background: `linear-gradient(135deg, ${statusColor === 'processing' ? '#1677ff' : statusColor === 'success' ? '#52c41a' : statusColor === 'warning' ? '#fa8c16' : '#d9d9d9'}22 0%, ${statusColor === 'processing' ? '#1677ff' : statusColor === 'success' ? '#52c41a' : statusColor === 'warning' ? '#fa8c16' : '#d9d9d9'}08 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ProjectOutlined style={{ fontSize: 32, opacity: 0.3, color: statusColor === 'processing' ? '#1677ff' : statusColor === 'success' ? '#52c41a' : '#666' }} />
              </div>
            }
          >
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.name}
            </div>
            <Tag color={statusColor}>{status}</Tag>
            <Tag>{getLabel(typeOptions, p.poc_type_id)}</Tag>
            <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
              <div><EnvironmentOutlined style={{ marginRight: 4 }} />{p.region} · {p.city}</div>
              <div><ClockCircleOutlined style={{ marginRight: 4 }} />{p.start_date} ~ {p.end_date}</div>
              <div>{p.pm} · {p.sales}</div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
