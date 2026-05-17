import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Form, Input, DatePicker, Select, Button, message, Popconfirm, Divider, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckOutlined } from '@ant-design/icons';
import { createProject, updateProject, getProject } from '../api/projects';
import { getOptions, createOption, updateOption, deleteOption, type PocOption } from '../api/options';
import dayjs from 'dayjs';

function CreatableSelect({ value, onChange, options, category, ...rest }: {
  value?: number;
  onChange?: (value: number) => void;
  options: { label: string; value: number }[];
  category: string;
  placeholder?: string;
}) {
  const [items, setItems] = useState(options);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingLabel, setEditingLabel] = useState('');
  const inputRef = useRef<any>(null);

  useEffect(() => setItems(options), [options]);

  const handleAdd = async () => {
    const label = newName.trim();
    if (!label) return;
    setAdding(true);
    try {
      const maxOrder = items.length;
      const res = await createOption({ category, label, sort_order: maxOrder + 1 });
      const newOpt = { label: res.data.label, value: res.data.id };
      setItems(prev => [...prev, newOpt]);
      setNewName('');
      onChange?.(res.data.id);
    } catch {
      message.error('添加失败');
    } finally {
      setAdding(false);
    }
  };

  const handleEditStart = (id: number, label: string) => {
    setEditingId(id);
    setEditingLabel(label);
  };

  const handleEditSave = async (id: number) => {
    if (!editingLabel.trim()) return;
    try {
      await updateOption(id, { label: editingLabel.trim() });
      setItems(prev => prev.map(o => o.value === id ? { ...o, label: editingLabel.trim() } : o));
      setEditingId(null);
    } catch {
      message.error('修改失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteOption(id);
      setItems(prev => prev.filter(o => o.value !== id));
      if (value === id) onChange?.(undefined as any);
      message.success('已删除');
    } catch {
      message.error('删除失败');
    }
  };

  const optionRender = (opt: any) => {
    if (editingId === opt.value) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 4px' }} onClick={(e) => e.stopPropagation()}>
          <Input
            size="small"
            value={editingLabel}
            onChange={(e) => setEditingLabel(e.target.value)}
            onPressEnter={() => handleEditSave(opt.value)}
            style={{ flex: 1 }}
            autoFocus
          />
          <Button size="small" type="text" icon={<CheckOutlined />} onClick={() => handleEditSave(opt.value)} />
        </div>
      );
    }
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>{opt.label}</span>
        <Space size={0} onClick={(e) => e.stopPropagation()}>
          <Button size="small" type="text" icon={<EditOutlined />} onClick={() => handleEditStart(opt.value, opt.label)} />
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(opt.value)}>
            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      </div>
    );
  };

  return (
    <Select
      value={value}
      onChange={onChange}
      options={items}
      optionRender={optionRender}
      {...rest}
      dropdownRender={(menu) => (
        <div>
          {menu}
          <Divider style={{ margin: '8px 0' }} />
          <div style={{ display: 'flex', padding: '0 8px 8px', gap: 8 }}>
            <Input
              ref={inputRef}
              size="small"
              placeholder="新增选项"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onPressEnter={handleAdd}
              onKeyDown={(e) => e.stopPropagation()}
            />
            <Button size="small" type="text" icon={<PlusOutlined />} loading={adding} onClick={handleAdd}>
              添加
            </Button>
          </div>
        </div>
      )}
    />
  );
}

export default function ProjectForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [typeOptions, setTypeOptions] = useState<PocOption[]>([]);
  const [implOptions, setImplOptions] = useState<PocOption[]>([]);
  const [statusOptions, setStatusOptions] = useState<PocOption[]>([]);

  const fetchOptions = () => {
    getOptions('poc_type').then((r) => setTypeOptions(r.data));
    getOptions('impl_method').then((r) => setImplOptions(r.data));
    getOptions('status').then((r) => setStatusOptions(r.data));
  };

  useEffect(() => { fetchOptions(); }, []);

  useEffect(() => {
    if (isEdit) {
      getProject(id!).then((r) => {
        form.setFieldsValue({
          ...r.data,
          start_date: dayjs(r.data.start_date),
          end_date: dayjs(r.data.end_date),
        });
      });
    }
  }, [id]);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const data = {
        ...values,
        start_date: values.start_date.format('YYYY-MM-DD'),
        end_date: values.end_date.format('YYYY-MM-DD'),
      };
      if (isEdit) {
        await updateProject(id!, data);
        message.success('更新成功');
      } else {
        await createProject(data);
        message.success('创建成功');
      }
      navigate('/projects');
    } catch {
      message.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title={isEdit ? '编辑项目' : '新建项目'} style={{ maxWidth: 800, margin: '0 auto' }}>
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item name="name" label="项目名称" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <div style={{ display: 'flex', gap: 16 }}>
          <Form.Item name="region" label="区域" rules={[{ required: true }]} style={{ flex: 1 }}>
            <Input />
          </Form.Item>
          <Form.Item name="city" label="城市" rules={[{ required: true }]} style={{ flex: 1 }}>
            <Input />
          </Form.Item>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <Form.Item name="sales" label="销售" rules={[{ required: true }]} style={{ flex: 1 }}>
            <Input />
          </Form.Item>
          <Form.Item name="pm" label="项目经理" rules={[{ required: true }]} style={{ flex: 1 }}>
            <Input />
          </Form.Item>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <Form.Item name="start_date" label="开始日期" rules={[{ required: true }]} style={{ flex: 1 }}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="end_date" label="完成日期" rules={[{ required: true }]} style={{ flex: 1 }}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <Form.Item name="poc_type_id" label="PoC类型" rules={[{ required: true }]} style={{ flex: 1 }}>
            <CreatableSelect options={typeOptions.map((o) => ({ label: o.label, value: o.id }))} category="poc_type" placeholder="选择或新增" />
          </Form.Item>
          <Form.Item name="impl_method_id" label="实施方式" rules={[{ required: true }]} style={{ flex: 1 }}>
            <CreatableSelect options={implOptions.map((o) => ({ label: o.label, value: o.id }))} category="impl_method" placeholder="选择或新增" />
          </Form.Item>
          <Form.Item name="status_id" label="状态" rules={[{ required: true }]} style={{ flex: 1 }}>
            <CreatableSelect options={statusOptions.map((o) => ({ label: o.label, value: o.id }))} category="status" placeholder="选择或新增" />
          </Form.Item>
        </div>
        <Form.Item name="result" label="PoC结果">
          <Input.TextArea rows={4} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>保存</Button>
          <Button style={{ marginLeft: 8 }} onClick={() => navigate('/projects')}>取消</Button>
        </Form.Item>
      </Form>
    </Card>
  );
}
