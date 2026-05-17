import { useState } from 'react';
import { Card, Form, Input, Button, message, Descriptions, Tag } from 'antd';
import { useAuth } from '../context/AuthContext';
import { changePassword } from '../api/auth';

export default function Profile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleChangePassword = async (values: { currentPassword: string; newPassword: string }) => {
    setLoading(true);
    try {
      await changePassword(values.currentPassword, values.newPassword);
      message.success('密码修改成功');
      form.resetFields();
    } catch (err: any) {
      message.error(err?.response?.data?.detail || '修改失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <Card title="个人信息" style={{ marginBottom: 24 }}>
        <Descriptions column={1} labelStyle={{ width: 80 }}>
          <Descriptions.Item label="账号">{user?.username}</Descriptions.Item>
          <Descriptions.Item label="用户名">{user?.display_name}</Descriptions.Item>
          <Descriptions.Item label="角色">
            <Tag>{user?.role_name || user?.role || '未分配'}</Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="修改密码">
        <Form form={form} layout="vertical" onFinish={handleChangePassword} style={{ maxWidth: 360 }}>
          <Form.Item
            name="currentPassword"
            label="当前密码"
            rules={[{ required: true, message: '请输入当前密码' }]}
          >
            <Input.Password placeholder="输入当前密码" />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码至少 6 位' },
            ]}
          >
            <Input.Password placeholder="输入新密码" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认新密码"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请确认新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="再次输入新密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              修改密码
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
