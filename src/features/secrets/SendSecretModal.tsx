import { useState } from 'react';
import { Modal, Form, Input, InputNumber, Button, Switch, Typography, Space, App, message as staticMessage } from 'antd';
import { CopyOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

const { Text, Paragraph } = Typography;

interface Props {
  open: boolean;
  onClose: () => void;
}

interface FormValues {
  title?: string;
  username?: string;
  password?: string;
  url?: string;
  note?: string;
  expires_in_minutes: number;
  access_password?: string;
}

export function SendSecretModal({ open, onClose }: Props) {
  const [form] = Form.useForm<FormValues>();
  const [link, setLink] = useState<string | null>(null);
  const [hasPassword, setHasPassword] = useState(false);
  const { message } = App.useApp ? App.useApp() : { message: staticMessage };

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      api.ephemeralSecrets.create({
        title: values.title || undefined,
        username: values.username || undefined,
        password: values.password || undefined,
        url: values.url || undefined,
        note: values.note || undefined,
        expires_in_minutes: values.expires_in_minutes,
        access_password: values.access_password || null,
      }),
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
        <Form
          form={form}
          layout="vertical"
          initialValues={{ expires_in_minutes: 1440 }}
          onFinish={(v) => mutation.mutate(v)}
        >
          <Form.Item name="title" label="Title"><Input placeholder="e.g. Staging FTP" /></Form.Item>
          <Form.Item name="username" label="Username"><Input autoComplete="off" /></Form.Item>
          <Form.Item name="password" label="Password"><Input.Password autoComplete="new-password" /></Form.Item>
          <Form.Item name="url" label="URL"><Input placeholder="https://..." /></Form.Item>
          <Form.Item name="note" label="Note"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="expires_in_minutes" label="Expires in (minutes)">
            <InputNumber min={5} max={10080} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Require a password to open">
            <Switch checked={hasPassword} onChange={setHasPassword} />
          </Form.Item>
          {hasPassword && (
            <Form.Item name="access_password" label="Access password" rules={[{ min: 4, message: 'At least 4 characters' }]}>
              <Input.Password autoComplete="new-password" />
            </Form.Item>
          )}
          <Text type="secondary">Fill at least one of username / password / URL / note.</Text>
          <Button type="primary" htmlType="submit" block loading={mutation.isPending} style={{ marginTop: 16 }}>
            Create one-time link
          </Button>
        </Form>
      )}
    </Modal>
  );
}
