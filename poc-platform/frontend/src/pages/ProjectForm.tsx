import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Form, Input, DatePicker, Select, Button, message } from 'antd';
import { createProject, updateProject, getProject } from '../api/projects';
import { getOptions, type PocOption } from '../api/options';
import dayjs from 'dayjs';

export default function ProjectForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [typeOptions, setTypeOptions] = useState<PocOption[]>([]);
  const [implOptions, setImplOptions] = useState<PocOption[]>([]);
  const [statusOptions, setStatusOptions] = useState<PocOption[]>([]);

  useEffect(() => {
    getOptions('poc_type').then((r) => setTypeOptions(r.data));
    getOptions('impl_method').then((r) => setImplOptions(r.data));
    getOptions('status').then((r) => setStatusOptions(r.data));
  }, []);

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
            <Select options={typeOptions.map((o) => ({ label: o.label, value: o.id }))} />
          </Form.Item>
          <Form.Item name="impl_method_id" label="实施方式" rules={[{ required: true }]} style={{ flex: 1 }}>
            <Select options={implOptions.map((o) => ({ label: o.label, value: o.id }))} />
          </Form.Item>
          <Form.Item name="status_id" label="状态" rules={[{ required: true }]} style={{ flex: 1 }}>
            <Select options={statusOptions.map((o) => ({ label: o.label, value: o.id }))} />
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
