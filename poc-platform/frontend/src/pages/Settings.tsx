import { useEffect, useState } from 'react';
import { Card, Tabs, Table, Button, Input, Space, Popconfirm, message, Modal, Select, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined, ClearOutlined } from '@ant-design/icons';
import { getOptions, createOption, updateOption, deleteOption, type PocOption } from '../api/options';
import { getUsers, createUser, resetPassword, toggleActive } from '../api/users';
import type { User } from '../api/auth';
import { getRoles, createRole, updateRole, deleteRole, type Role, type RolePermission } from '../api/roles';
import client from '../api/client';
import dayjs from 'dayjs';

const CATEGORIES = [
  { key: 'poc_type', label: 'PoC类型' },
  { key: 'impl_method', label: '实施方式' },
  { key: 'status', label: '状态' },
];

export default function Settings() {
  return (
    <Card title="系统设置">
      <Tabs
        items={[
          { key: 'options', label: '下拉选项管理', children: <OptionsManager /> },
          { key: 'users', label: '用户管理', children: <UsersManager /> },
          { key: 'roles', label: '角色管理', children: <RoleManager /> },
          { key: 'audit', label: '操作日志', children: <AuditLogs /> },
        ]}
      />
    </Card>
  );
}

function OptionsManager() {
  const [activeCat, setActiveCat] = useState('poc_type');
  const [options, setOptions] = useState<PocOption[]>([]);
  const [newLabel, setNewLabel] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingLabel, setEditingLabel] = useState('');

  const fetch = () => {
    getOptions(activeCat).then((r) => setOptions(r.data));
  };

  useEffect(() => { fetch(); }, [activeCat]);

  const handleCreate = async () => {
    if (!newLabel.trim()) return;
    const maxOrder = options.reduce((max, o) => Math.max(max, o.sort_order || 0), 0);
    await createOption({ category: activeCat, label: newLabel.trim(), sort_order: maxOrder + 1 });
    setNewLabel('');
    fetch();
  };

  const handleUpdate = async (id: number) => {
    await updateOption(id, { label: editingLabel });
    setEditingId(null);
    fetch();
  };

  const handleDelete = async (id: number) => {
    await deleteOption(id);
    fetch();
  };

  return (
    <div>
      <Tabs
        activeKey={activeCat}
        onChange={setActiveCat}
        items={CATEGORIES.map((c) => ({ key: c.key, label: c.label }))}
        style={{ marginBottom: 16 }}
      />
      <Table
        rowKey="id"
        dataSource={options}
        pagination={false}
        columns={[
          {
            title: '名称', dataIndex: 'label', key: 'label',
            render: (v: string, r: PocOption) => {
              if (editingId === r.id) {
                return <Input value={editingLabel} onChange={(e) => setEditingLabel(e.target.value)} style={{ width: 150 }} />;
              }
              return <span>{v} {r.is_default && <Tag style={{ marginLeft: 8 }}>默认</Tag>}</span>;
            },
          },
          { title: '排序', dataIndex: 'sort_order', key: 'sort_order', width: 80 },
          {
            title: '操作', key: 'actions', width: 200,
            render: (_: any, r: PocOption) => {
              if (editingId === r.id) {
                return (
                  <Space>
                    <a onClick={() => handleUpdate(r.id)}>保存</a>
                    <a onClick={() => setEditingId(null)}>取消</a>
                  </Space>
                );
              }
              return (
                <Space>
                  <a onClick={() => { setEditingId(r.id); setEditingLabel(r.label); }}>编辑</a>
                  {!r.is_default && (
                    <Popconfirm title="确认删除？" onConfirm={() => handleDelete(r.id)}>
                      <a style={{ color: '#ff4d4f' }}>删除</a>
                    </Popconfirm>
                  )}
                </Space>
              );
            },
          },
        ]}
      />
      <Space style={{ marginTop: 16 }}>
        <Input placeholder="新增选项" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} style={{ width: 150 }} />
        <Button icon={<PlusOutlined />} onClick={handleCreate}>新增</Button>
      </Space>
    </div>
  );
}

function UsersManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [form, setForm] = useState({ username: '', password: '', display_name: '', role_id: '' });

  const fetch = () => getUsers().then((r) => setUsers(r.data));
  useEffect(() => { fetch(); }, []);
  useEffect(() => { getRoles().then(r => setRoles(r.data)); }, []);

  const handleCreate = async () => {
    await createUser({ username: form.username, password: form.password, display_name: form.display_name, role_id: form.role_id });
    setModalOpen(false);
    message.success('创建成功');
    setForm({ username: '', password: '', display_name: '', role_id: '' });
    fetch();
  };

  const handleResetPwd = async (userId: string) => {
    await resetPassword(userId, '123456');
    message.success('密码已重置为 123456');
  };

  const handleToggle = async (userId: string) => {
    await toggleActive(userId);
    fetch();
  };

  const columns = [
    { title: '用户名', dataIndex: 'username', key: 'username' },
    { title: '显示名', dataIndex: 'display_name', key: 'display_name' },
    {
      title: '角色', dataIndex: 'role_name', key: 'role',
      render: (v: string | null) => <Tag>{v || '未分配'}</Tag>,
    },
    {
      title: '状态', dataIndex: 'is_active', key: 'is_active',
      render: (v: boolean) => v ? <Tag color="green">启用</Tag> : <Tag color="red">禁用</Tag>,
    },
    {
      title: '操作', key: 'actions',
      render: (_: any, r: User) => (
        <Space>
          <a onClick={() => handleResetPwd(r.id)}>重置密码</a>
          <a onClick={() => handleToggle(r.id)}>{r.is_active ? '禁用' : '启用'}</a>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)} style={{ marginBottom: 16 }}>
        新建用户
      </Button>
      <Table rowKey="id" columns={columns} dataSource={users} pagination={false} />
      <Modal title="新建用户" open={modalOpen} onOk={handleCreate} onCancel={() => setModalOpen(false)}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Input placeholder="用户名" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          <Input.Password placeholder="密码" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <Input placeholder="显示名" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
          <Select value={form.role_id} onChange={(v) => setForm({ ...form, role_id: v })} options={roles.map(r => ({ label: r.name, value: r.id }))} style={{ width: '100%' }} placeholder="选择角色" />
        </Space>
      </Modal>
    </div>
  );
}

const MODULES = [
  { key: 'project', label: '项目管理' },
  { key: 'dashboard', label: '数据仪表盘' },
  { key: 'sop', label: 'SOP中心' },
  { key: 'recycle_bin', label: '回收站' },
  { key: 'settings', label: '系统设置' },
];
const ACTIONS = [
  { key: 'view', label: '查看' },
  { key: 'create', label: '新建' },
  { key: 'edit', label: '编辑' },
  { key: 'delete', label: '删除' },
];

