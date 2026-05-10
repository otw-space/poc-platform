import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tag, Button, Space, Popconfirm, message, Spin, Tabs, Upload, Timeline, Empty } from 'antd';
import { UploadOutlined, DownloadOutlined, EyeOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import MDEditor from '@uiw/react-md-editor';
import { getProject, deleteProject, updateProject, getProjectLogs, createProjectLog, updateProjectLog, deleteProjectLog, uploadProjectFile, getFileDownloadUrl, type PocProject, type ProjectLog, type ProjectLogCreate, type ProjectLogUpdate } from '../api/projects';
import { getOptions, type PocOption } from '../api/options';
import LogEntryModal from '../components/LogEntryModal';
import dayjs from 'dayjs';

const STATUS_COLORS: Record<string, string> = {
  '未开始': 'default', '准备中': 'blue', '进行中': 'processing', '已完成': 'success', '搁置': 'warning',
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<PocProject | null>(null);
  const [typeOptions, setTypeOptions] = useState<PocOption[]>([]);
  const [implOptions, setImplOptions] = useState<PocOption[]>([]);
  const [statusOptions, setStatusOptions] = useState<PocOption[]>([]);
  const [logs, setLogs] = useState<ProjectLog[]>([]);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<ProjectLog | undefined>(undefined);

  const fetchProject = useCallback(() => {
    if (!id) return;
    getProject(id).then((r) => setProject(r.data));
  }, [id]);

  const fetchLogs = useCallback(() => {
    if (!id) return;
    getProjectLogs(id).then((r) => setLogs(r.data));
  }, [id]);

  useEffect(() => {
    getOptions('poc_type').then((r) => setTypeOptions(r.data));
    getOptions('impl_method').then((r) => setImplOptions(r.data));
    getOptions('status').then((r) => setStatusOptions(r.data));
    fetchProject();
    fetchLogs();
  }, [fetchProject, fetchLogs]);

  const getLabel = (opts: PocOption[], id: number) => opts.find((o) => o.id === id)?.label || '';

  const handleDelete = async () => {
    await deleteProject(id!);
    message.success('已删除');
    navigate('/projects');
  };

  const handleDeleteFile = async (fileType: 'plan' | 'report') => {
    await updateProject(id!, { [`${fileType}_file`]: null });
    message.success('文件已删除');
    fetchProject();
  };

  const handleLogCreate = async (data: ProjectLogCreate | ProjectLogUpdate) => {
    await createProjectLog(id!, data as ProjectLogCreate);
    message.success('日志已添加');
    fetchLogs();
  };

  const handleLogUpdate = async (data: ProjectLogCreate | ProjectLogUpdate) => {
    if (!editingLog) return;
    await updateProjectLog(id!, editingLog.id, data as ProjectLogUpdate);
    message.success('日志已更新');
    setEditingLog(undefined);
    fetchLogs();
  };

  const handleLogDelete = async (logId: string) => {
    await deleteProjectLog(id!, logId);
    message.success('日志已删除');
    fetchLogs();
  };

  if (!project) return <Spin style={{ display: 'block', margin: '100px auto' }} />;

  const statusLabel = getLabel(statusOptions, project.status_id);

  const renderFileSection = (fileType: 'plan' | 'report', title: string, accept: string) => {
    const fileMeta = fileType === 'plan' ? project.plan_file : project.report_file;
    const hasFile = fileMeta && fileMeta.original_filename;

    return (
      <Card title={title} size="small" style={{ marginBottom: 16 }}>
        {hasFile ? (
          <div>
            <div style={{ marginBottom: 8, color: 'rgba(0,0,0,0.65)' }}>
              {fileMeta.original_filename} ({formatFileSize(fileMeta.size)})
            </div>
            <Space>
              <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={() => window.open(getFileDownloadUrl(id!, fileType, true), '_blank')}
              >
                预览
              </Button>
              <Button
                size="small"
                icon={<DownloadOutlined />}
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = getFileDownloadUrl(id!, fileType, false);
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }}
              >
                下载
              </Button>
              <Popconfirm title="确认删除此文件？" onConfirm={() => handleDeleteFile(fileType)}>
                <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
              </Popconfirm>
            </Space>
          </div>
        ) : (
          <Empty description="暂无文件" image={Empty.PRESENTED_IMAGE_SIMPLE}>
            <Upload
              accept={accept}
              maxCount={1}
              showUploadList={false}
              customRequest={async ({ file, onSuccess, onError }) => {
                try {
                  await uploadProjectFile(id!, fileType, file as File);
                  onSuccess?.('ok');
                  message.success('上传成功');
                  fetchProject();
                } catch {
                  onError?.(new Error('Upload failed'));
                  message.error('上传失败');
                }
              }}
            >
              <Button icon={<UploadOutlined />}>上传文件</Button>
            </Upload>
          </Empty>
        )}
        {hasFile && (
          <div style={{ marginTop: 8 }}>
            <Upload
              accept={accept}
              maxCount={1}
              showUploadList={false}
              customRequest={async ({ file, onSuccess, onError }) => {
                try {
                  await uploadProjectFile(id!, fileType, file as File);
                  onSuccess?.('ok');
                  message.success('重新上传成功');
                  fetchProject();
                } catch {
                  onError?.(new Error('Upload failed'));
                  message.error('上传失败');
                }
              }}
            >
              <Button size="small" type="link">重新上传</Button>
            </Upload>
          </div>
        )}
      </Card>
    );
  };

  const tabItems = [
    {
      key: 'info',
      label: '基本信息',
      children: (
        <div style={{ maxWidth: 800 }}>
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
        </div>
      ),
    },
    {
      key: 'files',
      label: '文件资料',
      children: (
        <div style={{ maxWidth: 800 }}>
          {renderFileSection('plan', '实施方案', '.doc,.docx,.pdf')}
          {renderFileSection('report', '总结报告', '.ppt,.pptx,.pdf')}
        </div>
      ),
    },
    {
      key: 'logs',
      label: '日志记录',
      children: (
        <div style={{ maxWidth: 800 }}>
          <div style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              onClick={() => {
                setEditingLog(undefined);
                setLogModalOpen(true);
              }}
            >
              新增日志
            </Button>
          </div>
          {logs.length === 0 ? (
            <Empty description="暂无日志" />
          ) : (
            <Timeline
              items={logs.map((log) => ({
                children: (
                  <Card
                    size="small"
                    title={log.log_date}
                    extra={
                      <Space>
                        <Button
                          size="small"
                          type="link"
                          icon={<EditOutlined />}
                          onClick={() => {
                            setEditingLog(log);
                            setLogModalOpen(true);
                          }}
                        >
                          编辑
                        </Button>
                        <Popconfirm title="确认删除？" onConfirm={() => handleLogDelete(log.id)}>
                          <Button size="small" type="link" danger>删除</Button>
                        </Popconfirm>
                      </Space>
                    }
                  >
                    <div style={{ marginBottom: 8 }}>
                      <strong>进度：</strong>
                      <MDEditor.Markdown source={log.progress || '暂无'} style={{ backgroundColor: 'transparent' }} />
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <strong>问题：</strong>
                      <MDEditor.Markdown source={log.issues || '暂无'} style={{ backgroundColor: 'transparent' }} />
                    </div>
                    <div>
                      <strong>计划：</strong>
                      <MDEditor.Markdown source={log.plan || '暂无'} style={{ backgroundColor: 'transparent' }} />
                    </div>
                  </Card>
                ),
              }))}
            />
          )}
        </div>
      ),
    },
  ];

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
      style={{ maxWidth: 900, margin: '0 auto' }}
    >
      <Tabs items={tabItems} />

      <LogEntryModal
        open={logModalOpen}
        onClose={() => {
          setLogModalOpen(false);
          setEditingLog(undefined);
        }}
        onSubmit={editingLog ? handleLogUpdate : handleLogCreate}
        initialValues={editingLog}
      />
    </Card>
  );
}
