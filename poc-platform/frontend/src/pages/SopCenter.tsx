import { useState, useEffect, useCallback, useRef, Component } from 'react';

class ErrorBoundary extends Component<{children: React.ReactNode}, {error: Error | null}> {
  constructor(props: any) { super(props); this.state = {error: null}; }
  static getDerivedStateFromError(error: Error) { return {error}; }
  render() {
    if (this.state.error) return <div style={{padding:20,color:'red',background:'#fff'}}>
      <h3>Component Error: {this.state.error.message}</h3>
      <pre style={{fontSize:12}}>{this.state.error.stack}</pre>
    </div>;
    return this.props.children;
  }
}
import { Card, Tabs, Button, Table, Tag, Modal, Input, Select, Space, Popconfirm, message, Upload, Empty, Form, Dropdown } from 'antd';
import { PlusOutlined, UploadOutlined, DownloadOutlined, ImportOutlined, ExportOutlined, DeleteOutlined, FileTextOutlined, EyeOutlined, DownOutlined, PictureOutlined, EditOutlined } from '@ant-design/icons';
import MDEditor from '@uiw/react-md-editor';
import dayjs from 'dayjs';
import { useTheme } from '../context/ThemeContext';
import UploadProgressBar from '../components/UploadProgressBar';
import {
  listDocuments, createDocument, updateDocument, deleteDocument,
  uploadDocumentFile, getDocumentDownloadUrl, previewDocument, uploadImage,
} from '../api/sops';
import type { SopDocument } from '../api/sops';
import {
  listTestCases, createTestCase, updateTestCase, deleteTestCase,
  importTestCases, exportTestCases,
  listCategories, createCategory, updateCategory, deleteCategory,
} from '../api/sops';
import type { TestCase, TestCaseCategory } from '../api/sops';
import {
  listScripts, createScript, deleteScript, getScriptDownloadUrl,
} from '../api/sops';
import type { ScriptFile } from '../api/sops';
const PRIORITY_COLORS: Record<string, string> = { P0: 'red', P1: 'orange', P2: 'blue', P3: 'default' };
const STATUS_COLORS: Record<string, string> = { draft: 'default', ready: 'green', deprecated: '#999' };
const STATUS_LABELS: Record<string, string> = { draft: '草稿', ready: '就绪', deprecated: '废弃' };

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function downloadBlob(data: Blob, filename: string) {
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Markdown Editor Tab (SOP / Plan) ──

function EditorTab({ category, title }: { category: string; title: string }) {
  const [docs, setDocs] = useState<SopDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [editName, setEditName] = useState('');
  const [editing, setEditing] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newName, setNewName] = useState('');

  const fetch = useCallback(() => {
    setLoading(true);
    listDocuments(category).then(r => setDocs(r.data)).finally(() => setLoading(false));
  }, [category]);

  useEffect(() => { fetch(); }, [fetch]);

  const selected = docs.find(d => d.id === selectedId);

  useEffect(() => {
    if (selected) { setContent(selected.content || ''); setEditName(selected.name); }
  }, [selectedId, docs]);

  const handleSave = async () => {
    if (!selectedId) return;
    await updateDocument(selectedId, { name: editName, content });
    message.success('已保存');
    setEditing(false);
    fetch();
  };

  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Insert markdown text at cursor position in the editor
  const insertAtCursor = useCallback((md: string) => {
    const el = editorRef.current;
    if (!el) return;
    const textarea = el.querySelector('textarea');
    if (!textarea) return;
    const start = textarea.selectionStart ?? content.length;
    const end = textarea.selectionEnd ?? content.length;
    const before = content.slice(0, start);
    const after = content.slice(end);
    const insertion = (before.endsWith('\n') || before.length === 0 ? '' : '\n') + md + (after.startsWith('\n') || after.length === 0 ? '' : '\n');
    const newContent = before + insertion + after;
    setContent(newContent);
    // Restore cursor after insertion
    requestAnimationFrame(() => {
      textarea.focus();
      const newPos = start + insertion.length;
      textarea.setSelectionRange(newPos, newPos);
    });
  }, [content]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedId) return;
    try {
      const r = await uploadImage(selectedId, file);
      const url = r.data.url;
      const md = `![${file.name}](${url})`;
      insertAtCursor(md);
      message.success('图片已插入');
    } catch {
      message.error('图片上传失败');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle paste events for images
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items || !selectedId) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;
        try {
          const r = await uploadImage(selectedId, file);
          const url = r.data.url;
          const md = `![image](${url})`;
          insertAtCursor(md);
          message.success('图片已粘贴');
        } catch {
          message.error('图片上传失败');
        }
        break;
      }
    }
  }, [selectedId, insertAtCursor]);

  const handleExport = (format: string) => {
    if (!selectedId) return;
    window.open(`/api/sops/documents/${selectedId}/export?format=${format}`, '_blank');
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createDocument({ category, name: newName.trim() });
    setCreateModalOpen(false);
    setNewName('');
    message.success('已创建');
    fetch();
  };

  const exportItems = [
    { key: 'md', label: '导出 Markdown (.md)', icon: <DownloadOutlined /> },
    { key: 'docx', label: '导出 Word (.docx)', icon: <DownloadOutlined /> },
    { key: 'pdf', label: '导出 PDF', icon: <DownloadOutlined /> },
  ];

  return (
    <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 200px)' }}>
      <div style={{ width: 240, borderRight: '1px solid #f0f0f0', overflow: 'auto', flexShrink: 0 }}>
        <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong>{title}</strong>
          <Button size="small" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)} />
        </div>
        {docs.map(d => (
          <div
            key={d.id}
            onClick={() => { setSelectedId(d.id); setEditing(false); }}
            style={{
              padding: '8px 12px', cursor: 'pointer',
              background: selectedId === d.id ? 'var(--active-bg)' : 'transparent',
              borderBottom: '1px solid var(--border-color)',
            }}
          >
            <div style={{ fontWeight: 500, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {d.name}
            </div>
            <div style={{ fontSize: 12, color: '#999' }}>{dayjs(d.updated_at).format('MM-DD HH:mm')}</div>
          </div>
        ))}
        {docs.length === 0 && <Empty description="暂无文档" style={{ marginTop: 40 }} />}
      </div>

      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {selected ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {editing ? (
                <Space>
                  <Input value={editName} onChange={e => setEditName(e.target.value)}
                    style={{ width: 300 }} autoFocus onPressEnter={handleSave} />
                  <Button type="primary" size="small" onClick={handleSave}>保存</Button>
                  <Button size="small" onClick={() => { setEditName(selected.name); setEditing(false); }}>取消</Button>
                </Space>
              ) : (
                <Space size={4}>
                  <span style={{ fontWeight: 600, fontSize: 16 }}>{selected.name}</span>
                  <Button type="text" size="small" icon={<EditOutlined />}
                    style={{ color: '#999', fontSize: 12 }}
                    onClick={() => { setEditName(selected.name); setEditing(true); }} />
                </Space>
              )}
              <Space>
                <input type="file" ref={fileInputRef} style={{ display: 'none' }}
                  accept="image/*" onChange={handleImageUpload} />
                <Button size="small" icon={<PictureOutlined />}
                  onClick={() => fileInputRef.current?.click()}>
                  图片
                </Button>
                <Dropdown menu={{ items: exportItems, onClick: ({ key }) => handleExport(key) }}>
                  <Button size="small" icon={<DownOutlined />}>
                    导出
                  </Button>
                </Dropdown>
                <Popconfirm title="确认删除？" onConfirm={async () => {
                  await deleteDocument(selected.id);
                  setSelectedId(null);
                  message.success('已删除');
                  fetch();
                }}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            </div>
            <div data-color-mode="light" style={{ flex: 1 }} onPaste={handlePaste} ref={editorRef}>
              <MDEditor
                value={content}
                onChange={v => { setContent(v || ''); if (!editing) setEditing(true); }}
                preview="live"
                height={Math.max(400, (typeof window !== 'undefined' ? window.innerHeight : 800) - 400)}
                visibleDragbar={false}
              />
            </div>
          </>
        ) : (
          <Empty description="选择一个文档" style={{ marginTop: 100 }} />
        )}
      </div>

      <Modal title="新建文档" open={createModalOpen} onOk={handleCreate} onCancel={() => setCreateModalOpen(false)} destroyOnClose>
        <Input placeholder="文档名称" value={newName} onChange={e => setNewName(e.target.value)} onPressEnter={handleCreate} />
      </Modal>
    </div>
  );
}

