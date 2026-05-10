import { useState, useEffect } from 'react';
import { Modal, Form, DatePicker, message } from 'antd';
import MDEditor from '@uiw/react-md-editor';
import dayjs from 'dayjs';
import type { ProjectLog, ProjectLogCreate, ProjectLogUpdate } from '../api/projects';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ProjectLogCreate | ProjectLogUpdate) => Promise<void>;
  initialValues?: ProjectLog;
}

export default function LogEntryModal({ open, onClose, onSubmit, initialValues }: Props) {
  const [logDate, setLogDate] = useState<dayjs.Dayjs>(dayjs());
  const [progress, setProgress] = useState('');
  const [issues, setIssues] = useState('');
  const [plan, setPlan] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (initialValues) {
        setLogDate(dayjs(initialValues.log_date));
        setProgress(initialValues.progress);
        setIssues(initialValues.issues);
        setPlan(initialValues.plan);
      } else {
        setLogDate(dayjs());
        setProgress('');
        setIssues('');
        setPlan('');
      }
    }
  }, [open, initialValues]);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onSubmit({
        log_date: logDate.format('YYYY-MM-DD'),
        progress,
        issues,
        plan,
      });
      onClose();
    } catch {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const editorStyle: React.CSSProperties = { marginBottom: 12 };

  return (
    <Modal
      title={initialValues ? '编辑日志' : '新增日志'}
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={saving}
      width={700}
      destroyOnClose
    >
      <Form layout="vertical">
        <Form.Item label="日期">
          <DatePicker value={logDate} onChange={(d) => setLogDate(d || dayjs())} style={{ width: '100%' }} />
        </Form.Item>
        <div style={editorStyle}>
          <div style={{ marginBottom: 4, fontSize: 14, color: 'rgba(0,0,0,0.88)' }}>进度</div>
          <MDEditor
            value={progress}
            onChange={(v) => setProgress(v || '')}
            preview="edit"
            height={160}
            visibleDragbar={false}
          />
        </div>
        <div style={editorStyle}>
          <div style={{ marginBottom: 4, fontSize: 14, color: 'rgba(0,0,0,0.88)' }}>问题</div>
          <MDEditor
            value={issues}
            onChange={(v) => setIssues(v || '')}
            preview="edit"
            height={160}
            visibleDragbar={false}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ marginBottom: 4, fontSize: 14, color: 'rgba(0,0,0,0.88)' }}>计划</div>
          <MDEditor
            value={plan}
            onChange={(v) => setPlan(v || '')}
            preview="edit"
            height={160}
            visibleDragbar={false}
          />
        </div>
      </Form>
    </Modal>
  );
}
