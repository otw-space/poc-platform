import { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, Button, Space, message, Input, Table, Popconfirm, Spin, Select, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, PictureOutlined, SaveOutlined } from '@ant-design/icons';
import { ReactFlow, Controls, Background, MiniMap, useNodesState, useEdgesState, addEdge, Connection, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { Node, Edge, NodeTypes } from '@xyflow/react';
import { listDiagrams, createDiagram, updateDiagram, deleteDiagram, getDiagram, type Diagram } from '../api/diagrams';
import dayjs from 'dayjs';

// Custom node types
const nodeTypes: NodeTypes = {
  default: DefaultNode,
  rectangle: RectangleNode,
  diamond: DiamondNode,
  circle: CircleNode,
  parallelogram: ParallelogramNode,
};

function DefaultNode({ data }: any) {
  return <div style={{ padding: '10px 20px', border: '2px solid #1677ff', borderRadius: 6, background: '#e6f4ff', fontSize: 14, fontWeight: 500, textAlign: 'center', minWidth: 80 }}>{data.label}</div>;
}
function RectangleNode({ data }: any) {
  return <div style={{ padding: '10px 24px', border: '2px solid #52c41a', background: '#f6ffed', fontSize: 14, fontWeight: 500, textAlign: 'center', minWidth: 80 }}>{data.label}</div>;
}
function DiamondNode({ data }: any) {
  return <div style={{ width: 100, height: 60, background: '#fff7e6', border: '2px solid #fa8c16', transform: 'rotate(45deg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ transform: 'rotate(-45deg)', fontSize: 13, fontWeight: 500, textAlign: 'center' }}>{data.label}</div></div>;
}
function CircleNode({ data }: any) {
  return <div style={{ width: 80, height: 80, borderRadius: '50%', border: '3px solid #722ed1', background: '#f9f0ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 500, textAlign: 'center' }}>{data.label}</div>;
}
function ParallelogramNode({ data }: any) {
  return <div style={{ padding: '10px 20px', border: '2px solid #13c2c2', background: '#e6fffb', transform: 'skewX(-10deg)', fontSize: 14, fontWeight: 500, textAlign: 'center', minWidth: 80 }}><div style={{ transform: 'skewX(10deg)' }}>{data.label}</div></div>;
}

const nodeOptions = [
  { label: '矩形(流程)', value: 'default' },
  { label: '方框(功能)', value: 'rectangle' },
  { label: '菱形(判断)', value: 'diamond' },
  { label: '圆形(节点)', value: 'circle' },
  { label: '平行四边形(数据)', value: 'parallelogram' },
];

const edgeOptions = [
  { label: '实线箭头', value: 'solid' },
  { label: '虚线箭头', value: 'dashed' },
];

export default function Diagrams() {
  const [diagrams, setDiagrams] = useState<Diagram[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState('');

  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  const [selType, setSelType] = useState('default');

  const fetch = useCallback(() => {
    setLoading(true);
    listDiagrams().then(r => setDiagrams(r.data)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleNew = async () => {
    const name = newName.trim() || `未命名_${dayjs().format('MMDD_HHmm')}`;
    try {
      const r = await createDiagram({ name, data: '{"nodes":[],"edges":[]}' });
      setNodes([]);
      setEdges([]);
      setEditingId(r.data.id);
      setEditingName(r.data.name);
      setNewName('');
      message.success('已创建');
      fetch();
    } catch { message.error('创建失败'); }
  };

  const handleSave = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      const data = JSON.stringify({ nodes, edges });
      await updateDiagram(editingId, { name: editingName, data });
      message.success('已保存');
      fetch();
    } catch { message.error('保存失败'); }
    finally { setSaving(false); }
  };

  const handleOpen = async (d: Diagram) => {
    try {
      const r = await getDiagram(d.id);
      setEditingId(d.id);
      setEditingName(d.name);
      const parsed = JSON.parse(r.data.data || '{}');
      setNodes(parsed.nodes || []);
      setEdges(parsed.edges || []);
    } catch {
      setNodes([]);
      setEdges([]);
      setEditingId(d.id);
      setEditingName(d.name);
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

  const onConnect = useCallback((connection: Connection) => {
    const markerEnd = { type: MarkerType.ArrowClosed, width: 16, height: 16 };
    setEdges(eds => addEdge({ ...connection, markerEnd, animated: false }, eds));
  }, [setEdges]);

  // Double-click canvas to add a new node
  const onDoubleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains('react-flow__pane')) {
      const id = `${Date.now()}`;
      const bounds = (e.target as HTMLElement).closest('.react-flow__renderer')?.getBoundingClientRect();
      const x = bounds ? e.clientX - bounds.left - 200 : Math.random() * 400;
      const y = bounds ? e.clientY - bounds.top - 100 : Math.random() * 200;
      setNodes(nds => [...nds, { id, type: selType, position: { x, y }, data: { label: '新节点' } }]);
    }
  };

  const columns = useMemo(() => [
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
  ], [handleOpen, handleDelete]);

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
            <Space>
              <Input value={editingName} onChange={e => setEditingName(e.target.value)} style={{ width: 240 }}
                bordered={false} onPressEnter={handleSave} />
            </Space>
          }
          extra={
            <Space>
              <Select size="small" value={selType} onChange={setSelType}
                options={nodeOptions} style={{ width: 140 }} placeholder="节点类型" />
              <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>保存</Button>
              <Button onClick={() => { setEditingId(null); setNodes([]); setEdges([]); }}>关闭</Button>
            </Space>
          }
          bodyStyle={{ padding: 0 }}
        >
          <div style={{ width: '100%', height: 'calc(100vh - 260px)', minHeight: 500 }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onDoubleClick={onDoubleClick}
              nodeTypes={nodeTypes}
              fitView
              deleteKeyCode={['Backspace', 'Delete']}
              multiSelectionKeyCode="Shift"
              snapToGrid
              snapGrid={[16, 16]}
            >
              <Controls />
              <Background gap={16} size={1} />
              <MiniMap pannable zoomable />
            </ReactFlow>
          </div>
          <div style={{ padding: '8px 12px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 16, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#999' }}>双击画布添加节点 | 拖拽节点间圆点连线 | Delete 删除选中 | Shift+点击多选</span>
          </div>
        </Card>
      )}
    </div>
  );
}
