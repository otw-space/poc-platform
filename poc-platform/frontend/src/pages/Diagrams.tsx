import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, Button, Space, message, Input, Table, Popconfirm, Spin } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, PictureOutlined, FullscreenOutlined } from '@ant-design/icons';
import { listDiagrams, createDiagram, updateDiagram, deleteDiagram, getDiagram, type Diagram } from '../api/diagrams';
import { useTheme } from '../context/ThemeContext';
import dayjs from 'dayjs';

export default function Diagrams() {
  const [diagrams, setDiagrams] = useState<Diagram[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { dark } = useTheme();

  const fetch = useCallback(() => {
    setLoading(true);
    listDiagrams().then(r => setDiagrams(r.data)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  // Listen for save events from draw.io iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.length > 0 && e.data[0] === 'export') {
        // draw.io export event - auto-save
        const xml = e.data[1];
        handleAutoSave(xml);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [editingId, editingName]);

  const handleAutoSave = async (xml: string) => {
    if (!editingId) return;
    try {
      await updateDiagram(editingId, { name: editingName, data: xml });
      fetch();
    } catch { /* silent */ }
  };

  const handleNew = async () => {
    const name = newName.trim() || `未命名图表_${dayjs().format('MMDD_HHmm')}`;
    try {
      const r = await createDiagram({ name, data: '' });
      setEditingId(r.data.id);
      setEditingName(r.data.name);
      setNewName('');
      message.success('已创建');
      fetch();
    } catch { message.error('创建失败'); }
  };

  const handleSave = async () => {
    if (!editingId || !iframeRef.current) return;
    setSaving(true);
    try {
      // Request XML export from draw.io
      iframeRef.current.contentWindow?.postMessage(JSON.stringify({ action: 'export', format: 'xmlpng' }), '*');
      message.success('已保存');
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

  // Build draw.io embed URL
  const getDrawioUrl = () => {
    if (!editingId) return '';
    const base = 'https://embed.diagrams.net/';
    const params = new URLSearchParams({
      embed: '1',
      ui: dark ? 'dark' : 'kennedy',
      spin: '1',
      modified: 'unsavedChanges',
      proto: 'json',
    });
    return `${base}?${params.toString()}`;
  };

  // Load diagram XML into iframe
  useEffect(() => {
    if (!editingId || !iframeRef.current) return;
    (async () => {
      try {
        const r = await getDiagram(editingId);
        const xml = r.data.data;
        if (xml && iframeRef.current) {
          // Wait for iframe to load, then send diagram data
          const sendXml = () => {
            iframeRef.current?.contentWindow?.postMessage(
              JSON.stringify({ action: 'load', autosave: 1, xml }), '*'
            );
          };
          // Try immediately, also set a retry
          setTimeout(sendXml, 1000);
          setTimeout(sendXml, 3000);
        }
      } catch { /* diagram might be new */ }
    })();
  }, [editingId]);

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
            <Input
              size="small"
              placeholder="图表名称"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onPressEnter={handleNew}
              style={{ width: 160 }}
            />
            <Button icon={<PlusOutlined />} onClick={handleNew}>新建图表</Button>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Table rowKey="id" columns={columns} dataSource={diagrams} loading={loading}
          pagination={false} size="small" locale={{ emptyText: '暂无图表，输入名称后点击"新建图表"开始' }} />
      </Card>

      {editingId && (
        <Card
          title={
            <Input
              value={editingName}
              onChange={e => setEditingName(e.target.value)}
              style={{ width: 300 }}
              bordered={false}
            />
          }
          extra={
            <Space>
              <Button type="primary" loading={saving} onClick={handleSave}>保存</Button>
              <Button onClick={() => setEditingId(null)}>关闭</Button>
            </Space>
          }
          bodyStyle={{ padding: 0 }}
        >
          <div style={{ width: '100%', height: 'calc(100vh - 280px)', minHeight: 600 }}>
            {editingId && (
              <iframe
                ref={iframeRef}
                src={getDrawioUrl()}
                style={{ width: '100%', height: '100%', border: 'none' }}
                title="绘图编辑器"
              />
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
