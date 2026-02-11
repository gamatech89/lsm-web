/**
 * Team Page
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Table,
  Input,
  InputNumber,
  Select,
  Button,
  Tag,
  Typography,
  Row,
  Col,
  Space,
  Avatar,
  Modal,
  Form,
  App,
} from 'antd';
import {
  SearchOutlined,
  TeamOutlined,
  PlusOutlined,
  UserOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getRoleConfig } from '@lsm/utils';
import { useIsAdmin } from '@/stores/auth';
import type { User, CreateUserRequest } from '@lsm/types';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

const roleOptions = [
  { labelKey: 'team.roles.admin', value: 'admin' },
  { labelKey: 'team.roles.manager', value: 'manager' },
  { labelKey: 'team.roles.developer', value: 'developer' },
];

export function TeamPage() {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const isAdmin = useIsAdmin();
  const { t } = useTranslation();
  
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | undefined>();
  const [tagFilter, setTagFilter] = useState<string | undefined>();
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form] = Form.useForm();

  // Fetch team
  const { data, isLoading } = useQuery({
    queryKey: ['team', { search, role: roleFilter, tag: tagFilter }],
    queryFn: () => api.team.list({ search, role: roleFilter, tag: tagFilter } as any).then(r => r.data.data),
  });

  // Fetch tags for filter and form
  const { data: tags } = useQuery({
    queryKey: ['tags'],
    queryFn: () => api.tags.list().then(r => r.data.data),
    staleTime: 1000 * 60 * 5,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateUserRequest) => api.team.create(data),
    onSuccess: () => {
      message.success(t('team.messages.created'));
      queryClient.invalidateQueries({ queryKey: ['team'] });
      setShowModal(false);
      form.resetFields();
    },
    onError: () => {
      message.error(t('common.saveError'));
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateUserRequest> }) =>
      api.team.update(id, data),
    onSuccess: () => {
      message.success(t('team.messages.updated'));
      queryClient.invalidateQueries({ queryKey: ['team'] });
      setShowModal(false);
      setEditingUser(null);
      form.resetFields();
    },
    onError: () => {
      message.error(t('common.saveError'));
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.team.delete(id),
    onSuccess: () => {
      message.success(t('team.messages.deleted'));
      queryClient.invalidateQueries({ queryKey: ['team'] });
    },
    onError: () => {
      message.error(t('common.deleteError'));
    },
  });

  const handleSubmit = async (values: CreateUserRequest) => {
    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    form.setFieldsValue({
      name: user.name,
      email: user.email,
      role: user.role,
      hourly_rate: (user as any).hourly_rate ?? 22,
      tag_ids: (user as any).tags?.map((tag: any) => tag.id) || [],
    });
    setShowModal(true);
  };

  const handleDelete = (user: User) => {
    modal.confirm({
      title: t('team.deleteMember'),
      content: `${t('common.confirmDelete')}`,
      okText: t('common.delete'),
      okType: 'danger',
      onOk: () => deleteMutation.mutate(user.id),
    });
  };

  const columns: ColumnsType<User> = [
    {
      title: t('team.table.user'),
      key: 'user',
      render: (_, record) => (
        <Space>
          <Avatar style={{ backgroundColor: '#6366f1' }}>
            {record.name.charAt(0).toUpperCase()}
          </Avatar>
          <div>
            <Text strong>{record.name}</Text>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.email}
              </Text>
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: t('team.table.role'),
      key: 'role',
      width: 120,
      render: (_, record) => {
        const config = getRoleConfig(record.role);
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: t('team.table.tags'),
      key: 'tags',
      width: 150,
      render: (_, record) => {
        const userTags = (record as any).tags || [];
        return (
          <Space size={4} wrap>
            {userTags.map((tag: any) => (
              <Tag key={tag.id} color={tag.color || 'default'} style={{ margin: 0 }}>
                {tag.name}
              </Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: t('team.table.actions'),
      key: 'actions',
      width: 140,
      render: (_, record) =>
        isAdmin && (
          <Space size="small">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              style={{ color: '#64748b' }}
            >
              {t('common.edit')}
            </Button>
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
            >
              {t('common.delete')}
            </Button>
          </Space>
        ),
    },
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Space>
            <TeamOutlined style={{ fontSize: 24, color: '#6366f1' }} />
            <div>
              <Title level={3} style={{ margin: 0 }}>{t('team.title')}</Title>
              <Text type="secondary">
                {t('team.subtitle')}
              </Text>
            </div>
          </Space>
        </Col>
        {isAdmin && (
          <Col>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingUser(null);
                form.resetFields();
                setShowModal(true);
              }}
            >
              {t('team.addMember')}
            </Button>
          </Col>
        )}
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: 16, borderRadius: 12 }} styles={{ body: { padding: 16 } }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder={t('team.searchPlaceholder')}
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              style={{ width: '100%' }}
              value={roleFilter}
              onChange={setRoleFilter}
              options={[
                { label: t('team.filters.allRoles'), value: undefined },
                ...roleOptions.map(r => ({ label: t(r.labelKey), value: r.value })),
              ]}
              placeholder={t('team.filterByRole')}
              allowClear
            />
          </Col>
          {tags && tags.length > 0 && (
            <Col xs={24} sm={12} md={6}>
              <Select
                style={{ width: '100%' }}
                value={tagFilter || undefined}
                onChange={(value) => setTagFilter(value || undefined)}
                options={[
                  { label: t('team.filters.allTags'), value: '' },
                  ...tags.map((tag: any) => ({ label: tag.name, value: tag.slug })),
                ]}
                placeholder={t('team.filterByTag')}
                allowClear
              />
            </Col>
          )}
        </Row>
      </Card>

      {/* Table */}
      <Card style={{ borderRadius: 12 }} styles={{ body: { padding: 0 } }}>
        <Table
          columns={columns}
          dataSource={data || []}
          rowKey="id"
          loading={isLoading}
          pagination={false}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={editingUser ? t('team.editMember') : t('team.addMember')}
        open={showModal}
        onCancel={() => {
          setShowModal(false);
          setEditingUser(null);
          form.resetFields();
        }}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ marginTop: 24 }}
        >
          <Form.Item
            name="name"
            label={t('team.form.name')}
            rules={[{ required: true, message: t('team.form.namePlaceholder') }]}
          >
            <Input prefix={<UserOutlined />} placeholder={t('team.form.namePlaceholder')} />
          </Form.Item>

          <Form.Item
            name="email"
            label={t('team.form.email')}
            rules={[
              { required: true, message: t('team.form.emailPlaceholder') },
              { type: 'email', message: t('team.form.emailPlaceholder') },
            ]}
          >
            <Input placeholder={t('team.form.emailPlaceholder')} />
          </Form.Item>

          {!editingUser && (
            <Form.Item
              name="password"
              label={t('team.form.password')}
              rules={[{ required: true, message: t('team.form.passwordPlaceholder') }]}
            >
              <Input.Password placeholder={t('team.form.passwordPlaceholder')} />
            </Form.Item>
          )}

          <Form.Item
            name="role"
            label={t('team.form.role')}
            rules={[{ required: true, message: t('team.form.selectRole') }]}
          >
            <Select
              options={roleOptions.map(r => ({ label: t(r.labelKey), value: r.value }))}
              placeholder={t('team.form.selectRole')}
            />
          </Form.Item>

          <Form.Item
            name="hourly_rate"
            label={t('team.form.hourlyRate')}
            initialValue={22}
            rules={[{ required: true, message: t('team.form.hourlyRatePlaceholder') }]}
          >
            <InputNumber 
              min={0} 
              max={500} 
              step={0.5}
              style={{ width: '100%' }}
              addonBefore="$"
              addonAfter="/hr"
            />
          </Form.Item>

          {tags && tags.length > 0 && (
            <Form.Item name="tag_ids" label={t('team.form.tags')}>
              <Select
                mode="multiple"
                options={tags.map((tag: any) => ({ label: tag.name, value: tag.id }))}
                placeholder={t('team.form.selectTags')}
                allowClear
              />
            </Form.Item>
          )}

          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ float: 'right' }}>
              <Button onClick={() => setShowModal(false)}>{t('common.cancel')}</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingUser ? t('common.update') : t('common.create')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
