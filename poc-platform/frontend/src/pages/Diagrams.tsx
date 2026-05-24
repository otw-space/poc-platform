import { useCallback, useEffect, useState, useRef } from 'react';
import { Card, Button, Space, Input, Table, Popconfirm, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, PictureOutlined, CopyOutlined } from '@ant-design/icons';
import { DrawIoEmbed } from 'react-drawio';
import { listDiagrams, createDiagram, updateDiagram, deleteDiagram, copyDiagram, getDiagram, type Diagram } from '../api/diagrams';
import dayjs from 'dayjs';

export default function Diagrams() {
  const [diagrams, setDiagrams] = useState<Diagram[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [newName, setNewName] = useState('');
  const [xmlData, setXmlData] = useState('');

  const editingIdRef = useRef<string | null>(null);
  const editingNameRef = useRef('');
  const drawioRef = useRef<any>(null);
  const xmlRef = useRef('');

  const fetch = useCallback(() => {
    setLoading(true);
    listDiagrams().then(r => setDiagrams(r.data)).finally(() => setLoading(false));
  }, []);
  useEffect(() => { fetch(); }, [fetch]);

  const doSave = async (id: string, name: string, xml: string) => {
    if (!id || !xml) { message.warning('暂无数据可保存'); return; }
    try {
      await updateDiagram(id, { name, data: xml });
      fetch();
    } catch (e) { message.error('保存失败'); }
  };

  const handleNew = async () => {
    const name = newName.trim() || `未命名_${dayjs().format('MMDD_HHmm')}`;
    try {
      const emptyXml = '<mxfile host="app" modified="2024-01-01T00:00:00.000Z" agent="poc"><diagram name="Page-1" id="1"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel></diagram></mxfile>';
      const r = await createDiagram({ name, data: emptyXml });
      setEditingId(r.data.id); setEditingName(r.data.name); setXmlData(emptyXml); setNewName('');
      editingIdRef.current = r.data.id; editingNameRef.current = r.data.name; xmlRef.current = emptyXml;
      message.success('已创建'); fetch();
    } catch { message.error('创建失败'); }
  };

  const handleEdit = async (d: Diagram) => {
    try {
      const r = await getDiagram(d.id);
      const xml = r.data.data || '';
      setXmlData(xml); xmlRef.current = xml;
    } catch { setXmlData(''); xmlRef.current = ''; }
    setEditingId(d.id); setEditingName(d.name);
    editingIdRef.current = d.id; editingNameRef.current = d.name;
  };

  const handleCopy = async (id: string) => {
    try { await copyDiagram(id); message.success('已复制'); fetch(); }
    catch { message.error('复制失败'); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteDiagram(id); if (editingId === id) setEditingId(null); message.success('已删除'); fetch(); }
    catch { message.error('删除失败'); }
  };

  // draw.io autosave — fires on every edit, keeps xmlRef current (don't update state!)
  const handleAutoSave = (e: any) => {
    const xml = e.xml || e.data || '';
    if (xml && xml.includes('<mxfile')) {
      xmlRef.current = xml;
    }
  };

  // draw.io export event
  const handleExport = (e: any) => {
    const xml = e.data || e.xml || '';
    if (xml && xml.includes('<mxfile')) {
      xmlRef.current = xml;
    }
  };

  // Manual save — uses latest autosaved data (always current)
  const handleSave = async () => {
    if (!editingIdRef.current) return;
    const id = editingIdRef.current;
    const name = editingNameRef.current;
    if (xmlRef.current) {
      await doSave(id, name, xmlRef.current);
      message.success('已保存');
    } else if (xmlData) {
      await doSave(id, name, xmlData);
      message.success('已保存');
    } else {
      message.warning('请先在画布中绘制内容');
    }
  };

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name', ellipsis: true,
      render: (v: string, r: Diagram) => <a onClick={() => handleEdit(r)}>{v}</a> },
    { title: '更新时间', dataIndex: 'updated_at', key: 'updated_at', width: 140,
      render: (v: string) => dayjs(v).format('MM-DD HH:mm') },
    { title: '操作', key: 'actions', width: 140,
      render: (_: any, r: Diagram) => (
        <Space>
          <a onClick={() => handleEdit(r)}><EditOutlined /></a>
          <a onClick={() => handleCopy(r.id)}><CopyOutlined /></a>
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
          title={<Input value={editingName} onChange={e => { setEditingName(e.target.value); editingNameRef.current = e.target.value; }}
            style={{ width: 240 }} bordered={false} />}
          extra={
            <Space>
              <Button type="primary" onClick={handleSave}>保存</Button>
              <Button onClick={() => { setEditingId(null); }}>关闭</Button>
            </Space>
          }
          styles={{ body: { padding: 0 } }}
        >
          <div style={{ width: '100%', height: 'calc(100vh - 260px)', minHeight: 600 }}
            onMouseDown={() => {
              // Click inside container → focus iframe for keyboard shortcuts
              const iframe = document.querySelector('iframe[title="draw.io embed"]') as HTMLIFrameElement;
              iframe?.focus();
            }}
          >
            <DrawIoEmbed
              key={editingId}
              ref={drawioRef}
              xml={xmlData}
              autosave
              onAutoSave={handleAutoSave}
              onExport={handleExport}
              urlParameters={{ spin: true, libraries: false, noSaveBtn: true, noExitBtn: true }}
            />
          </div>
        </Card>
      )}
    </div>
  );
}
