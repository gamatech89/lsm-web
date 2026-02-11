import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Modal, 
  Form, 
  Input, 
  Select, 
  Button, 
  Typography, 
  Result, 
  Space, 
  message,
  Divider,
  Alert,
  App,
  InputNumber,
  Radio
} from 'antd';
import { 
  CopyOutlined, 
  LinkOutlined, 
  SafetyCertificateOutlined,
  CheckCircleOutlined,
  LockOutlined,
  UnlockOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  MailOutlined
} from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { Credential } from '@lsm/types';

const { Text } = Typography;

interface ShareCredentialModalProps {
  open: boolean;
  onClose: () => void;
  credential: Credential | null;
}

export function ShareCredentialModal({ open, onClose, credential }: ShareCredentialModalProps) {
  const [form] = Form.useForm();
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const { t } = useTranslation();
  const { message: antdMessage } = App.useApp ? App.useApp() : { message };

  // Generate Link Mutation
  const shareMutation = useMutation({
    mutationFn: (values: any) => {
      return apiClient.post(`/credentials/${credential?.id}/share`, {
        expires_in_minutes: values.expires_in,
        max_views: values.max_views,
        access_password: values.has_password ? values.password : null,
        recipient_email: values.recipient_email,
        note: values.note
      });
    },
    onSuccess: (response) => {
      setGeneratedLink(response.data.data.link);
      setExpiresAt(response.data.data.expires_at);
      antdMessage.success(t('vault.shareModal.success'));
    },
    onError: () => {
      antdMessage.error(t('vault.shareModal.error'));
    }
  });

  const handleClose = () => {
    setGeneratedLink(null);
    setExpiresAt(null);
    form.resetFields();
    onClose();
  };

  const copyToClipboard = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      antdMessage.success(t('vault.shareModal.linkCopied'));
    }
  };

  // Render Result View (Link Generated)
  if (generatedLink) {
    return (
      <Modal
        open={open}
        onCancel={handleClose}
        footer={[
          <Button key="close" onClick={handleClose}>{t('vault.shareModal.close')}</Button>
        ]}
        centered
        width={480}
      >
        <Result
          status="success"
          icon={<CheckCircleOutlined style={{ color: '#8b5cf6' }} />}
          title={t('vault.shareModal.linkCreated')}
          subTitle={`${t('vault.shareModal.linkExpires')} ${new Date(expiresAt!).toLocaleString()}`}
          extra={[
            <div key="link-box" style={{ 
              background: '#1e293b', 
              padding: '12px 16px', 
              borderRadius: 8, 
              border: '1px solid #334155',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <Text ellipsis style={{ maxWidth: 320, color: '#94a3b8' }}>
                {generatedLink}
              </Text>
              <Button 
                type="primary" 
                icon={<CopyOutlined />} 
                onClick={copyToClipboard}
                style={{ background: '#8b5cf6' }}
              >
                {t('vault.shareModal.copy')}
              </Button>
            </div>,
             <Alert
              key="warning"
              message={t('vault.shareModal.securityNote')}
              description={t('vault.shareModal.securityWarning')}
              type="warning"
              showIcon
              style={{ 
                textAlign: 'left', 
                background: '#422006', 
                border: '1px solid #854d0e',
                color: '#fef3c7'
              }}
            />
          ]}
        />
      </Modal>
    );
  }

  // Render Form View
  return (
    <Modal
      title={
        <Space>
          <SafetyCertificateOutlined style={{ color: '#8b5cf6' }} />
          <span>{t('vault.shareModal.title')}</span>
        </Space>
      }
      open={open}
      onCancel={handleClose}
      onOk={() => form.submit()}
      okText={t('vault.shareModal.generateLink')}
      cancelText={t('common.cancel')}
      confirmLoading={shareMutation.isPending}
      okButtonProps={{ style: { background: '#8b5cf6' } }}
      centered
      width={500}
    >
      <div style={{ marginBottom: 24 }}>
        <Text type="secondary">
          {t('vault.shareModal.description')} <strong>{credential?.title}</strong>.
        </Text>
      </div>

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          expires_in: 60,
          max_views: 1,
          has_password: false
        }}
        onFinish={(values) => shareMutation.mutate(values)}
      >
        {/* Expiration */}
        <Form.Item 
          label={<Space><ClockCircleOutlined />{t('vault.shareModal.linkExpiration')}</Space>}
          name="expires_in" 
          rules={[{ required: true }]}
        >
          <Select>
            <Select.Option value={60}>{t('vault.shareModal.hour1')}</Select.Option>
            <Select.Option value={1440}>{t('vault.shareModal.hours24')}</Select.Option>
            <Select.Option value={4320}>{t('vault.shareModal.days3')}</Select.Option>
            <Select.Option value={10080}>{t('vault.shareModal.days7')}</Select.Option>
          </Select>
        </Form.Item>

        {/* Max Views */}
        <Form.Item 
          label={<Space><EyeOutlined />{t('vault.shareModal.maxViews')}</Space>}
          name="max_views"
        >
          <Radio.Group
            optionType="button"
            buttonStyle="solid"
            style={{ width: '100%' }}
          >
            <Radio.Button value={1}>{t('vault.shareModal.oneView')}</Radio.Button>
            <Radio.Button value={5}>5 {t('vault.shareModal.views')}</Radio.Button>
            <Radio.Button value={10}>10 {t('vault.shareModal.views')}</Radio.Button>
            <Radio.Button value={-1}>{t('vault.shareModal.custom')}</Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          shouldUpdate={(prev, curr) => prev.max_views !== curr.max_views}
          noStyle
        >
          {({ getFieldValue }) =>
            getFieldValue('max_views') === -1 && (
              <Form.Item name="custom_max_views" style={{ marginTop: -8 }}>
                <InputNumber min={1} max={100} placeholder={t('vault.shareModal.views')} style={{ width: '100%' }} />
              </Form.Item>
            )
          }
        </Form.Item>

        <Divider style={{ margin: '16px 0' }} />

        {/* Password protection */}
        <Form.Item 
          label={<Space><LockOutlined />{t('vault.shareModal.accessPassword')}</Space>}
          name="has_password" 
          style={{ marginBottom: 12 }}
        >
          <Radio.Group optionType="button" buttonStyle="solid">
            <Radio.Button value={false}>
              <Space size={4}><UnlockOutlined />{t('vault.shareModal.noPasswordToggle')}</Space>
            </Radio.Button>
            <Radio.Button value={true}>
              <Space size={4}><LockOutlined />{t('vault.shareModal.passwordProtected')}</Space>
            </Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Form.Item 
           shouldUpdate={(prev, curr) => prev.has_password !== curr.has_password}
           noStyle
        >
           {({ getFieldValue }) => 
              getFieldValue('has_password') && (
                 <Form.Item 
                    name="password" 
                    help={t('vault.shareModal.accessPasswordHelp')}
                    rules={[{ required: true, message: t('vault.shareModal.passwordRequired') }]}
                 >
                    <Input.Password placeholder={t('vault.shareModal.setPassword')} />
                 </Form.Item>
              )
           }
        </Form.Item>

        <Form.Item name="recipient_email" label={<Space><MailOutlined />{t('vault.shareModal.recipientEmail')}</Space>} style={{ marginTop: 16 }}>
           <Input prefix={<LinkOutlined />} placeholder={t('vault.shareModal.recipientPlaceholder')} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
