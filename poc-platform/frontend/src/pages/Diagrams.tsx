import { useEffect, useState, useCallback } from 'react';
import { Card, Button, Space, message, Modal, Input, Table, Popconfirm, Spin } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, PictureOutlined } from '@ant-design/icons';
import { Excalidraw } from '@excalidraw/excalidraw';
import { listDiagrams, createDiagram, updateDiagram, deleteDiagram, type Diagram } from '../api/diagrams';
import { useTheme } from '../context/ThemeContext';
import dayjs from 'dayjs';

export default function Diagrams() {
  const [diagrams, setDiagrams] = useState<Diagram[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [saving, setSaving] = useState(false);
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const { dark } = useTheme();

  const fetch = useCallback(() => {
    setLoading(true);
    listDiagrams().then(r => setDiagrams(r.data)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleNew = async () => {
    const name = `未命名图表_${dayjs().format('MMDD_HHmm')}`;
    try {
      const r = await createDiagram({ name, data: '{"type":"excalidraw","version":2,"source":"","elements":[],"appState":{"viewBackgroundColor":"#ffffff"}}' });
      setEditingId(r.data.id);
      setEditingName(r.data.name);
      message.success('已创建');
      fetch();
    } catch { message.error('创建失败'); }
  };

  const handleSave = async () => {
    if (!editingId || !excalidrawAPI) return;
    setSaving(true);
    try {
      const elements = excalidrawAPI.getSceneElements();
      const appState = excalidrawAPI.getAppState();
      const data = JSON.stringify({ type: 'excalidraw', version: 2, source: '', elements, appState });
      await updateDiagram(editingId, { name: editingName, data });
      message.success('已保存');
      fetch();
    } catch { message.error('保存失败'); }
    finally { setSaving(false); }
  };

  const handleOpen = async (d: Diagram) => {
    setEditingId(d.id);
    setEditingName(d.name);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDiagram(id);
      if (editingId === id) { setEditingId(null); setEditingName(''); }
      message.success('已删除');
      fetch();
    } catch { message.error('删除失败'); }
  };

  // Parse initial data for excalidraw
  const getInitialData = (d: Diagram) => {
    try {
      const parsed = JSON.parse(d.data || '{}');
      return { elements: parsed.elements || [], appState: { ...parsed.appState, viewBackgroundColor: dark ? '#1e1e1e' : '#ffffff' } };
    } catch {
      return { elements: [], appState: { viewBackgroundColor: dark ? '#1e1e1e' : '#ffffff' } };
    }
  };

  const activeDiagram = diagrams.find(d => d.id === editingId);

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name', ellipsis: true,
      render: (v: string, r: Diagram) => <a onClick={() => handleOpen(r)}>{v}</a> },
    { title: '更新时间', dataIndex: 'updated_at', key: 'updated_at', width: 160,
      render: (v: string) => dayjs(v).format('MM-DD HH:mm') },
    { title: '操作', key: 'actions', width: 120,
      render: (_: any, r: Diagram) => (
        <Space>
          <a onClick={() => handleOpen(r)}><EditOutlined /></a>
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(r.id)}>
            <a style={{ color: '#ff4d4f' }}><DeleteOutlined /></a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title={<span><PictureOutlined style={{ marginRight: 8 }} />绘图工具</span>}
        extra={
          <Space>
            {editingId && (
              <Button type="primary" loading={saving} onClick={handleSave}>保存</Button>
            )}
            <Button icon={<PlusOutlined />} onClick={handleNew}>新建图表</Button>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Table rowKey="id" columns={columns} dataSource={diagrams} loading={loading}
          pagination={false} size="small" locale={{ emptyText: '暂无图表，点击右上角"新建图表"开始' }} />
      </Card>

      {editingId && activeDiagram && (
        <Card
          title={
            <Input
              value={editingName}
              onChange={e => setEditingName(e.target.value)}
              style={{ width: 300 }}
              bordered={false}
              onBlur={handleSave}
            />
          }
          extra={
            <Button onClick={() => setEditingId(null)}>关闭</Button>
          }
          bodyStyle={{ padding: 0 }}
        >
          <div style={{ height: 650 }}>
            <Excalidraw
              initialData={getInitialData(activeDiagram)}
              excalidrawAPI={api => setExcalidrawAPI(api)}
              theme={dark ? 'dark' : 'light'}
            />
          </div>
        </Card>
      )}
    </div>
  );
}
