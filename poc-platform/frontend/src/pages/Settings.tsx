import { useEffect, useState } from 'react';
import { Card, Tabs, Table, Button, Input, Space, Popconfirm, message, Modal, Select, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { getOptions, createOption, updateOption, deleteOption, type PocOption } from '../api/options';
import { getUsers, createUser, resetPassword, toggleActive } from '../api/users';
import type { User } from '../api/auth';

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
    await createOption({ category: activeCat, label: newLabel.trim() });
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
  const [form, setForm] = useState({ username: '', password: '', display_name: '', role: 'user' });

  const fetch = () => getUsers().then((r) => setUsers(r.data));
  useEffect(() => { fetch(); }, []);

  const handleCreate = async () => {
    await createUser(form);
    setModalOpen(false);
    message.success('创建成功');
    setForm({ username: '', password: '', display_name: '', role: 'user' });
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
      title: '角色', dataIndex: 'role', key: 'role',
      render: (v: string) => <Tag color={v === 'admin' ? 'blue' : 'default'}>{v === 'admin' ? '管理员' : '普通用户'}</Tag>,
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
          <Select value={form.role} onChange={(v) => setForm({ ...form, role: v })} options={[{ label: '普通用户', value: 'user' }, { label: '管理员', value: 'admin' }]} style={{ width: '100%' }} />
        </Space>
      </Modal>
    </div>
  );
}
