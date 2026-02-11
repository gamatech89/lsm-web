/**
 * Tags Page
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Table,
  Button,
  Tag,
  Typography,
  Row,
  Col,
  Space,
  Modal,
  Form,
  Input,
  ColorPicker,
  App,
} from 'antd';
import {
  TagsOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Tag as TagType } from '@lsm/types';
import type { ColumnsType } from 'antd/es/table';
import type { Color } from 'antd/es/color-picker';

const { Title, Text } = Typography;

export function TagsPage() {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  
  const [showModal, setShowModal] = useState(false);
  const [editingTag, setEditingTag] = useState<TagType | null>(null);
  const [form] = Form.useForm();
  const { t } = useTranslation();

  // Fetch tags
  const { data, isLoading } = useQuery({
    queryKey: ['tags'],
    queryFn: () => api.tags.list().then(r => r.data.data),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: { name: string; color?: string }) => api.tags.create(data),
    onSuccess: () => {
      message.success(t('tags.messages.created'));
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      setShowModal(false);
      form.resetFields();
    },
    onError: () => {
      message.error(t('common.saveError'));
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; color?: string } }) =>
      api.tags.update(id, data),
    onSuccess: () => {
      message.success(t('tags.messages.updated'));
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      setShowModal(false);
      setEditingTag(null);
      form.resetFields();
    },
    onError: () => {
      message.error(t('common.saveError'));
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.tags.delete(id),
    onSuccess: () => {
      message.success(t('tags.messages.deleted'));
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
    onError: () => {
      message.error(t('common.deleteError'));
    },
  });

  const handleSubmit = async (values: { name: string; color?: Color | string }) => {
    const colorValue = typeof values.color === 'object' 
      ? values.color.toHexString() 
      : values.color;
    
    const data = {
      name: values.name,
      color: colorValue,
    };

    if (editingTag) {
      updateMutation.mutate({ id: editingTag.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (tag: TagType) => {
    setEditingTag(tag);
    form.setFieldsValue({
      name: tag.name,
      color: tag.color || '#6366f1',
    });
    setShowModal(true);
  };

  const handleDelete = (tag: TagType) => {
    modal.confirm({
      title: t('tags.deleteTag'),
      content: t('common.confirmDelete'),
      okText: t('common.delete'),
      okType: 'danger',
      onOk: () => deleteMutation.mutate(tag.id),
    });
  };

  const columns: ColumnsType<TagType> = [
    {
      title: t('tags.table.tag'),
      key: 'tag',
      render: (_, record) => (
        <Tag color={record.color || 'default'} style={{ margin: 0 }}>
          {record.name}
        </Tag>
      ),
    },
    {
      title: t('tags.table.slug'),
      dataIndex: 'slug',
      key: 'slug',
      render: (slug) => <Text code>{slug}</Text>,
    },
    {
      title: t('tags.table.projects'),
      key: 'projects',
      width: 100,
      render: (_, record) => (
        <Text type="secondary">{record.projects_count || 0} {t('tags.table.projects').toLowerCase()}</Text>
      ),
    },
    {
      title: t('tags.table.actions'),
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          />
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
            <TagsOutlined style={{ fontSize: 24, color: '#6366f1' }} />
            <div>
              <Title level={3} style={{ margin: 0 }}>{t('tags.title')}</Title>
              <Text type="secondary">
                {t('tags.subtitle')}
              </Text>
            </div>
          </Space>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingTag(null);
              form.resetFields();
              form.setFieldsValue({ color: '#6366f1' });
              setShowModal(true);
            }}
          >
            {t('tags.newTag')}
          </Button>
        </Col>
      </Row>

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
        title={editingTag ? t('tags.editTag') : t('tags.createTag')}
        open={showModal}
        onCancel={() => {
          setShowModal(false);
          setEditingTag(null);
          form.resetFields();
        }}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ marginTop: 24 }}
          initialValues={{ color: '#6366f1' }}
        >
          <Form.Item
            name="name"
            label={t('tags.form.name')}
            rules={[{ required: true, message: t('tags.form.nameRequired') }]}
          >
            <Input placeholder={t('tags.form.namePlaceholder')} />
          </Form.Item>

          <Form.Item
            name="color"
            label={t('tags.form.color')}
          >
            <ColorPicker format="hex" showText />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ float: 'right' }}>
              <Button onClick={() => setShowModal(false)}>{t('common.cancel')}</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingTag ? t('common.update') : t('common.create')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
