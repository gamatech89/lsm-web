import { useState } from 'react';
import { Card, Button, Form, Input, Typography, QRCode, Alert, Space, Divider, App } from 'antd';
import { SafetyOutlined, MailOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

const { Title, Text, Paragraph } = Typography;

/**
 * Full-screen forced 2FA enrollment. Shown when the authenticated user's
 * `requires_two_factor_setup` flag is true; blocks the app until they enroll.
 */
export function TwoFactorSetupGate() {
  const { message } = App.useApp();
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const [setup, setSetup] = useState<{ secret: string; qr_code_url: string } | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  // Once enrolled, refetch the user so requires_two_factor_setup clears and the app unlocks.
  const finish = async () => {
    try {
      const res = await api.auth.getUser();
      if (res.data.data) setUser(res.data.data);
    } catch {
      message.error('Could not refresh your session — please log in again.');
      logout();
    }
  };

  const enableMutation = useMutation({
    mutationFn: () => api.auth.twoFactorEnable(),
    onSuccess: (res) => { if (res.data.data) setSetup(res.data.data); },
    onError: () => message.error('Failed to start 2FA setup'),
  });

  const confirmMutation = useMutation({
    mutationFn: (code: string) => api.auth.twoFactorConfirm(code),
    onSuccess: (res) => {
      const codes = res.data.data?.recovery_codes;
      if (codes) setRecoveryCodes(codes);
      message.success('Two-factor authentication enabled');
    },
    onError: () => message.error('Invalid code — please try again'),
  });

  const enableEmailMutation = useMutation({
    mutationFn: () => api.auth.twoFactorEnableEmail(),
    onSuccess: () => {
      message.success('Email two-factor enabled');
      finish();
    },
    onError: () => message.error('Failed to enable email 2FA'),
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#0f172a' }}>
      <Card style={{ maxWidth: 460, width: '100%' }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <SafetyOutlined style={{ fontSize: 40, color: '#667eea' }} />
            <Title level={3} style={{ marginTop: 12, marginBottom: 0 }}>Two-factor setup required</Title>
            <Text type="secondary">Your account requires two-factor authentication before you can continue.</Text>
          </div>

          {recoveryCodes ? (
            <>
              <Alert type="success" showIcon message="2FA enabled — save your recovery codes" description="Store these somewhere safe. Each can be used once if you lose your authenticator." />
              <Space wrap>
                {recoveryCodes.map((c) => <Text key={c} code copyable>{c}</Text>)}
              </Space>
              <Button type="primary" block onClick={finish}>I've saved them — continue</Button>
            </>
          ) : setup ? (
            <>
              <Paragraph style={{ marginBottom: 8 }}>Scan this with your authenticator app, then enter the 6-digit code.</Paragraph>
              <div style={{ textAlign: 'center' }}><QRCode value={setup.qr_code_url} size={180} /></div>
              <Text type="secondary" style={{ display: 'block', textAlign: 'center' }}>
                Or enter this key: <Text code copyable style={{ fontSize: 11 }}>{setup.secret}</Text>
              </Text>
              <Form onFinish={(v) => confirmMutation.mutate(v.code)}>
                <Form.Item name="code" rules={[{ required: true, message: 'Enter the code' }, { len: 6, message: '6 digits' }]}>
                  <Input placeholder="123456" maxLength={6} inputMode="numeric" />
                </Form.Item>
                <Button type="primary" htmlType="submit" block loading={confirmMutation.isPending}>Confirm & continue</Button>
              </Form>
            </>
          ) : (
            <>
              <Button type="primary" block icon={<SafetyOutlined />} loading={enableMutation.isPending} onClick={() => enableMutation.mutate()}>
                Set up with an authenticator app
              </Button>
              <Divider plain style={{ margin: '4px 0' }}>or</Divider>
              <Button block icon={<MailOutlined />} loading={enableEmailMutation.isPending} onClick={() => enableEmailMutation.mutate()}>
                Use email codes instead
              </Button>
            </>
          )}

          <Button type="link" block onClick={logout}>Log out</Button>
        </Space>
      </Card>
    </div>
  );
}
