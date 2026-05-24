import { useCallback, useEffect, useState } from 'react';
import { Card, Button, Space, message, Input, Table, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, PictureOutlined, SaveOutlined } from '@ant-design/icons';
import { ReactFlow, Controls, Background, MiniMap, useNodesState, useEdgesState, addEdge, MarkerType, type Connection } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { listDiagrams, createDiagram, updateDiagram, deleteDiagram, getDiagram, type Diagram } from '../api/diagrams';
import dayjs from 'dayjs';

export default function Diagrams() {
  const [diagrams, setDiagrams] = useState<Diagram[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState('');

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const fetch = useCallback(() => {
    setLoading(true);
    listDiagrams().then(r => setDiagrams(r.data)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleNew = async () => {
    const name = newName.trim() || `未命名_${dayjs().format('MMDD_HHmm')}`;
    try {
      const r = await createDiagram({ name, data: '{"nodes":[],"edges":[]}' });
      setNodes([]); setEdges([]);
      setEditingId(r.data.id); setEditingName(r.data.name); setNewName('');
      message.success('已创建');
      fetch();
    } catch { message.error('创建失败'); }
  };

  const handleSave = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      await updateDiagram(editingId, { name: editingName, data: JSON.stringify({ nodes, edges }) });
      message.success('已保存');
      fetch();
    } catch { message.error('保存失败'); }
    finally { setSaving(false); }
  };

  const handleOpen = async (d: Diagram) => {
    try {
      const r = await getDiagram(d.id);
      const parsed = JSON.parse(r.data.data || '{}');
      setNodes(parsed.nodes || []); setEdges(parsed.edges || []);
      setEditingId(d.id); setEditingName(d.name);
    } catch {
      setNodes([]); setEdges([]);
      setEditingId(d.id); setEditingName(d.name);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDiagram(id);
      if (editingId === id) { setEditingId(null); setNodes([]); setEdges([]); }
      message.success('已删除');
      fetch();
    } catch { message.error('删除失败'); }
  };

  const onConnect = useCallback((conn: Connection) => {
    setEdges(eds => addEdge({ ...conn, markerEnd: { type: MarkerType.ArrowClosed } }, eds));
  }, [setEdges]);

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name', ellipsis: true,
      render: (v: string, r: Diagram) => <a onClick={() => handleOpen(r)}>{v}</a> },
    { title: '更新时间', dataIndex: 'updated_at', key: 'updated_at', width: 140,
      render: (v: string) => dayjs(v).format('MM-DD HH:mm') },
    { title: '操作', key: 'actions', width: 100,
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
            <Input size="small" placeholder="名称" value={newName} onChange={e => setNewName(e.target.value)}
              onPressEnter={handleNew} style={{ width: 140 }} />
            <Button icon={<PlusOutlined />} onClick={handleNew}>新建</Button>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Table rowKey="id" columns={columns} dataSource={diagrams} loading={loading}
          pagination={false} size="small" />
      </Card>

      {editingId && (
        <Card
          title={
            <Input value={editingName} onChange={e => setEditingName(e.target.value)} style={{ width: 240 }}
              bordered={false} onPressEnter={handleSave} />
          }
          extra={
            <Space>
              <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>保存</Button>
              <Button onClick={() => { setEditingId(null); setNodes([]); setEdges([]); }}>关闭</Button>
            </Space>
          }
          styles={{ body: { padding: 0 } }}
        >
          <div style={{ width: '100%', height: 'calc(100vh - 260px)', minHeight: 500 }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              fitView
              deleteKeyCode={['Backspace', 'Delete']}
              snapToGrid
              snapGrid={[16, 16]}
            >
              <Controls />
              <Background gap={16} size={1} />
              <MiniMap pannable zoomable />
            </ReactFlow>
          </div>
          <div style={{ padding: '8px 12px', borderTop: '1px solid #f0f0f0', fontSize: 12, color: '#999' }}>
            拖拽节点间圆点连线 | Delete 删除选中 | 滚轮缩放 | 拖拽移动画布
          </div>
        </Card>
      )}
    </div>
  );
}