function RoleManager() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [perms, setPerms] = useState<RolePermission[]>([]);

  const fetch = () => getRoles().then(r => setRoles(r.data));
  useEffect(() => { fetch(); }, []);

  const openCreate = () => {
    setEditingRole(null);
    setName('');
    setDesc('');
    setPerms([]);
    setModalOpen(true);
  };

  const openEdit = (role: Role) => {
    setEditingRole(role);
    setName(role.name);
    setDesc(role.description || '');
    setPerms([...role.permissions]);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    const data = { name: name.trim(), description: desc || undefined, permissions: perms };
    if (editingRole) {
      await updateRole(editingRole.id, data);
      message.success('角色已更新');
    } else {
      await createRole(data);
      message.success('角色已创建');
    }
    setModalOpen(false);
    fetch();
  };

  const handleDelete = async (id: string) => {
    await deleteRole(id);
    message.success('角色已删除');
    fetch();
  };

  const togglePerm = (module: string, action: string) => {
    setPerms(prev => {
      const exists = prev.some(p => p.module === module && p.action === action);
      if (exists) return prev.filter(p => !(p.module === module && p.action === action));
      return [...prev, { module, action }];
    });
  };

  const columns = [
    {
      title: '角色名称', dataIndex: 'name', key: 'name',
      render: (v: string, r: Role) => (
        <span>{v} {r.is_super && <Tag color="blue" style={{ marginLeft: 8 }}>系统内置</Tag>}</span>
      ),
    },
    { title: '描述', dataIndex: 'description', key: 'description' },
    {
      title: '权限数', key: 'perm_count',
      render: (_: any, r: Role) => `${r.permissions.length} 项`,
    },
    {
      title: '操作', key: 'actions',
      render: (_: any, r: Role) => {
        if (r.is_super) return <Tag>系统内置</Tag>;
        return (
          <Space>
            <a onClick={() => openEdit(r)}>编辑</a>
            <Popconfirm title="确认删除此角色？关联用户将失去角色。" onConfirm={() => handleDelete(r.id)}>
              <a style={{ color: '#ff4d4f' }}>删除</a>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} style={{ marginBottom: 16 }}>
        新建角色
      </Button>
      <Table rowKey="id" columns={columns} dataSource={roles} pagination={false} />
      <Modal title={editingRole ? '编辑角色' : '新建角色'} open={modalOpen}
        onOk={handleSave} onCancel={() => setModalOpen(false)} width={700}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <div style={{ marginBottom: 4 }}>角色名称</div>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="如：实施工程师" />
          </div>
          <div>
            <div style={{ marginBottom: 4 }}>描述</div>
            <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="角色职责说明" />
          </div>
          <div>
            <div style={{ marginBottom: 8 }}>权限配置</div>
            <Space style={{ marginBottom: 8 }}>
              <Button size="small" onClick={() => {
                const all: RolePermission[] = [];
                MODULES.forEach(m => ACTIONS.forEach(a => all.push({ module: m.key, action: a.key })));
                setPerms(all);
              }}>全选</Button>
              <Button size="small" onClick={() => setPerms([])}>全不选</Button>
            </Space>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: 8, borderBottom: '1px solid #f0f0f0', textAlign: 'left' }}>模块</th>
                  {ACTIONS.map(a => (
                    <th key={a.key} style={{ padding: 8, borderBottom: '1px solid #f0f0f0', textAlign: 'center' }}>{a.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MODULES.map(m => (
                  <tr key={m.key}>
                    <td style={{ padding: 8 }}>{m.label}</td>
                    {ACTIONS.map(a => (
                      <td key={a.key} style={{ padding: 8, textAlign: 'center' }}>
                        <input type="checkbox" checked={perms.some(p => p.module === m.key && p.action === a.key)}
                          onChange={() => togglePerm(m.key, a.key)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Space>
      </Modal>
    </div>
  );
}

interface AuditLog {
  id: number;
  user_id: string;
  username: string;
  action: string;
  target_type: string;
  target_name: string;
  details: string | null;
  created_at: string;
}

function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<number[]>([]);

  const fetch = () => {
    setLoading(true);
    client.get('/audit-logs/', { params: { page, page_size: 50 } })
      .then(r => { setLogs(r.data.items); setTotal(r.data.total); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { fetch(); }, [page]);

  const actionLabels: Record<string, string> = {
    create: '新增', update: '编辑', delete: '删除',
    restore: '恢复', permanent_delete: '永久删除', import: '导入',
  };
  const actionColors: Record<string, string> = {
    create: 'green', update: 'blue', delete: 'red',
    restore: 'green', permanent_delete: 'red', import: 'orange',
  };
  const moduleLabels: Record<string, string> = {
    project: '项目管理',
    dashboard: '数据仪表盘',
    chart: '仪表盘图表',
    option: '系统设置-下拉选项',
    sop_document: 'SOP中心-文档',
    sop_sop: 'SOP中心-PoC实施SOP',
    sop_plan: 'SOP中心-PoC实施方案',
    sop_report: 'SOP中心-PoC汇报报告',
    test_case: 'SOP中心-案例库',
    test_case_category: 'SOP中心-客户端分类',
    script: 'SOP中心-脚本库',
    project_log: '项目管理-日志',
    user: '系统设置-用户管理',
  };

  const handleBatchDelete = async () => {
    await client.delete('/audit-logs/batch/delete', { data: selectedKeys });
    message.success(`已删除 ${selectedKeys.length} 条`);
    setSelectedKeys([]);
    fetch();
  };

  const handleClearAll = () => {
    Modal.confirm({
      title: '清空全部日志', content: '确认删除全部操作日志？此操作不可撤销！',
      okText: '确认清空', okType: 'danger',
      onOk: async () => {
        await client.delete('/audit-logs/all');
        message.success('日志已清空');
        fetch();
      },
    });
  };

  const columns = [
    { title: '操作模块', key: 'module', width: 160,
      render: (_: any, r: AuditLog) => <Tag>{moduleLabels[r.target_type] || r.target_type}</Tag>,
    },
    { title: '操作内容', key: 'desc',
      render: (_: any, r: AuditLog) => (
        <div>
          <Tag color={actionColors[r.action] || 'default'}>{actionLabels[r.action] || r.action}</Tag>
          <span>{r.target_name}</span>
          {r.details && <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{r.details}</div>}
        </div>
      ),
    },
    { title: '操作人员', dataIndex: 'username', width: 100 },
    { title: '操作时间', dataIndex: 'created_at', width: 170,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm:ss'),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        {selectedKeys.length > 0 && (
          <Popconfirm title={`确认删除选中的 ${selectedKeys.length} 条日志？`} onConfirm={handleBatchDelete}>
            <Button danger icon={<DeleteOutlined />}>批量删除 ({selectedKeys.length})</Button>
          </Popconfirm>
        )}
        {total > 0 && (
          <Button danger icon={<ClearOutlined />} onClick={handleClearAll}>清空全部</Button>
        )}
      </Space>
      <Table rowKey="id" columns={columns} dataSource={logs} loading={loading}
        rowSelection={{ selectedRowKeys: selectedKeys, onChange: (keys) => setSelectedKeys(keys as number[]) }}
        pagination={{ current: page, total, pageSize: 50, showTotal: t => `共 ${t} 条`, onChange: setPage }} />
    </div>
  );
}
