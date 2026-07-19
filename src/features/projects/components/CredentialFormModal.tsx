/**
 * Credential Form Modal - Full Vault Parity
 * Dynamic fields based on credential type (SSH shows Host/Port, etc.)
 */

import { useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Row,
  Col,
  Space,
  App,
  Switch,
  Typography,
  Flex,
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  LinkOutlined,
  GlobalOutlined,
  DatabaseOutlined,
  CloudServerOutlined,
  KeyOutlined,
} from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { api, apiClient } from '@/lib/api';
import type { Credential } from '@lsm/types';
import { useInvalidateCredentials } from '@/features/vault/hooks/useInvalidateCredentials';

const { TextArea } = Input;
const { Text } = Typography;

interface CredentialFormModalProps {
  open: boolean;
  onClose: () => void;
  projectId: number;
  credential?: Credential | null;
}

const typeOptions = [
  { label: 'WordPress', value: 'wordpress', icon: <GlobalOutlined /> },
  { label: 'SSH', value: 'ssh', icon: <CloudServerOutlined /> },
  { label: 'FTP', value: 'ftp', icon: <CloudServerOutlined /> },
  { label: 'Database', value: 'database', icon: <DatabaseOutlined /> },
  { label: 'Hosting', value: 'hosting', icon: <CloudServerOutlined /> },
  { label: 'Email', value: 'email', icon: <UserOutlined /> },
  { label: 'API Key', value: 'api', icon: <KeyOutlined /> },
  { label: 'Other', value: 'other', icon: <LockOutlined /> },
];

