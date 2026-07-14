import { useState } from 'react';
import {
  Modal, Form, Input, InputNumber, Button, Switch, Select, Typography, Space, Row, Col,
  App, message as staticMessage,
} from 'antd';
import {
  CopyOutlined, SafetyCertificateOutlined, LockOutlined, GlobalOutlined,
  DatabaseOutlined, CloudServerOutlined, UserOutlined, KeyOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { EphemeralSecretInput } from '@lsm/types';

const { Text, Paragraph } = Typography;
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
  const [hasPassword, setHasPassword] = useState(false);
  const { message } = App.useApp ? App.useApp() : { message: staticMessage };

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
      message.success('One-time link created');
    },
    onError: () => message.error('Could not create the link'),
  });

  const close = () => {
    setLink(null);
    setHasPassword(false);
    form.resetFields();
    onClose();
  };

  const copy = () => {
    if (link) {
      navigator.clipboard.writeText(link);
      message.success('Link copied');
    }
  };

  return (
    <Modal
      open={open}
      onCancel={close}
      title={<Space><SafetyCertificateOutlined /> Send a secret (one-time)</Space>}
      footer={null}
      destroyOnClose
      width={600}
      centered
    >
      {link ? (
        <div>
          <Paragraph>Share this one-time link. It expires and is deleted after the first view.</Paragraph>
          <Space.Compact style={{ width: '100%' }}>
            <Input value={link} readOnly />
            <Button icon={<CopyOutlined />} onClick={copy} />
          </Space.Compact>
          <Button style={{ marginTop: 16 }} onClick={close} block>Done</Button>
        </div>
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
