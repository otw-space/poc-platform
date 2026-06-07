import { Progress, Button, Space } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { useTheme } from '../context/ThemeContext';

interface Props {
  progress: number;
  uploading: boolean;
  onCancel: () => void;
  file?: File;
}

export default function UploadProgressBar({ progress, uploading, onCancel, file }: Props) {
  const { token } = useTheme();
  if (!uploading) return null;

  return (
    <div style={{ marginTop: 8, width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ flex: 1, fontSize: 13, color: token.colorTextSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {file ? `上传中: ${file.name}` : '上传中...'}
        </span>
        <Button size="small" danger icon={<CloseOutlined />} onClick={onCancel}>
          取消
        </Button>
      </div>
      <Space.Compact block>
        <Progress percent={progress} strokeColor={token.colorPrimary} size="small" style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: token.colorTextTertiary, marginLeft: 8 }}>{progress}%</span>
      </Space.Compact>
    </div>
  );
}