export function CredentialFormModal({
  open,
  onClose,
  projectId,
  credential,
}: CredentialFormModalProps) {
  const { message } = App.useApp();
  const invalidateCredentials = useInvalidateCredentials();
  const [form] = Form.useForm();
  const isEditMode = !!credential;

  const watchedType = Form.useWatch('type', form);
  const watchedKeyAuth = Form.useWatch('key_auth', form);
  const isSSH = watchedType === 'ssh';
  const isApiKey = watchedType === 'api';

  // Create mutation - same as Vault
  const buildPayload = (values: any) => {
    const { hostname, port, database_name, key_auth, url, url_protocol, ...rest } = values;
    const metadata: any = {};
    if (hostname) metadata.hostname = hostname;
    if (port) metadata.port = port;
    if (database_name) metadata.database_name = database_name;
    if (key_auth) metadata.key_auth = true;
    const fullUrl = url ? `${url_protocol ?? 'https://'}${url}` : null;
    return { ...rest, url: fullUrl, metadata: Object.keys(metadata).length > 0 ? metadata : null };
  };

  const createMutation = useMutation({
    mutationFn: (values: any) => {
      return apiClient.post(`/projects/${projectId}/credentials`, buildPayload(values));
    },
    onSuccess: () => {
      message.success('Credential created successfully');
      invalidateCredentials(projectId);
      handleClose();
    },
    onError: () => {
      message.error('Failed to create credential');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (values: any) => {
      const payload = buildPayload(values);
      if (!payload.password) delete payload.password;
      return api.credentials.update(credential!.id, payload);
    },
    onSuccess: () => {
      message.success('Credential updated successfully');
      invalidateCredentials(projectId);
      handleClose();
    },
    onError: () => {
      message.error('Failed to update credential');
    },
  });

  const handleClose = () => {
    form.resetFields();
    onClose();
  };

  // Set form values when editing
  useEffect(() => {
    if (credential && open) {
      const metadata = credential.metadata || {};
      const rawUrl = credential.url ?? '';
      const protocol = rawUrl.startsWith('http://') ? 'http://' : 'https://';
      const urlPath = rawUrl.replace(/^https?:\/\//, '');
      form.setFieldsValue({
        title: credential.title,
        type: credential.type,
        username: credential.username,
        url: urlPath || undefined,
        url_protocol: protocol,
        note: credential.note,
        hostname: metadata.hostname,
        port: metadata.port,
        database_name: metadata.database_name,
        key_auth: metadata.key_auth || false,
        // Password is not pre-filled for security
      });
    } else if (!credential && open) {
      form.resetFields();
    }
  }, [credential, open, form]);

  const handleSubmit = async (values: any) => {
    if (isEditMode) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  return (
    <Modal
      title={isEditMode ? 'Edit Credential' : 'Add Credential'}
      open={open}
      onCancel={handleClose}
      onOk={() => form.submit()}
      okText={isEditMode ? 'Update' : 'Create'}
      confirmLoading={createMutation.isPending || updateMutation.isPending}
      width={600}
      destroyOnClose
      centered
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ type: 'wordpress' }}
        style={{ marginTop: 16 }}
      >
        <Row gutter={16}>
          <Col span={16}>
            <Form.Item
              name="title"
              label="Title"
              rules={[{ required: true, message: 'Please enter a title' }]}
              help="e.g., 'Production Server', 'Main DB User'"
            >
              <Input placeholder="Credential Title" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="type"
              label="Type"
              rules={[{ required: true, message: 'Please select type' }]}
            >
              <Select placeholder="Select Type">
                {typeOptions.map(opt => (
                  <Select.Option key={opt.value} value={opt.value}>
                    <Space>{opt.icon} {opt.label}</Space>
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {/* Dynamic fields based on type */}
        {(isSSH || watchedType === 'database' || watchedType === 'ftp') && (
          <Row gutter={16}>
            <Col span={18}>
              <Form.Item name="hostname" label="Hostname / IP">
                <Input placeholder="e.g. 192.168.1.1 or db.example.com" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="port" label="Port">
                <Input placeholder={isSSH ? '22' : watchedType === 'ftp' ? '21' : '3306'} />
              </Form.Item>
            </Col>
          </Row>
        )}
        {watchedType === 'database' && (
          <Form.Item name="database_name" label="Database Name">
            <Input placeholder="my_app_db" />
          </Form.Item>
        )}

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="username" label="Username / Login">
              <Input prefix={<UserOutlined />} autoComplete="off" />
            </Form.Item>
          </Col>
          <Col span={12}>
            {isSSH && (
              <Form.Item style={{ marginBottom: 8 }}>
                <Flex align="center" gap={8}>
                  <Form.Item name="key_auth" valuePropName="checked" noStyle>
                    <Switch size="small" onChange={(checked) => {
                      if (checked) form.setFieldsValue({ password: undefined });
                    }} />
                  </Form.Item>
                  <Text type="secondary" style={{ fontSize: 12 }}>Key-based auth (no password)</Text>
                </Flex>
              </Form.Item>
            )}
            {!(isSSH && watchedKeyAuth) && (
              <Form.Item
                name="password"
                label={isEditMode
                  ? (isApiKey ? 'New API Key (leave blank)' : 'New Password (leave blank)')
                  : (isApiKey ? 'API Key' : 'Password')}
                rules={isEditMode || (isSSH && watchedKeyAuth) ? [] : [{ required: true, message: 'Required' }]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder={isApiKey ? 'Enter API key' : '••••••••'}
                  autoComplete="new-password"
                />
              </Form.Item>
            )}
          </Col>
        </Row>

        <Form.Item label="Login URL (Optional)" style={{ marginBottom: 16 }}>
          <Input.Group compact>
            <Form.Item name="url_protocol" noStyle initialValue="https://">
              <Select style={{ width: 100 }}>
                <Select.Option value="https://">https://</Select.Option>
                <Select.Option value="http://">http://</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="url" noStyle>
              <Input style={{ width: 'calc(100% - 100px)' }} placeholder="example.com/wp-admin" />
            </Form.Item>
          </Input.Group>
        </Form.Item>

        <Form.Item name="note" label="Notes">
          <TextArea rows={3} placeholder="Any additional instructions..." />
        </Form.Item>
      </Form>
    </Modal>
  );
}
