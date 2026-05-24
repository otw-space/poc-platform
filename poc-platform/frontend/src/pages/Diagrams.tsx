import { useCallback, useEffect, useState, useRef } from 'react';
import { Card, Button, Space, Input, Table, Popconfirm, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, PictureOutlined, SaveOutlined } from '@ant-design/icons';
import { DrawIoEmbed } from 'react-drawio';
import { listDiagrams, createDiagram, updateDiagram, deleteDiagram, getDiagram, type Diagram } from '../api/diagrams';
import dayjs from 'dayjs';

export default function Diagrams() {
  const [diagrams, setDiagrams] = useState<Diagram[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [newName, setNewName] = useState('');
  const [xmlData, setXmlData] = useState('');
  const drawioRef = useRef<any>(null);
  const editingIdRef = useRef<string | null>(null);
  const editingNameRef = useRef('');

  const fetch = useCallback(() => {
    setLoading(true);
    listDiagrams().then(r => setDiagrams(r.data)).finally(() => setLoading(false));
  }, []);
  useEffect(() => { fetch(); }, [fetch]);

  const handleNew = async () => {
    const name = newName.trim() || `未命名_${dayjs().format('MMDD_HHmm')}`;
    try {
      const emptyXml = '<mxfile><diagram name="Page-1" id="1"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel></diagram></mxfile>';
      const r = await createDiagram({ name, data: emptyXml });
      setEditingId(r.data.id); setEditingName(r.data.name); setXmlData(emptyXml); setNewName('');
      editingIdRef.current = r.data.id; editingNameRef.current = r.data.name;
      message.success('已创建'); fetch();
    } catch { message.error('创建失败'); }
  };

  const handleSave = async () => {
    if (!editingIdRef.current) return;
    try {
      // Export current diagram XML from draw.io
      if (drawioRef.current) {
        drawioRef.current.exportDiagram({ format: 'xmlsvg' });
      }
      // Small delay to let export callback fire
      await new Promise(r => setTimeout(r, 500));
      await updateDiagram(editingIdRef.current, { name: editingNameRef.current, data: xmlData });
      message.success('已保存'); fetch();
    } catch { message.error('保存失败'); }
  };

  const handleEdit = async (d: Diagram) => {
    try {
      const r = await getDiagram(d.id);
      setXmlData(r.data.data || '');
    } catch { setXmlData(''); }
    setEditingId(d.id); setEditingName(d.name);
    editingIdRef.current = d.id; editingNameRef.current = d.name;
  };

  const handleDelete = async (id: string) => {
    try { await deleteDiagram(id); if (editingId === id) setEditingId(null); message.success('已删除'); fetch(); }
    catch { message.error('删除失败'); }
  };

  // Capture exported XML from draw.io
  const handleExport = useCallback((data: any) => {
    const xml = typeof data === 'string' ? data : data?.data || data?.xml || '';
    if (typeof xml === 'string' && xml.includes('<mxfile')) {
      setXmlData(xml);
    }
  }, []);

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name', ellipsis: true,
      render: (v: string, r: Diagram) => <a onClick={() => handleEdit(r)}>{v}</a> },
    { title: '更新时间', dataIndex: 'updated_at', key: 'updated_at', width: 140,
      render: (v: string) => dayjs(v).format('MM-DD HH:mm') },
    { title: '操作', key: 'actions', width: 100,
      render: (_: any, r: Diagram) => (
        <Space>
          <a onClick={() => handleEdit(r)}><EditOutlined /></a>
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
          title={<Input value={editingName} onChange={e => setEditingName(e.target.value)} style={{ width: 240 }} bordered={false} />}
          extra={
            <Space>
              <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>保存</Button>
              <Button onClick={() => { setEditingId(null); }}>关闭</Button>
            </Space>
          }
          styles={{ body: { padding: 0 } }}
        >
          <div style={{ width: '100%', height: 'calc(100vh - 260px)', minHeight: 600 }}>
            <DrawIoEmbed
              ref={drawioRef}
              xml={xmlData}
              onExport={handleExport}
              urlParameters={{ ui: 'min', spin: true, libraries: false, saveAndExit: false, noSaveBtn: true, noExitBtn: true }}
            />
          </div>
        </Card>
      )}
    </div>
  );
}
