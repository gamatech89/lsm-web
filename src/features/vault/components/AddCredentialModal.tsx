import { Modal, Form, Input, Select, Typography, Row, Col, Space, message, App } from 'antd';
import { useTranslation } from 'react-i18next';
import { 
  LockOutlined,
  GlobalOutlined,
  DatabaseOutlined,
  CloudServerOutlined,
  UserOutlined,
  KeyOutlined
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiClient } from '@/lib/api';

const { TextArea } = Input;

interface AddCredentialModalProps {
  open: boolean;
  onClose: () => void;
}

export function AddCredentialModal({ open, onClose }: AddCredentialModalProps) {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { message: antdMessage } = App.useApp ? App.useApp() : { message };

  const typeOptions = [
    { label: t('vault.types.wordpress'), value: 'wordpress', icon: <GlobalOutlined /> },
    { label: t('vault.types.ssh'), value: 'ssh', icon: <CloudServerOutlined /> },
    { label: t('vault.types.ftp'), value: 'ftp', icon: <CloudServerOutlined /> },
    { label: t('vault.types.database'), value: 'database', icon: <DatabaseOutlined /> },
    { label: t('vault.types.hosting'), value: 'hosting', icon: <CloudServerOutlined /> },
    { label: t('vault.types.email'), value: 'email', icon: <UserOutlined /> },
    { label: t('vault.types.apiKey'), value: 'api', icon: <KeyOutlined /> },
    { label: t('vault.types.other'), value: 'other', icon: <LockOutlined /> },
  ];

  // Fetch Projects for Selector
  const { data: projectsData, isLoading: isLoadingProjects } = useQuery({
    queryKey: ['projects', 'list'],
    queryFn: () => api.projects.list().then(r => r.data.data),
    enabled: open
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (values: any) => {
      const { hostname, port, database_name, ...rest } = values;
      const metadata: any = {};
      if (hostname) metadata.hostname = hostname;
      if (port) metadata.port = port;
      if (database_name) metadata.database_name = database_name;

      return apiClient.post(`/projects/${values.project_id}/credentials`, {
        ...rest,
        metadata: Object.keys(metadata).length > 0 ? metadata : null
      });
    },
    onSuccess: () => {
      antdMessage.success(t('vault.messages.created'));
      queryClient.invalidateQueries({ queryKey: ['vault'] });
      handleClose();
    },
    onError: () => {
      antdMessage.error(t('vault.messages.createError'));
    }
  });

  const handleClose = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title={t('vault.addNewCredential')}
      open={open}
      onCancel={handleClose}
      onOk={() => form.submit()}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      confirmLoading={createMutation.isPending}
      width={600}
      centered
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => createMutation.mutate(values)}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item 
              name="project_id" 
              label={t('vault.form.project')} 
              rules={[{ required: true, message: t('vault.form.selectRequired') }]}
            >
              <Select 
                placeholder={t('vault.form.selectProject')} 
                loading={isLoadingProjects}
                showSearch
                optionFilterProp="label"
                options={projectsData?.map((p: any) => ({ label: p.name, value: p.id }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
             <Form.Item 
              name="type" 
              label={t('vault.table.type')} 
              rules={[{ required: true, message: t('vault.form.typeRequired') }]}
             >
                <Select placeholder={t('vault.form.selectType')}>
                   {typeOptions.map(opt => (
                      <Select.Option key={opt.value} value={opt.value}>
                         <Space>{opt.icon} {opt.label}</Space>
                      </Select.Option>
                   ))}
                </Select>
             </Form.Item>
          </Col>
        </Row>

        <Form.Item 
           name="title" 
           label={t('vault.form.title')} 
           rules={[{ required: true }]}
           help={t('vault.form.titleHelp')}
        >
           <Input placeholder={t('vault.form.titlePlaceholder')} />
        </Form.Item>

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
                                <Form.Item name="hostname" label={t('vault.form.hostnameIp')}>
                                   <Input placeholder={t('vault.form.hostnamePlaceholder')} />
                                </Form.Item>
                             </Col>
                             <Col span={6}>
                                <Form.Item name="port" label={t('vault.form.port')}>
                                   <Input placeholder={type === 'ssh' ? '22' : '3306'} />
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

        <Row gutter={16}>
           <Col span={12}>
              <Form.Item name="username" label={t('vault.form.usernameLogin')}>
                 <Input autoComplete="off" />
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
                      label={isApiKey ? t('vault.types.apiKey') : t('vault.form.passwordApiKey')}
                    >
                       <Input.Password 
                          placeholder={isApiKey ? t('vault.form.apiKeyPlaceholder') : t('vault.form.passwordPlaceholder')} 
                          autoComplete="new-password" 
                       />
                    </Form.Item>
                  );
                }}
              </Form.Item>
           </Col>
        </Row>

        <Form.Item name="url" label={t('vault.form.loginUrl')}>
           <Input placeholder={t('vault.form.urlPlaceholder')} />
        </Form.Item>

        <Form.Item name="note" label={t('vault.form.notes')}>
           <TextArea rows={3} placeholder={t('vault.form.notesPlaceholder')} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
