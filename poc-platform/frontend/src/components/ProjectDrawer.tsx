import { useEffect, useState, useCallback, useRef } from 'react';
import { Drawer, Descriptions, Tag, Button, Space, Popconfirm, message, Spin, Tabs, Timeline, Empty, Modal, Input } from 'antd';
import { UploadOutlined, DownloadOutlined, EyeOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import MDEditor from '@uiw/react-md-editor';
import { getProject, updateProject, getProjectLogs, createProjectLog, updateProjectLog, deleteProjectLog, pushProjectLog, uploadProjectFile, type PocProject, type ProjectLog, type ProjectLogCreate, type ProjectLogUpdate } from '../api/projects';
import { getOptions, type PocOption } from '../api/options';
import LogEntryModal from './LogEntryModal';
import FileUpload from './FileUpload';
import client from '../api/client';
import dayjs from 'dayjs';

const STATUS_COLORS: Record<string, string> = {
  '未开始': 'default', '准备中': 'blue', '进行中': 'processing', '已完成': 'success', '搁置': 'warning',
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  projectId: string | null;
  open: boolean;
  onClose: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onFileChanged: () => void;
}

export default function ProjectDrawer({ projectId, open, onClose, onEdit, onDelete, onFileChanged }: Props) {
  const [project, setProject] = useState<PocProject | null>(null);
  const [typeOptions, setTypeOptions] = useState<PocOption[]>([]);
  const [implOptions, setImplOptions] = useState<PocOption[]>([]);
  const [statusOptions, setStatusOptions] = useState<PocOption[]>([]);
  const [logs, setLogs] = useState<ProjectLog[]>([]);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<ProjectLog | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [webhookInput, setWebhookInput] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');

  const fetchProject = useCallback(() => {
    if (!projectId) return;
    setLoading(true);
    getProject(projectId).then((r) => { setProject(r.data); setWebhookInput(r.data.webhook_url || ''); }).finally(() => setLoading(false));
  }, [projectId]);

  const fetchLogs = useCallback(() => {
    if (!projectId) return;
    getProjectLogs(projectId).then((r) => setLogs(r.data)).catch(() => {});
  }, [projectId]);

  useEffect(() => {
    if (open && projectId) {
      getOptions('poc_type').then((r) => setTypeOptions(r.data));
      getOptions('impl_method').then((r) => setImplOptions(r.data));
      getOptions('status').then((r) => setStatusOptions(r.data));
      fetchProject();
      fetchLogs();
    }
  }, [open, projectId, fetchProject, fetchLogs]);

  const getLabel = (opts: PocOption[], id: number) => opts.find((o) => o.id === id)?.label || '';

  const handlePreview = async (fileType: 'plan' | 'report', filename: string) => {
    if (!projectId) return;
    try {
      setPreviewTitle(filename);
      setPreviewOpen(true);
      setPreviewUrl('');
      const res = await client.get(`/projects/${projectId}/download/${fileType}`, {
        params: { inline: true },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      setPreviewUrl(url);
    } catch {
      message.error('预览失败');
      setPreviewOpen(false);
    }
  };

  const handleDownload = async (fileType: 'plan' | 'report') => {
    if (!projectId) return;
    try {
      const res = await client.get(`/projects/${projectId}/download/${fileType}`, {
        responseType: 'blob',
      });
      const disposition = res.headers['content-disposition'] || '';
      const match = disposition.match(/filename\*=UTF-8''(.+)/);
      const filename = match ? decodeURIComponent(match[1]) : 'download';
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      message.error('下载失败');
    }
  };

  const handleDeleteFile = async (fileType: 'plan' | 'report') => {
    if (!projectId) return;
    await updateProject(projectId, { [`${fileType}_file`]: null });
    message.success('文件已删除');
    fetchProject();
    onFileChanged();
  };

  const handleLogCreate = async (data: ProjectLogCreate | ProjectLogUpdate) => {
    if (!projectId) return;
    const r = await createProjectLog(projectId, data as ProjectLogCreate);
    message.success('日志已添加');
    fetchLogs();
    return r.data.id;
  };

  const handleLogUpdate = async (data: ProjectLogCreate | ProjectLogUpdate) => {
    if (!projectId || !editingLog) return;
    await updateProjectLog(projectId, editingLog.id, data as ProjectLogUpdate);
    message.success('日志已更新');
    setEditingLog(undefined);
    fetchLogs();
    return editingLog.id;
  };

  const handlePushLog = async (logId: string) => {
    if (!projectId) return;
    await pushProjectLog(projectId, logId);
    message.success('推送成功');
  };

  const handleLogDelete = async (logId: string) => {
    if (!projectId) return;
    await deleteProjectLog(projectId, logId);
    message.success('日志已删除');
    fetchLogs();
  };

  const renderFileSection = (fileType: 'plan' | 'report', title: string, accept: string) => {
    const fileMeta = fileType === 'plan' ? project?.plan_file : project?.report_file;
    const hasFile = fileMeta && fileMeta.original_filename;

    return (
      <div style={{ marginBottom: 16, padding: 16, border: '1px solid #f0f0f0', borderRadius: 8 }}>
        <h4>{title}</h4>
        {hasFile ? (
          <div>
            <div style={{ marginBottom: 8, color: 'rgba(0,0,0,0.65)', fontSize: 13 }}>
              {fileMeta.original_filename} ({formatFileSize(fileMeta.size)})
            </div>
            <Space>
              <Button size="small" icon={<EyeOutlined />} onClick={() => handlePreview(fileType, fileMeta.original_filename)} disabled={!fileMeta.original_filename.toLowerCase().endsWith('.pdf')}>预览</Button>
              <Button size="small" icon={<DownloadOutlined />} onClick={() => handleDownload(fileType)}>下载</Button>
              <Popconfirm title="确认删除此文件？" onConfirm={() => handleDeleteFile(fileType)}>
                <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
              </Popconfirm>
            </Space>
            <div style={{ marginTop: 8 }}>
              <FileUpload
                accept={accept}
                hasFile
                uploadFn={(file, onProgress, signal) => uploadProjectFile(projectId!, fileType, file as File, onProgress, signal)}
                onSuccess={() => { fetchProject(); onFileChanged(); }}
              >
                <Button size="small" type="link">重新上传</Button>
              </FileUpload>
            </div>
          </div>
        ) : (
          <FileUpload
            accept={accept}
            uploadFn={(file, onProgress, signal) => uploadProjectFile(projectId!, fileType, file as File, onProgress, signal)}
            onSuccess={() => { fetchProject(); onFileChanged(); }}
          >
            <Button icon={<UploadOutlined />}>上传文件</Button>
          </FileUpload>
        )}
      </div>
    );
  };

  if (!projectId) return null;

  const statusLabel = getLabel(statusOptions, project?.status_id ?? 0);

  const tabItems = [
    {
      key: 'info',
      label: '基本信息',
      children: loading ? <Spin style={{ display: 'block', margin: '40px auto' }} /> : project ? (
        <div>
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="区域">{project.region}</Descriptions.Item>
            <Descriptions.Item label="城市">{project.city}</Descriptions.Item>
            <Descriptions.Item label="销售">{project.sales}</Descriptions.Item>
            <Descriptions.Item label="项目经理">{project.pm}</Descriptions.Item>
            <Descriptions.Item label="开始日期">{project.start_date}</Descriptions.Item>
            <Descriptions.Item label="完成日期">{project.end_date}</Descriptions.Item>
            <Descriptions.Item label="工期">{project.duration_days ? `${project.duration_days} 工作日` : '-'}</Descriptions.Item>
            <Descriptions.Item label="PoC类型"><Tag>{getLabel(typeOptions, project.poc_type_id)}</Tag></Descriptions.Item>
            <Descriptions.Item label="实施方式"><Tag>{getLabel(implOptions, project.impl_method_id)}</Tag></Descriptions.Item>
            <Descriptions.Item label="状态"><Tag color={STATUS_COLORS[statusLabel]}>{statusLabel}</Tag></Descriptions.Item>
          </Descriptions>
          {project.result && (
            <div style={{ marginTop: 16 }}>
              <h4>PoC结果</h4>
              <p style={{ whiteSpace: 'pre-wrap' }}>{project.result}</p>
            </div>
          )}
        </div>
      ) : null,
    },
    {
      key: 'files',
      label: '文件资料',
      children: (
        <div>
          {renderFileSection('plan', '实施方案', '.doc,.docx,.pdf')}
          {renderFileSection('report', '总结报告', '.ppt,.pptx,.pdf')}
        </div>
      ),
    },
    {
      key: 'logs',
      label: '日志记录',
      children: (
        <div>
          <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <Button type="primary" onClick={() => { setEditingLog(undefined); setLogModalOpen(true); }}>新增日志</Button>
            <Input
              style={{ flex: 1, minWidth: 240 }}
              size="small"
              placeholder="企业微信 Webhook URL（可选）"
              value={webhookInput}
              onChange={(e: any) => setWebhookInput(e.target.value)}
              allowClear
            />
            <Button size="small" type="primary" onClick={() => updateProject(projectId!, { webhook_url: webhookInput }).then(() => { fetchProject(); message.success('Webhook 已保存'); })}>保存</Button>
          </div>
          {logs.length === 0 ? (
            <Empty description="暂无日志" />
          ) : (
            <Timeline items={logs.map((log) => ({
              children: (
                <div style={{ marginBottom: 8, padding: 12, border: '1px solid #f0f0f0', borderRadius: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <strong>{log.log_date}</strong>
                    <Space>
                      <Button size="small" type="link" icon={<EditOutlined />} onClick={() => { setEditingLog(log); setLogModalOpen(true); }}>编辑</Button>
                      <Popconfirm title="确认删除？" onConfirm={() => handleLogDelete(log.id)}>
                        <Button size="small" type="link" danger>删除</Button>
                      </Popconfirm>
                      {project?.webhook_url && (
                        <Button size="small" type="link" onClick={() => handlePushLog(log.id)}>推送</Button>
                      )}
                    </Space>
                  </div>
                  <div style={{ marginBottom: 6 }}><strong>进度：</strong><MDEditor.Markdown source={log.progress || '暂无'} style={{ backgroundColor: 'transparent', fontSize: 13 }} /></div>
                  <div style={{ marginBottom: 6 }}><strong>问题：</strong><MDEditor.Markdown source={log.issues || '暂无'} style={{ backgroundColor: 'transparent', fontSize: 13 }} /></div>
                  <div><strong>计划：</strong><MDEditor.Markdown source={log.plan || '暂无'} style={{ backgroundColor: 'transparent', fontSize: 13 }} /></div>
                </div>
              ),
            }))} />
          )}
        </div>
      ),
    },
  ];

  return (
    <Drawer
      title={project?.name || '项目详情'}
      open={open}
      onClose={onClose}
      width={720}
      extra={
        <Space>
          <Button onClick={() => { onEdit(projectId); onClose(); }}>编辑</Button>
          <Popconfirm title="确认删除？" onConfirm={() => { onDelete(projectId); onClose(); }}>
            <Button danger>删除</Button>
          </Popconfirm>
        </Space>
      }
    >
      <Tabs items={tabItems} />

      <Modal
        title={previewTitle}
        open={previewOpen}
        onCancel={() => { setPreviewOpen(false); setPreviewUrl(''); }}
        footer={null}
        width="90%"
        style={{ top: 20 }}
        destroyOnClose
      >
        {previewUrl ? (
          <iframe src={previewUrl} style={{ width: '100%', height: '80vh', border: 'none' }} title={previewTitle} />
        ) : (
          <Spin style={{ display: 'block', margin: '80px auto' }} />
        )}
      </Modal>

      <LogEntryModal
        open={logModalOpen}
        onClose={() => { setLogModalOpen(false); setEditingLog(undefined); }}
        onSubmit={editingLog ? handleLogUpdate : handleLogCreate}
        initialValues={editingLog}
        onPush={handlePushLog}
        webhookUrl={project?.webhook_url}
      />
    </Drawer>
  );
}
