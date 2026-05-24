import { useCallback, useEffect, useState } from 'react';
import { Card, Button, Space, Input, Table, Popconfirm, message } from 'antd';
import { PlusOutlined, DeleteOutlined, PictureOutlined } from '@ant-design/icons';
import { listDiagrams, createDiagram, deleteDiagram, type Diagram } from '../api/diagrams';
import dayjs from 'dayjs';

export default function Diagrams() {
  const [diagrams, setDiagrams] = useState<Diagram[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');

  const fetch = useCallback(() => {
    setLoading(true);
    listDiagrams().then(r => setDiagrams(r.data)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleNew = async () => {
    const name = newName.trim() || `未命名图表_${dayjs().format('MMDD_HHmm')}`;
    try {
      await createDiagram({ name, data: '' });
      setNewName('');
      message.success('已创建');
      fetch();
    } catch { message.error('创建失败'); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDiagram(id);
      message.success('已删除');
      fetch();
    } catch { message.error('删除失败'); }
  };

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name', ellipsis: true },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', width: 160,
      render: (v: string) => dayjs(v).format('MM-DD HH:mm') },
    { title: '操作', key: 'actions', width: 80,
      render: (_: any, r: Diagram) => (
        <Popconfirm title="确认删除？" onConfirm={() => handleDelete(r.id)}>
          <a style={{ color: '#ff4d4f' }}><DeleteOutlined /></a>
        </Popconfirm>
      ),
    },
  ];

  return (
    <Card
      title={<span><PictureOutlined style={{ marginRight: 8 }} />绘图工具</span>}
      extra={
        <Space>
          <Input size="small" placeholder="图表名称" value={newName} onChange={e => setNewName(e.target.value)}
            onPressEnter={handleNew} style={{ width: 160 }} />
          <Button icon={<PlusOutlined />} onClick={handleNew}>新建图表</Button>
        </Space>
      }
    >
      <Table rowKey="id" columns={columns} dataSource={diagrams} loading={loading}
        pagination={false} size="small" locale={{ emptyText: '暂无图表，输入名称后点击"新建图表"' }} />
      <div style={{ marginTop: 16, padding: 40, background: '#fafafa', borderRadius: 8, textAlign: 'center', color: '#999' }}>
        绘图编辑器功能开发中，当前可管理图表列表
      </div>
    </Card>
  );
}
