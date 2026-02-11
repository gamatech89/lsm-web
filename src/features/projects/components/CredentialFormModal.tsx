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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiClient } from '@/lib/api';
import type { Credential } from '@lsm/types';

const { TextArea } = Input;

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
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const isEditMode = !!credential;

  // Create mutation - same as Vault
  const createMutation = useMutation({
    mutationFn: (values: any) => {
      // Extract metadata fields
      const { hostname, port, database_name, ...rest } = values;
      const metadata: any = {};
      if (hostname) metadata.hostname = hostname;
      if (port) metadata.port = port;
      if (database_name) metadata.database_name = database_name;

      return apiClient.post(`/projects/${projectId}/credentials`, {
        ...rest,
        metadata: Object.keys(metadata).length > 0 ? metadata : null
      });
    },
    onSuccess: () => {
      message.success('Credential created successfully');
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
      queryClient.invalidateQueries({ queryKey: ['vault'] });
      handleClose();
    },
    onError: () => {
      message.error('Failed to create credential');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (values: any) => {
      const { hostname, port, database_name, ...rest } = values;
      const metadata: any = {};
      if (hostname) metadata.hostname = hostname;
      if (port) metadata.port = port;
      if (database_name) metadata.database_name = database_name;

      // Don't send empty password on update
      if (!rest.password) {
        delete rest.password;
      }

      return api.credentials.update(credential!.id, {
        ...rest,
        metadata: Object.keys(metadata).length > 0 ? metadata : null
      });
    },
    onSuccess: () => {
      message.success('Credential updated successfully');
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
      queryClient.invalidateQueries({ queryKey: ['vault'] });
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
      form.setFieldsValue({
        title: credential.title,
        type: credential.type,
        username: credential.username,
        url: credential.url,
        note: credential.note,
        hostname: metadata.hostname,
        port: metadata.port,
        database_name: metadata.database_name,
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
        <Form.Item
          noStyle
          shouldUpdate={(prev, current) => prev.type !== current.type}
        >
          {({ getFieldValue }) => {
            const type = getFieldValue('type');
            return (
              <>
                {(type === 'ssh' || type === 'database' || type === 'ftp') && (
                  <Row gutter={16}>
                    <Col span={18}>
                      <Form.Item name="hostname" label="Hostname / IP">
                        <Input placeholder="e.g. 192.168.1.1 or db.example.com" />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item name="port" label="Port">
                        <Input placeholder={type === 'ssh' ? '22' : type === 'ftp' ? '21' : '3306'} />
                      </Form.Item>
                    </Col>
                  </Row>
                )}
                {type === 'database' && (
                  <Form.Item name="database_name" label="Database Name">
                    <Input placeholder="my_app_db" />
                  </Form.Item>
                )}
              </>
            );
          }}
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="username" label="Username / Login">
              <Input prefix={<UserOutlined />} autoComplete="off" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              noStyle
              shouldUpdate={(prev, current) => prev.type !== current.type}
            >
              {({ getFieldValue }) => {
                const type = getFieldValue('type');
                const isApiKey = type === 'api';
                return (
                  <Form.Item
                    name="password"
                    label={isEditMode 
                      ? (isApiKey ? 'New API Key (leave blank)' : 'New Password (leave blank)')
                      : (isApiKey ? 'API Key' : 'Password')}
                    rules={isEditMode ? [] : [{ required: true, message: 'Required' }]}
                  >
                    <Input.Password
                      prefix={<LockOutlined />}
                      placeholder={isApiKey ? 'Enter API key' : '••••••••'}
                      autoComplete="new-password"
                    />
                  </Form.Item>
                );
              }}
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="url" label="Login URL (Optional)">
          <Input prefix={<LinkOutlined />} placeholder="https://example.com/wp-admin" />
        </Form.Item>

        <Form.Item name="note" label="Notes">
          <TextArea rows={3} placeholder="Any additional instructions..." />
        </Form.Item>
      </Form>
    </Modal>
  );
}
