import { useState } from 'react';
import { Upload, Button, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import UploadProgressBar from './UploadProgressBar';

interface Props {
  accept?: string;
  hasFile?: boolean;
  uploadFn: (file: File, onProgress: (pct: number) => void, signal: AbortSignal) => Promise<any>;
  onSuccess?: () => void;
  children?: React.ReactNode;
}

export default function FileUpload({ accept, hasFile, uploadFn, onSuccess, children }: Props) {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [controller, setController] = useState<AbortController | null>(null);

  const handleCancel = () => {
    if (controller) {
      controller.abort();
      setUploading(false);
      setProgress(0);
      message.info('已取消上传');
    }
  };

  const customRequest = async ({ file, onSuccess: antSuccess, onError: antError }: any) => {
    const ctrl = new AbortController();
    setController(ctrl);
    setFileName((file as File).name);
    setProgress(0);
    setUploading(true);

    try {
      await uploadFn(file as File, (pct) => setProgress(pct), ctrl.signal);
      antSuccess?.('ok');
      message.success('上传成功');
      onSuccess?.();
    } catch (err: any) {
      if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') return;
      antError?.(new Error('Upload failed'));
      message.error('上传失败');
    } finally {
      setUploading(false);
      setController(null);
    }
  };

  return (
    <div>
      <Upload accept={accept} maxCount={1} showUploadList={false} customRequest={customRequest}>
        {children || <Button icon={<UploadOutlined />}>{hasFile ? '重新上传' : '上传文件'}</Button>}
      </Upload>
      <UploadProgressBar progress={progress} uploading={uploading} onCancel={handleCancel} file={fileName ? { name: fileName } as any : undefined} />
    </div>
  );
}
