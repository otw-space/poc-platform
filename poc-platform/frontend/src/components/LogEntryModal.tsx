import { useState, useEffect } from 'react';
import { Modal, Form, DatePicker, Button, Space, message } from 'antd';
import MDEditor from '@uiw/react-md-editor';
import dayjs from 'dayjs';
import { useTheme } from '../context/ThemeContext';
import type { ProjectLog, ProjectLogCreate, ProjectLogUpdate } from '../api/projects';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ProjectLogCreate | ProjectLogUpdate) => Promise<string | undefined>; // returns logId
  initialValues?: ProjectLog;
  onPush?: (logId: string) => Promise<void>;
  webhookUrl?: string | null;
}

export default function LogEntryModal({ open, onClose, onSubmit, initialValues, onPush, webhookUrl }: Props) {
  const { token } = useTheme();
  const [logDate, setLogDate] = useState<dayjs.Dayjs>(dayjs());
  const [progress, setProgress] = useState('');
  const [issues, setIssues] = useState('');
  const [plan, setPlan] = useState('');
  const [saving, setSaving] = useState(false);
  const [pushing, setPushing] = useState(false);

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

  const handleSubmit = async (pushAfter = false) => {
    setSaving(true);
    try {
      const logId = await onSubmit({
        log_date: logDate.format('YYYY-MM-DD'),
        progress,
        issues,
        plan,
      });
      if (pushAfter && logId && onPush) {
        setPushing(true);
        try { await onPush(logId); } catch { message.error('推送失败'); }
        setPushing(false);
      }
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
      width={700}
      destroyOnClose
      footer={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button loading={saving && !pushing} onClick={() => handleSubmit(false)}>保存</Button>
          {!initialValues && onPush && webhookUrl && (
            <Button type="primary" loading={saving} onClick={() => handleSubmit(true)}>保存并推送</Button>
          )}
          {initialValues && (
            <Button type="primary" loading={saving} onClick={() => handleSubmit(false)}>保存</Button>
          )}
        </Space>
      }
    >
      <Form layout="vertical">
        <Form.Item label="日期">
          <DatePicker value={logDate} onChange={(d) => setLogDate(d || dayjs())} style={{ width: '100%' }} />
        </Form.Item>
        <div style={editorStyle}>
          <div style={{ marginBottom: 4, fontSize: 14, color: token.colorText }}>进度</div>
          <MDEditor
            value={progress}
            onChange={(v) => setProgress(v || '')}
            preview="edit"
            height={160}
            visibleDragbar={false}
          />
        </div>
        <div style={editorStyle}>
          <div style={{ marginBottom: 4, fontSize: 14, color: token.colorText }}>问题</div>
          <MDEditor
            value={issues}
            onChange={(v) => setIssues(v || '')}
            preview="edit"
            height={160}
            visibleDragbar={false}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ marginBottom: 4, fontSize: 14, color: token.colorText }}>计划</div>
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
