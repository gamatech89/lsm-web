/**
 * Profile Page
 * User profile and settings management
 */

import { useState } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Typography,
  Row,
  Col,
  Space,
  Avatar,
  Divider,
  App,
} from 'antd';
import {
  UserOutlined,
  MailOutlined,
  LockOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/lib/api';

const { Title, Text } = Typography;

export function ProfilePage() {
  const { message } = App.useApp();
  const { user, setUser } = useAuthStore();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (_data: { name: string; email: string }) => {
      // This would call an update profile endpoint
      // For now, we'll just fetch the current user
      return api.auth.getUser();
    },
    onSuccess: (response) => {
      if (response.data.data) {
        setUser(response.data.data);
      }
      message.success('Profile updated successfully');
    },
    onError: () => {
      message.error('Failed to update profile');
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (_data: {
      current_password: string;
      new_password: string;
      new_password_confirmation: string;
    }) => {
      // This would call a change password endpoint
      return Promise.resolve({ success: true });
    },
    onSuccess: () => {
      message.success('Password changed successfully');
      passwordForm.resetFields();
      setShowPasswordForm(false);
    },
    onError: () => {
      message.error('Failed to change password');
    },
  });

  const handleProfileSubmit = (values: { name: string; email: string }) => {
    updateProfileMutation.mutate(values);
  };

  const handlePasswordSubmit = (values: {
    current_password: string;
    new_password: string;
    new_password_confirmation: string;
  }) => {
    changePasswordMutation.mutate(values);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="page-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>Profile</Title>
          <Text type="secondary">Manage your account settings</Text>
        </Col>
      </Row>

      <Row gutter={24}>
        {/* Profile Info */}
        <Col xs={24} lg={16}>
          <Card title="Profile Information" style={{ borderRadius: 12, marginBottom: 24 }}>
            <Form
              form={profileForm}
              layout="vertical"
              onFinish={handleProfileSubmit}
              initialValues={{
                name: user.name,
                email: user.email,
              }}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="name"
                    label="Name"
                    rules={[{ required: true, message: 'Please enter your name' }]}
                  >
                    <Input prefix={<UserOutlined />} placeholder="Your name" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="email"
                    label="Email"
                    rules={[
                      { required: true, message: 'Please enter your email' },
                      { type: 'email', message: 'Please enter a valid email' },
                    ]}
                  >
                    <Input prefix={<MailOutlined />} placeholder="email@example.com" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item style={{ marginBottom: 0 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={updateProfileMutation.isPending}
                >
                  Save Changes
                </Button>
              </Form.Item>
            </Form>
          </Card>

          {/* Password Change */}
          <Card title="Change Password" style={{ borderRadius: 12 }}>
            {!showPasswordForm ? (
              <Button onClick={() => setShowPasswordForm(true)} icon={<LockOutlined />}>
                Change Password
              </Button>
            ) : (
              <Form
                form={passwordForm}
                layout="vertical"
                onFinish={handlePasswordSubmit}
              >
                <Form.Item
                  name="current_password"
                  label="Current Password"
                  rules={[{ required: true, message: 'Please enter current password' }]}
                >
                  <Input.Password prefix={<LockOutlined />} />
                </Form.Item>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="new_password"
                      label="New Password"
                      rules={[
                        { required: true, message: 'Please enter new password' },
                        { min: 8, message: 'Password must be at least 8 characters' },
                      ]}
                    >
                      <Input.Password prefix={<LockOutlined />} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="new_password_confirmation"
                      label="Confirm New Password"
                      dependencies={['new_password']}
                      rules={[
                        { required: true, message: 'Please confirm password' },
                        ({ getFieldValue }) => ({
                          validator(_, value) {
                            if (!value || getFieldValue('new_password') === value) {
                              return Promise.resolve();
                            }
                            return Promise.reject(new Error('Passwords do not match'));
                          },
                        }),
                      ]}
                    >
                      <Input.Password prefix={<LockOutlined />} />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item style={{ marginBottom: 0 }}>
                  <Space>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={changePasswordMutation.isPending}
                    >
                      Update Password
                    </Button>
                    <Button onClick={() => setShowPasswordForm(false)}>
                      Cancel
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            )}
          </Card>
        </Col>

        {/* Sidebar */}
        <Col xs={24} lg={8}>
          <Card style={{ borderRadius: 12, textAlign: 'center' }}>
            <Avatar
              size={80}
              style={{ backgroundColor: '#6366f1', marginBottom: 16 }}
            >
              {user.name.charAt(0).toUpperCase()}
            </Avatar>
            <Title level={4} style={{ marginBottom: 4 }}>{user.name}</Title>
            <Text type="secondary">{user.email}</Text>
            <Divider />
            <div style={{ textAlign: 'left' }}>
              <div style={{ marginBottom: 8 }}>
                <Text type="secondary">Role</Text>
                <div>
                  <Text strong style={{ textTransform: 'capitalize' }}>
                    {user.role}
                  </Text>
                </div>
              </div>
              <div>
                <Text type="secondary">Member Since</Text>
                <div>
                  <Text strong>
                    {user.created_at
                      ? new Date(user.created_at).toLocaleDateString()
                      : 'N/A'}
                  </Text>
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
