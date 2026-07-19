import { useState } from 'react';
import {
  Modal, Form, Input, InputNumber, Button, Switch, Select, Typography, Space, Row, Col,
  Result, Alert, App,
} from 'antd';
import {
  CopyOutlined, SafetyCertificateOutlined, LockOutlined, GlobalOutlined,
  DatabaseOutlined, CloudServerOutlined, UserOutlined, KeyOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { EphemeralSecretInput } from '@lsm/types';

const { Text } = Typography;
const ACCENT = '#8b5cf6';
const { TextArea } = Input;

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Send a one-time secret. Mirrors the Add-Credential form (type selector +
 * connection fields) but nothing is saved — it only mints a burn-after-read link.
 */
export function SendSecretModal({ open, onClose }: Props) {
  const [form] = Form.useForm();
  const { t } = useTranslation();
  const [link, setLink] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [hasPassword, setHasPassword] = useState(false);
  const { message } = App.useApp();

  const typeOptions = [
    { label: t('vault.types.wordpress'), value: 'wordpress', icon: <GlobalOutlined /> },
    { label: t('vault.types.ssh'), value: 'ssh', icon: <CloudServerOutlined /> },
    { label: t('vault.types.ftp'), value: 'ftp', icon: <CloudServerOutlined /> },
    { label: t('vault.types.sftp', 'SFTP'), value: 'sftp', icon: <CloudServerOutlined /> },
    { label: t('vault.types.database'), value: 'database', icon: <DatabaseOutlined /> },
    { label: t('vault.types.hosting'), value: 'hosting', icon: <CloudServerOutlined /> },
    { label: t('vault.types.email'), value: 'email', icon: <UserOutlined /> },
    { label: t('vault.types.apiKey'), value: 'api', icon: <KeyOutlined /> },
    { label: t('vault.types.other'), value: 'other', icon: <LockOutlined /> },
  ];

  const mutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => {
      const { key_auth, ...rest } = values;
      void key_auth; // UI-only, not part of the payload
      const payload = {
        ...rest,
        access_password: hasPassword ? (values.access_password as string) : null,
      } as EphemeralSecretInput;
      return api.ephemeralSecrets.create(payload);
    },
    onSuccess: (res) => {
      setLink(res.data.data.link);
      setExpiresAt(res.data.data.expires_at);
      message.success(t('vault.shareModal.success'));
    },
    onError: () => message.error('Could not create the link'),
  });

  const close = () => {
    setLink(null);
    setExpiresAt(null);
    setHasPassword(false);
    form.resetFields();
    onClose();
  };

  const copy = () => {
    if (link) {
      navigator.clipboard.writeText(link);
      message.success(t('vault.shareModal.linkCopied'));
    }
  };

  return (
    <Modal
      open={open}
      onCancel={close}
      title={link ? null : <Space><SafetyCertificateOutlined style={{ color: ACCENT }} /> Send a secret (one-time)</Space>}
      footer={link ? [<Button key="close" onClick={close}>{t('vault.shareModal.close')}</Button>] : null}
      destroyOnClose
      width={link ? 480 : 600}
      centered
    >
      {link ? (
        <Result
          status="success"
          icon={<CheckCircleOutlined style={{ color: ACCENT }} />}
          title={t('vault.shareModal.linkCreated')}
          subTitle={expiresAt ? `${t('vault.shareModal.linkExpires')} ${new Date(expiresAt).toLocaleString()}` : undefined}
          extra={[
            <div
              key="link-box"
              style={{
                padding: '12px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc',
                marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              }}
            >
              <Text ellipsis style={{ maxWidth: 280, fontFamily: 'monospace', fontSize: 12, color: '#1e293b' }}>{link}</Text>
              <Button type="primary" icon={<CopyOutlined />} onClick={copy} style={{ background: ACCENT, flexShrink: 0 }}>
                {t('vault.shareModal.copy')}
              </Button>
            </div>,
            <Alert
              key="warning"
              message={t('vault.shareModal.securityNote')}
              description={t('vault.shareModal.securityWarning')}
              type="warning"
              showIcon
              style={{ textAlign: 'left' }}
            />,
          ]}
        />
      ) : (
        <Form form={form} layout="vertical" initialValues={{ expires_in_minutes: 1440 }} onFinish={(v) => mutation.mutate(v)}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="type" label={t('vault.table.type')}>
                <Select placeholder={t('vault.form.selectType')} allowClear>
                  {typeOptions.map((opt) => (
                    <Select.Option key={opt.value} value={opt.value}>
                      <Space>{opt.icon} {opt.label}</Space>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="title" label={t('vault.form.title')}>
                <Input placeholder="e.g. Staging SFTP" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item noStyle shouldUpdate={(p, c) => p.type !== c.type}>
            {({ getFieldValue }) => {
              const type = getFieldValue('type');
              const showHost = type === 'ssh' || type === 'ftp' || type === 'sftp' || type === 'database';
              return (
                <>
                  {showHost && (
                    <Row gutter={16}>
                      <Col span={18}>
                        <Form.Item name="hostname" label={t('vault.form.hostnameIp')}>
                          <Input placeholder={t('vault.form.hostnamePlaceholder')} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="port" label={t('vault.form.port')}>
                          <Input placeholder={type === 'database' ? '3306' : type === 'ftp' ? '21' : '22'} />
                        </Form.Item>
                      </Col>
                    </Row>
                  )}
                  {type === 'database' && (
                    <Form.Item name="database_name" label={t('vault.form.databaseName')}>
                      <Input placeholder="my_app_db" />
                    </Form.Item>
                  )}
                </>
              );
            }}
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(p, c) => p.type !== c.type || p.key_auth !== c.key_auth}>
            {({ getFieldValue, setFieldValue }) => {
              const type = getFieldValue('type');
              const isSSH = type === 'ssh';
              const isApiKey = type === 'api';
              const keyAuth = getFieldValue('key_auth');
              return (
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="username" label={t('vault.form.usernameLogin')}>
                      <Input autoComplete="off" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    {isSSH && (
                      <Form.Item name="key_auth" valuePropName="checked" style={{ marginBottom: 8 }}>
                        <Space>
                          <Switch size="small" onChange={(checked) => { if (checked) setFieldValue('password', undefined); }} />
                          <Text type="secondary" style={{ fontSize: 12 }}>Key-based auth (no password)</Text>
                        </Space>
                      </Form.Item>
                    )}
                    {!(isSSH && keyAuth) && (
                      <Form.Item name="password" label={isApiKey ? t('vault.types.apiKey') : t('vault.form.passwordApiKey')}>
                        <Input.Password autoComplete="new-password" />
                      </Form.Item>
                    )}
                  </Col>
                </Row>
              );
            }}
          </Form.Item>

          <Form.Item name="url" label={t('vault.form.loginUrl')}>
            <Input placeholder="https://..." />
          </Form.Item>
          <Form.Item name="note" label={t('vault.form.notes')}>
            <TextArea rows={2} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="expires_in_minutes" label="Expires in (minutes)">
                <InputNumber min={5} max={10080} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Require a password to open">
                <Switch checked={hasPassword} onChange={setHasPassword} />
              </Form.Item>
            </Col>
          </Row>
          {hasPassword && (
            <Form.Item name="access_password" label="Access password" rules={[{ min: 4, message: 'At least 4 characters' }]}>
              <Input.Password autoComplete="new-password" />
            </Form.Item>
          )}

          <Text type="secondary">
            Fill at least one secret field (username / password / URL / host / note). Nothing is saved — this only creates a one-time link.
          </Text>
          <Button type="primary" htmlType="submit" block loading={mutation.isPending} style={{ marginTop: 16 }}>
            Create one-time link
          </Button>
        </Form>
      )}
    </Modal>
  );
}
