import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tag, Button, Space, Popconfirm, message, Spin } from 'antd';
import { getProject, deleteProject, type PocProject } from '../api/projects';
import { getOptions, type PocOption } from '../api/options';
import dayjs from 'dayjs';

const STATUS_COLORS: Record<string, string> = {
  '未开始': 'default', '准备中': 'blue', '进行中': 'processing', '已完成': 'success', '搁置': 'warning',
};

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<PocProject | null>(null);
  const [typeOptions, setTypeOptions] = useState<PocOption[]>([]);
  const [implOptions, setImplOptions] = useState<PocOption[]>([]);
  const [statusOptions, setStatusOptions] = useState<PocOption[]>([]);

  useEffect(() => {
    getOptions('poc_type').then((r) => setTypeOptions(r.data));
    getOptions('impl_method').then((r) => setImplOptions(r.data));
    getOptions('status').then((r) => setStatusOptions(r.data));
    getProject(id!).then((r) => setProject(r.data));
  }, [id]);

  const getLabel = (opts: PocOption[], id: number) => opts.find((o) => o.id === id)?.label || '';

  const handleDelete = async () => {
    await deleteProject(id!);
    message.success('已删除');
    navigate('/projects');
  };

  if (!project) return <Spin style={{ display: 'block', margin: '100px auto' }} />;

  const statusLabel = getLabel(statusOptions, project.status_id);

  return (
    <Card
      title={project.name}
      extra={
        <Space>
          <Button onClick={() => navigate(`/projects/${id}/edit`)}>编辑</Button>
          <Popconfirm title="确认删除？" onConfirm={handleDelete}>
            <Button danger>删除</Button>
          </Popconfirm>
        </Space>
      }
      style={{ maxWidth: 800, margin: '0 auto' }}
    >
      <Descriptions column={2} bordered size="small">
        <Descriptions.Item label="区域">{project.region}</Descriptions.Item>
        <Descriptions.Item label="城市">{project.city}</Descriptions.Item>
        <Descriptions.Item label="销售">{project.sales}</Descriptions.Item>
        <Descriptions.Item label="项目经理">{project.pm}</Descriptions.Item>
        <Descriptions.Item label="开始日期">{project.start_date}</Descriptions.Item>
        <Descriptions.Item label="完成日期">{project.end_date}</Descriptions.Item>
        <Descriptions.Item label="工期">{project.duration_days ? `${project.duration_days} 工作日` : '-'}</Descriptions.Item>
        <Descriptions.Item label="PoC类型">
          <Tag>{getLabel(typeOptions, project.poc_type_id)}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="实施方式">
          <Tag>{getLabel(implOptions, project.impl_method_id)}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="状态">
          <Tag color={STATUS_COLORS[statusLabel]}>{statusLabel}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="创建时间">{dayjs(project.created_at).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
        <Descriptions.Item label="更新时间">{dayjs(project.updated_at).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
      </Descriptions>
      {project.result && (
        <div style={{ marginTop: 24 }}>
          <h4>PoC结果</h4>
          <p style={{ whiteSpace: 'pre-wrap' }}>{project.result}</p>
        </div>
      )}
    </Card>
  );
}