// ── Report Tab (table layout like scripts, upload only, PPT→PDF preview) ──

function ReportTab() {
  const [docs, setDocs] = useState<SopDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [reportName, setReportName] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [upProgress, setUpProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [upCtrl, setUpCtrl] = useState<AbortController | null>(null);

  const fetch = useCallback(() => {
    setLoading(true);
    listDocuments('report').then(r => setDocs(r.data)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const uploadFile = async (file: File, docId: string) => {
    const ctrl = new AbortController();
    setUpCtrl(ctrl); setUpProgress(0); setUploading(true);
    try { await uploadDocumentFile(docId, file, (pct) => setUpProgress(pct), ctrl.signal); }
    finally { setUploading(false); setUpCtrl(null); }
  };

  const handleUpload = async (file: File) => {
    if (!reportName.trim()) { message.warning('请输入报告名称'); return; }
    const r = await createDocument({ category: 'report', name: reportName.trim() });
    await uploadFile(file, r.data.id);
    message.success('上传成功');
    setUploadOpen(false);
    setReportName('');
    fetch();
  };

  const handleReplace = async (id: string, file: File) => {
    await uploadFile(file, id);
    message.success('文件已更新');
    fetch();
  };

  const handleDownload = async (record: SopDocument) => {
    if (!record.file_json) return;
    const r = await getDocumentDownloadUrl(record.id);
    const disposition = r.headers['content-disposition'] || '';
    const match = disposition.match(/filename\*=UTF-8''(.+)/);
    downloadBlob(r.data, match ? decodeURIComponent(match[1]) : record.file_json.original_filename);
  };

  const handlePreview = async (id: string) => {
    try {
      const r = await previewDocument(id);
      const url = URL.createObjectURL(r.data);
      setPreviewUrl(url);
      setPreviewOpen(true);
    } catch {
      message.error('预览不可用');
    }
  };

  const columns = [
    { title: '报告名称', dataIndex: 'name', key: 'name', render: (v: string) => <strong>{v}</strong> },
    {
      title: '文件', key: 'file', width: 220,
      render: (_: any, r: SopDocument) => r.file_json ? (
        <span style={{ fontSize: 13 }}>{r.file_json.original_filename} ({formatSize(r.file_json.size)})</span>
      ) : <span style={{ color: '#999' }}>未上传</span>,
    },
    {
      title: '更新时间', dataIndex: 'updated_at', key: 'updated_at', width: 160,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作', key: 'actions', width: 300,
      render: (_: any, r: SopDocument) => (
        <Space>
          {!uploading && (
            <Upload accept=".ppt,.pptx,.pdf" showUploadList={false}
              customRequest={({ file }) => handleReplace(r.id, file as File)}>
              <Button type="link" size="small" icon={<UploadOutlined />}>替换</Button>
            </Upload>
          )}
          {r.file_json && (
            <>
              <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handlePreview(r.id)}>预览</Button>
              <Button type="link" size="small" icon={<DownloadOutlined />} onClick={() => handleDownload(r)}>下载</Button>
            </>
          )}
          <Popconfirm title="确认删除？" onConfirm={async () => { await deleteDocument(r.id); fetch(); message.success('已删除'); }}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<UploadOutlined />} onClick={() => setUploadOpen(true)}>上传报告</Button>
      </Space>

      <Table rowKey="id" columns={columns} dataSource={docs} loading={loading} pagination={false} />

      <Modal title="上传报告" open={uploadOpen} onCancel={() => { if (!uploading) setUploadOpen(false); }} footer={null} destroyOnClose>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Input placeholder="报告名称" value={reportName} onChange={e => setReportName(e.target.value)} disabled={uploading} />
          {!uploading && (
            <Upload accept=".ppt,.pptx,.pdf" showUploadList={false}
              customRequest={({ file }) => handleUpload(file as File)}>
              <Button icon={<UploadOutlined />}>选择 PPT 或 PDF 文件</Button>
            </Upload>
          )}
          <UploadProgressBar progress={upProgress} uploading={uploading} onCancel={() => { upCtrl?.abort(); setUploading(false); message.info('已取消上传'); }} />
        </Space>
      </Modal>

      <Modal
        title="预览报告"
        open={previewOpen}
        onCancel={() => { setPreviewOpen(false); URL.revokeObjectURL(previewUrl); }}
        footer={null}
        width="90%"
      >
        {previewUrl && <iframe src={previewUrl} style={{ width: '100%', height: '80vh', border: 'none' }} />}
      </Modal>
    </div>
  );
}

// ── Test Case Tab ──

function TestCaseTab() {
  const [cases, setCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [allTotal, setAllTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<TestCase | null>(null);
  const [form] = Form.useForm();
  const [categories, setCategories] = useState<TestCaseCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catEditId, setCatEditId] = useState<string | null>(null);
  const [catName, setCatName] = useState('');
  const [catSaving, setCatSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trigger, setTrigger] = useState(0);
  const [upProgress, setUpProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [upCtrl, setUpCtrl] = useState<AbortController | null>(null);

  const refreshCats = () => {
    listCategories().then(r => setCategories(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  };

  useEffect(() => { refreshCats(); }, []);

  // Fetch all total (unfiltered) once
  useEffect(() => {
    listTestCases({ page: 1, page_size: 1 }).then(r => setAllTotal(r.data.total)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, any> = { page, page_size: 100 };
    if (activeCategory) params.category_id = activeCategory;
    listTestCases(params)
      .then(r => { setCases(r.data.items); setTotal(r.data.total); })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, [page, activeCategory, trigger]);

  const handleCatSave = async () => {
    if (!catName.trim() || catSaving) return;
    setCatSaving(true);
    try {
      if (catEditId) await updateCategory(catEditId, catName.trim());
      else await createCategory(catName.trim());
      setCatModalOpen(false); setCatEditId(null); setCatName('');
      refreshCats();
    } catch (e: any) {
      const msg = e?.response?.data?.detail || '';
      if (msg.includes('already exists')) {
        Modal.info({ title: '提示', content: `客户端「${catName.trim()}」已存在，无需重复创建。` });
      } else {
        message.warning(msg || '操作失败');
      }
    }
    finally { setCatSaving(false); }
  };

  if (error) return <div style={{padding:20,color:'red'}}>Error: {error}</div>;

  const handleSave = async () => {
    const values = await form.validateFields();
    if (editingCase) {
      await updateTestCase(editingCase.id, values);
      message.success('已更新');
    } else {
      await createTestCase(values);
      message.success('已创建');
    }
    setModalOpen(false);
    setEditingCase(null);
    form.resetFields();
    setTrigger(t => t + 1);
    refreshCats();
    listTestCases({ page: 1, page_size: 1 }).then(r => setAllTotal(r.data.total));
  };

  const handleExport = async () => {
    const r = await exportTestCases();
    downloadBlob(r.data, `测试用例_${dayjs().format('YYYY-MM-DD')}.xlsx`);
    message.success('导出成功');
  };

  const handleImport = async (file: File) => {
    const ctrl = new AbortController();
    setUpCtrl(ctrl); setUpProgress(0); setUploading(true);
    try {
      const r = await importTestCases(file, (pct) => setUpProgress(pct), ctrl.signal);
      message.success(`导入成功，共 ${r.data.count} 条`);
      setTrigger(t => t + 1);
      refreshCats();
      listTestCases({ page: 1, page_size: 1 }).then(r => setAllTotal(r.data.total));
    } catch (err: any) {
      if (err?.code !== 'ERR_CANCELED' && err?.name !== 'CanceledError') message.error('导入失败');
    } finally {
      setUploading(false);
      setUpCtrl(null);
    }
  };

  const columns = [
    { title: '标题', dataIndex: 'title', key: 'title', width: 180, ellipsis: true },
    { title: '客户端', key: 'category', width: 100,
      render: (_: any, r: TestCase) => {
        const cat = categories.find(c => c.id === r.category_id);
        return cat ? <Tag color="blue">{cat.name}</Tag> : <span style={{color:'#999'}}>-</span>;
      },
    },
    { title: '模块', dataIndex: 'module', key: 'module', width: 100 },
    {
      title: '优先级', dataIndex: 'priority', key: 'priority', width: 80,
      render: (v: string) => <Tag color={PRIORITY_COLORS[v] || 'default'}>{v}</Tag>,
    },
    { title: '前置条件', dataIndex: 'precondition', key: 'precondition', width: 150, ellipsis: true },
    { title: '测试步骤', dataIndex: 'steps', key: 'steps', width: 200, ellipsis: true },
    { title: '预期结果', dataIndex: 'expected_result', key: 'expected_result', width: 200, ellipsis: true },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 80,
      render: (v: string) => <Tag color={STATUS_COLORS[v] || 'default'}>{STATUS_LABELS[v] || v}</Tag>,
    },
    { title: '备注', dataIndex: 'remarks', key: 'remarks', width: 120, ellipsis: true },
    {
      title: '操作', key: 'actions', width: 120, fixed: 'right' as const,
      render: (_: any, record: TestCase) => (
        <Space>
          <a onClick={() => {
            setEditingCase(record);
            form.setFieldsValue(record);
            setModalOpen(true);
          }}>编辑</a>
          <Popconfirm title="确认删除？" onConfirm={async () => { await deleteTestCase(record.id); setTrigger(t => t + 1); refreshCats(); listTestCases({ page: 1, page_size: 1 }).then(r => setAllTotal(r.data.total)); message.success('已删除'); }}>
            <a style={{ color: '#ff4d4f' }}>删除</a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 200px)' }}>
      {/* Category sidebar */}
      <div style={{ width: 180, borderRight: '1px solid #f0f0f0', overflow: 'auto', flexShrink: 0 }}>
        <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong>客户端</strong>
          <Button size="small" icon={<PlusOutlined />} onClick={() => { setCatEditId(null); setCatName(''); setCatModalOpen(true); }} />
        </div>
        <div
          onClick={() => setActiveCategory(null)}
          style={{ padding: '6px 12px', cursor: 'pointer', background: !activeCategory ? 'var(--active-bg)' : 'transparent', fontWeight: !activeCategory ? 600 : 400 }}>
          全部 ({allTotal})
        </div>
        {(Array.isArray(categories) ? categories : []).map(c => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '6px 12px', cursor: 'pointer', background: activeCategory === c.id ? 'var(--active-bg)' : 'transparent',
            fontWeight: activeCategory === c.id ? 600 : 400 }}>
            <span onClick={() => setActiveCategory(c.id)} style={{ flex: 1 }}>{c.name} ({c.case_count})</span>
            <Space size={0}>
              <Button type="text" size="small" onClick={() => { setCatEditId(c.id); setCatName(c.name); setCatModalOpen(true); }}
                icon={<EditOutlined style={{ fontSize: 11 }} />} />
              <Popconfirm title="删除此分类？用例不会删除" onConfirm={async () => { await deleteCategory(c.id); refreshCats(); }}>
                <Button type="text" size="small" danger icon={<DeleteOutlined style={{ fontSize: 11 }} />} />
              </Popconfirm>
            </Space>
          </div>
        ))}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <Space style={{ marginBottom: 16 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingCase(null); form.resetFields(); form.setFieldsValue({ category_id: activeCategory }); setModalOpen(true); }}>
            新增用例
          </Button>
          {!uploading && (
            <Upload accept=".xlsx,.xls" showUploadList={false} customRequest={({ file }) => handleImport(file as File)}>
              <Button icon={<ImportOutlined />}>导入 Excel</Button>
            </Upload>
          )}
          <UploadProgressBar progress={upProgress} uploading={uploading} onCancel={() => { upCtrl?.abort(); setUploading(false); message.info('已取消上传'); }} />
          <Button icon={<ExportOutlined />} onClick={handleExport}>导出 Excel</Button>
        </Space>

        <Table
          rowKey="id"
          columns={columns}
          dataSource={cases}
          loading={loading}
          scroll={{ x: 1400 }}
          pagination={{ current: page, total, pageSize: 100, showTotal: t => `共 ${t} 条`, onChange: setPage }}
        />

        <Modal
          title={editingCase ? '编辑用例' : '新增用例'}
          open={modalOpen}
          onOk={handleSave}
          onCancel={() => { setModalOpen(false); setEditingCase(null); form.resetFields(); }}
          width={640}
          destroyOnClose
        >
          <Form form={form} layout="vertical">
            <Form.Item name="title" label="标题" rules={[{ required: true }]}>
              <Input placeholder="用例标题" />
            </Form.Item>
            <Form.Item name="category_id" label="所属客户端">
              <Select allowClear placeholder="选择分类" style={{ width: '100%' }}
                options={categories.map(c => ({ label: c.name, value: c.id }))} />
            </Form.Item>
            <Form.Item name="module" label="模块">
              <Input placeholder="所属模块" />
            </Form.Item>
            <Space>
              <Form.Item name="priority" label="优先级" initialValue="P2">
                <Select style={{ width: 120 }} options={[
                  { label: 'P0', value: 'P0' }, { label: 'P1', value: 'P1' },
                  { label: 'P2', value: 'P2' }, { label: 'P3', value: 'P3' },
                ]} />
              </Form.Item>
              <Form.Item name="status" label="状态" initialValue="draft">
                <Select style={{ width: 120 }} options={[
                  { label: '草稿', value: 'draft' }, { label: '就绪', value: 'ready' },
                  { label: '废弃', value: 'deprecated' },
                ]} />
              </Form.Item>
            </Space>
            <Form.Item name="precondition" label="前置条件">
              <Input.TextArea rows={2} />
            </Form.Item>
            <Form.Item name="steps" label="测试步骤">
              <Input.TextArea rows={3} />
            </Form.Item>
            <Form.Item name="expected_result" label="预期结果">
              <Input.TextArea rows={3} />
            </Form.Item>
            <Form.Item name="remarks" label="备注">
              <Input.TextArea rows={2} />
            </Form.Item>
          </Form>
        </Modal>

        <Modal title={catEditId ? '编辑分类' : '新建分类'} open={catModalOpen}
          onOk={handleCatSave} onCancel={() => setCatModalOpen(false)} destroyOnClose
          confirmLoading={catSaving}>
          <Input placeholder="分类名称" value={catName} onChange={e => setCatName(e.target.value)} onPressEnter={handleCatSave} />
        </Modal>
      </div>
    </div>
  );
}

// ── Script Tab ──

function ScriptTab() {
  const [scripts, setScripts] = useState<ScriptFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [scriptName, setScriptName] = useState('');
  const [scriptDesc, setScriptDesc] = useState('');
  const [upProgress, setUpProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [upCtrl, setUpCtrl] = useState<AbortController | null>(null);

  const fetch = useCallback(() => {
    setLoading(true);
    listScripts().then(r => setScripts(r.data)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleUpload = async (file: File) => {
    if (!scriptName.trim()) { message.warning('请输入脚本名称'); return; }
    const ctrl = new AbortController();
    setUpCtrl(ctrl); setUpProgress(0); setUploading(true);
    try {
      await createScript(scriptName.trim(), scriptDesc || undefined, file, (pct) => setUpProgress(pct), ctrl.signal);
      message.success('上传成功');
      setUploadOpen(false);
      setScriptName('');
      setScriptDesc('');
      fetch();
    } catch (err: any) {
      if (err?.code !== 'ERR_CANCELED' && err?.name !== 'CanceledError') message.error('上传失败');
    } finally {
      setUploading(false);
      setUpCtrl(null);
    }
  };

  const handleDownload = async (id: string) => {
    const r = await getScriptDownloadUrl(id);
    const disposition = r.headers['content-disposition'] || '';
    const match = disposition.match(/filename\*=UTF-8''(.+)/);
    downloadBlob(r.data, match ? decodeURIComponent(match[1]) : 'script.zip');
  };

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: '文件大小', key: 'size', width: 100,
      render: (_: any, r: ScriptFile) => r.file_json ? formatSize(r.file_json.size) : '-',
    },
    {
      title: '上传时间', dataIndex: 'created_at', key: 'created_at', width: 160,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作', key: 'actions', width: 150,
      render: (_: any, r: ScriptFile) => (
        <Space>
          {r.file_json && <Button type="link" size="small" icon={<DownloadOutlined />} onClick={() => handleDownload(r.id)}>下载</Button>}
          <Popconfirm title="确认删除？" onConfirm={async () => { await deleteScript(r.id); fetch(); message.success('已删除'); }}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<UploadOutlined />} onClick={() => setUploadOpen(true)}>上传脚本</Button>
      </Space>

      <Table rowKey="id" columns={columns} dataSource={scripts} loading={loading} pagination={false} />

      <Modal title="上传脚本" open={uploadOpen} onCancel={() => { if (!uploading) setUploadOpen(false); }} footer={null} destroyOnClose>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Input placeholder="脚本名称" value={scriptName} onChange={e => setScriptName(e.target.value)} disabled={uploading} />
          <Input placeholder="描述（可选）" value={scriptDesc} onChange={e => setScriptDesc(e.target.value)} disabled={uploading} />
          {!uploading && (
            <Upload accept=".zip" showUploadList={false} customRequest={({ file }) => handleUpload(file as File)}>
              <Button icon={<UploadOutlined />}>选择 ZIP 文件</Button>
            </Upload>
          )}
          <UploadProgressBar progress={upProgress} uploading={uploading} onCancel={() => { upCtrl?.abort(); setUploading(false); message.info('已取消上传'); }} />
        </Space>
      </Modal>
    </div>
  );
}

// ── Main SopCenter ──

export default function SopCenter() {
  const tabItems = [
    { key: 'sop', label: 'PoC实施SOP', children: <EditorTab category="sop" title="PoC 实施 SOP" /> },
    { key: 'plan', label: 'PoC实施方案', children: <EditorTab category="plan" title="PoC 实施方案" /> },
    { key: 'report', label: 'PoC汇报报告', children: <ReportTab /> },
    { key: 'testcase', label: 'PoC案例库', children: <ErrorBoundary><TestCaseTab /></ErrorBoundary> },
    { key: 'script', label: 'PoC脚本库', children: <ScriptTab /> },
  ];

  return (
    <Card title="SOP 中心">
      <Tabs items={tabItems} />
    </Card>
  );
}
