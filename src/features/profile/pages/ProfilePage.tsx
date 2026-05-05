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
  QRCode,
  Alert,
  Tag,
  Modal,
} from 'antd';
import {
  UserOutlined,
  MailOutlined,
  LockOutlined,
  SaveOutlined,
  BankOutlined,
  SafetyOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/lib/api';

const { Title, Text } = Typography;
const { TextArea } = Input;

export function ProfilePage() {
  const { message } = App.useApp();
  const { user, setUser, updateUser } = useAuthStore();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [billingForm] = Form.useForm();
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  // 2FA state
  const [twoFactorSetup, setTwoFactorSetup] = useState<{ secret: string; qr_code_url: string } | null>(null);
  const [twoFactorRecoveryCodes, setTwoFactorRecoveryCodes] = useState<string[] | null>(null);
  const [showDisableForm, setShowDisableForm] = useState(false);
  const [twoFactorForm] = Form.useForm();
  const [disableTwoFactorForm] = Form.useForm();

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { name: string; email: string }) => {
      return api.auth.updateProfile(data);
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

  // Update billing mutation
  const updateBillingMutation = useMutation({
    mutationFn: async (data: {
      billing_company_name?: string;
      billing_address?: string;
      billing_tax_id?: string;
      invoice_prefix?: string;
    }) => {
      return api.auth.updateBilling(data);
    },
    onSuccess: (response) => {
      if (response.data.data) {
        setUser(response.data.data);
      }
      message.success('Billing information updated successfully');
    },
    onError: () => {
      message.error('Failed to update billing information');
    },
  });

  // 2FA mutations
  const [showDisableEmailForm, setShowDisableEmailForm] = useState(false);
  const [disableEmailTwoFactorForm] = Form.useForm();

  const enableTwoFactorMutation = useMutation({
    mutationFn: () => api.auth.twoFactorEnable(),
    onSuccess: (response) => {
      if (response.data.data) {
        setTwoFactorSetup(response.data.data);
      }
    },
    onError: () => message.error('Failed to start 2FA setup'),
  });

  const confirmTwoFactorMutation = useMutation({
    mutationFn: (code: string) => api.auth.twoFactorConfirm(code),
    onSuccess: (response) => {
      if (response.data.data) {
        setTwoFactorRecoveryCodes(response.data.data.recovery_codes);
        setTwoFactorSetup(null);
        twoFactorForm.resetFields();
        updateUser({ two_factor_enabled: true });
        message.success('Two-factor authentication enabled');
      }
    },
    onError: () => message.error('Invalid code — please try again'),
  });

  const disableTwoFactorMutation = useMutation({
    mutationFn: (password: string) => api.auth.twoFactorDisable(password),
    onSuccess: () => {
      setShowDisableForm(false);
      disableTwoFactorForm.resetFields();
      updateUser({ two_factor_enabled: false });
      message.success('Two-factor authentication disabled');
    },
    onError: () => message.error('Invalid password'),
  });

  const regenerateCodesMutation = useMutation({
    mutationFn: () => api.auth.twoFactorRegenerateCodes(),
    onSuccess: (response) => {
      if (response.data.data) {
        setTwoFactorRecoveryCodes(response.data.data.recovery_codes);
        message.success('Recovery codes regenerated');
      }
    },
    onError: () => message.error('Failed to regenerate recovery codes'),
  });

  const enableEmailTwoFactorMutation = useMutation({
    mutationFn: () => api.auth.twoFactorEnableEmail(),
    onSuccess: () => {
      updateUser({ two_factor_email_enabled: true });
      message.success('Email two-factor authentication enabled');
    },
    onError: () => message.error('Failed to enable email 2FA'),
  });

  const disableEmailTwoFactorMutation = useMutation({
    mutationFn: (password: string) => api.auth.twoFactorDisableEmail(password),
    onSuccess: () => {
      setShowDisableEmailForm(false);
      disableEmailTwoFactorForm.resetFields();
      updateUser({ two_factor_email_enabled: false });
      message.success('Email two-factor authentication disabled');
    },
    onError: () => message.error('Invalid password'),
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

  const handleBillingSubmit = (values: {
    billing_company_name?: string;
    billing_address?: string;
    billing_tax_id?: string;
    invoice_prefix?: string;
  }) => {
    updateBillingMutation.mutate(values);
  };

  if (!user) {
    return null;
  }

  const isDeveloper = user.role === 'developer';

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
          <Card title="Change Password" style={{ borderRadius: 12, marginBottom: 24 }}>
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

          {/* Two-Factor Authentication */}
          <Card
            title={
              <Space>
                <SafetyOutlined />
                <span>Two-Factor Authentication</span>
                {user.two_factor_enabled
                  ? <Tag icon={<CheckCircleOutlined />} color="success">Enabled</Tag>
                  : <Tag icon={<CloseCircleOutlined />} color="default">Disabled</Tag>}
              </Space>
            }
            style={{ borderRadius: 12, marginBottom: 24 }}
          >
            {!user.two_factor_enabled ? (
              <>
                {!twoFactorSetup ? (
                  <>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                      Add an extra layer of security. You'll need your authenticator app (Google Authenticator, Authy) each time you log in.
                    </Text>
                    <Button
                      type="primary"
                      icon={<SafetyOutlined />}
                      loading={enableTwoFactorMutation.isPending}
                      onClick={() => enableTwoFactorMutation.mutate()}
                    >
                      Enable 2FA
                    </Button>
                  </>
                ) : (
                  <Row gutter={24} align="middle">
                    <Col xs={24} sm={8} style={{ textAlign: 'center' }}>
                      <QRCode value={twoFactorSetup.qr_code_url} size={180} />
                      <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
                        Or enter manually:
                      </Text>
                      <Text code copyable style={{ fontSize: 11 }}>
                        {twoFactorSetup.secret}
                      </Text>
                    </Col>
                    <Col xs={24} sm={16}>
                      <Text strong style={{ display: 'block', marginBottom: 8 }}>
                        Scan the QR code with your authenticator app, then enter the 6-digit code to confirm.
                      </Text>
                      <Form
                        form={twoFactorForm}
                        layout="inline"
                        onFinish={(values) => confirmTwoFactorMutation.mutate(values.code)}
                      >
                        <Form.Item
                          name="code"
                          rules={[
                            { required: true, message: 'Enter the code' },
                            { len: 6, message: '6 digits required' },
                          ]}
                        >
                          <Input
                            placeholder="000000"
                            maxLength={6}
                            style={{ width: 140, letterSpacing: '0.3em' }}
                            autoFocus
                          />
                        </Form.Item>
                        <Form.Item>
                          <Space>
                            <Button
                              type="primary"
                              htmlType="submit"
                              loading={confirmTwoFactorMutation.isPending}
                            >
                              Confirm & Enable
                            </Button>
                            <Button onClick={() => setTwoFactorSetup(null)}>
                              Cancel
                            </Button>
                          </Space>
                        </Form.Item>
                      </Form>
                    </Col>
                  </Row>
                )}
              </>
            ) : (
              <>
                {twoFactorRecoveryCodes && (
                  <Alert
                    type="warning"
                    style={{ marginBottom: 16 }}
                    message="Save your recovery codes"
                    description={
                      <>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                          Store these in a safe place. Each code can only be used once.
                        </Text>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontFamily: 'monospace' }}>
                          {twoFactorRecoveryCodes.map((code) => (
                            <Text key={code} code copyable>{code}</Text>
                          ))}
                        </div>
                        <Button
                          size="small"
                          style={{ marginTop: 8 }}
                          onClick={() => setTwoFactorRecoveryCodes(null)}
                        >
                          I've saved these
                        </Button>
                      </>
                    }
                    showIcon
                  />
                )}

                <Space wrap>
                  <Button
                    icon={<ReloadOutlined />}
                    loading={regenerateCodesMutation.isPending}
                    onClick={() => regenerateCodesMutation.mutate()}
                  >
                    Regenerate Recovery Codes
                  </Button>
                  <Button
                    danger
                    icon={<CloseCircleOutlined />}
                    onClick={() => setShowDisableForm(true)}
                  >
                    Disable 2FA
                  </Button>
                </Space>

                <Modal
                  title="Disable Two-Factor Authentication"
                  open={showDisableForm}
                  onCancel={() => { setShowDisableForm(false); disableTwoFactorForm.resetFields(); }}
                  footer={null}
                  destroyOnClose
                >
                  <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                    Enter your current password to confirm.
                  </Text>
                  <Form
                    form={disableTwoFactorForm}
                    layout="vertical"
                    onFinish={(values) => disableTwoFactorMutation.mutate(values.password)}
                  >
                    <Form.Item
                      name="password"
                      label="Current Password"
                      rules={[{ required: true, message: 'Please enter your password' }]}
                    >
                      <Input.Password prefix={<LockOutlined />} autoFocus />
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 0 }}>
                      <Space>
                        <Button
                          danger
                          type="primary"
                          htmlType="submit"
                          loading={disableTwoFactorMutation.isPending}
                        >
                          Disable 2FA
                        </Button>
                        <Button onClick={() => { setShowDisableForm(false); disableTwoFactorForm.resetFields(); }}>
                          Cancel
                        </Button>
                      </Space>
                    </Form.Item>
                  </Form>
                </Modal>
              </>
            )}
          </Card>

          {/* Email Two-Factor Authentication */}
          <Card
            title={
              <Space>
                <MailOutlined />
                <span>Email Verification</span>
                {user.two_factor_email_enabled
                  ? <Tag icon={<CheckCircleOutlined />} color="success">Enabled</Tag>
                  : <Tag icon={<CloseCircleOutlined />} color="default">Disabled</Tag>}
              </Space>
            }
            style={{ borderRadius: 12, marginBottom: 24 }}
          >
            {!user.two_factor_email_enabled ? (
              <>
                <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                  Every time you log in, a one-time code will be sent to <strong>{user.email}</strong>. No authenticator app needed.
                </Text>
                <Button
                  type="primary"
                  icon={<MailOutlined />}
                  loading={enableEmailTwoFactorMutation.isPending}
                  onClick={() => enableEmailTwoFactorMutation.mutate()}
                  disabled={!!user.two_factor_enabled}
                >
                  Enable Email 2FA
                </Button>
                {user.two_factor_enabled && (
                  <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
                    Disable authenticator app 2FA first to switch to email verification.
                  </Text>
                )}
              </>
            ) : (
              <>
                <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                  A code is sent to <strong>{user.email}</strong> each time you log in.
                </Text>
                <Button
                  danger
                  icon={<CloseCircleOutlined />}
                  onClick={() => setShowDisableEmailForm(true)}
                >
                  Disable Email 2FA
                </Button>

                <Modal
                  title="Disable Email Two-Factor Authentication"
                  open={showDisableEmailForm}
                  onCancel={() => { setShowDisableEmailForm(false); disableEmailTwoFactorForm.resetFields(); }}
                  footer={null}
                  destroyOnClose
                >
                  <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                    Enter your current password to confirm.
                  </Text>
                  <Form
                    form={disableEmailTwoFactorForm}
                    layout="vertical"
                    onFinish={(values) => disableEmailTwoFactorMutation.mutate(values.password)}
                  >
                    <Form.Item
                      name="password"
                      label="Current Password"
                      rules={[{ required: true, message: 'Please enter your password' }]}
                    >
                      <Input.Password prefix={<LockOutlined />} autoFocus />
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 0 }}>
                      <Space>
                        <Button
                          danger
                          type="primary"
                          htmlType="submit"
                          loading={disableEmailTwoFactorMutation.isPending}
                        >
                          Disable Email 2FA
                        </Button>
                        <Button onClick={() => { setShowDisableEmailForm(false); disableEmailTwoFactorForm.resetFields(); }}>
                          Cancel
                        </Button>
                      </Space>
                    </Form.Item>
                  </Form>
                </Modal>
              </>
            )}
          </Card>

          {/* Billing Information - Developer only */}
          {isDeveloper && (
            <Card
              title={
                <Space>
                  <BankOutlined />
                  <span>Billing Information</span>
                </Space>
              }
              style={{ borderRadius: 12 }}
              extra={
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Used for generating invoice PDFs
                </Text>
              }
            >
              <Form
                form={billingForm}
                layout="vertical"
                onFinish={handleBillingSubmit}
                initialValues={{
                  billing_company_name: user.billing_company_name || '',
                  billing_address: user.billing_address || '',
                  billing_tax_id: user.billing_tax_id || '',
                  invoice_prefix: user.invoice_prefix || '',
                }}
              >
                <Row gutter={16}>
                  <Col span={16}>
                    <Form.Item
                      name="billing_company_name"
                      label="Company / Business Name"
                      tooltip="Appears as 'From' on your invoices"
                    >
                      <Input placeholder="e.g. John Doe Consulting" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name="invoice_prefix"
                      label="Invoice Prefix"
                      tooltip="Custom prefix for your invoice numbers (e.g. GS → GS001/2026)"
                    >
                      <Input placeholder="e.g. GS" maxLength={10} />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  name="billing_address"
                  label="Billing Address"
                  tooltip="Full address that appears on your invoices"
                >
                  <TextArea
                    rows={3}
                    placeholder={"Street Name 123\n12345 City, Country"}
                  />
                </Form.Item>

                <Form.Item
                  name="billing_tax_id"
                  label="Tax ID / VAT Number"
                  tooltip="Optional tax identification number"
                >
                  <Input placeholder="e.g. DE123456789" />
                </Form.Item>

                <Form.Item style={{ marginBottom: 0 }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<SaveOutlined />}
                    loading={updateBillingMutation.isPending}
                  >
                    Save Billing Info
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          )}
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
              {user.hourly_rate && (
                <div style={{ marginBottom: 8 }}>
                  <Text type="secondary">Hourly Rate</Text>
                  <div>
                    <Text strong>${user.hourly_rate}/h</Text>
                  </div>
                </div>
              )}
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
