/**
 * Library Resources Page
 * 
 * Manage global shared files that can be linked to multiple projects.
 * Upload, edit, delete library resources and see usage across projects.
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Typography,
  Button,
  Table,
  Tag,
  Space,
  Dropdown,
  Modal,
  Form,
  Input,
  Select,
  Upload,
  App,
  Empty,
  Tooltip,
  Badge,
} from 'antd';
import type { MenuProps, TableProps, UploadFile } from 'antd';
import {
  PlusOutlined,
  FolderOpenOutlined,
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  UploadOutlined,
  FileTextOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useThemeStore } from '@/stores/theme';
import type { LibraryResource } from '@/lib/library-resources-api';

const { Title, Text } = Typography;

/* ── responsive hook ─────────────────────────────── */
const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);
  return matches;
};

export default function LibraryResourcesPage() {
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const { t } = useTranslation();
  const isMobile = useMediaQuery('(max-width: 767px)');

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingResource, setEditingResource] = useState<LibraryResource | null>(null);
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  // Fetch library resources
  const { data: resources = [], isLoading } = useQuery({
    queryKey: ['library-resources'],
    queryFn: () => api.libraryResources.getAll().then(r => r.data.data || r.data || []),
  });

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['library-resources-categories'],
    queryFn: () => api.libraryResources.getCategories().then(r => r.data.data || r.data),
  });

  const categories = categoriesData?.categories || [];
  const suggestedCategories = categoriesData?.suggested || ['guides', 'templates', 'security', 'documentation', 'checklists'];

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: FormData) => api.libraryResources.create(data),
    onSuccess: () => {
      message.success(t('library.messages.uploaded'));
      queryClient.invalidateQueries({ queryKey: ['library-resources'] });
      setShowUploadModal(false);
      form.resetFields();
      setFileList([]);
    },
    onError: () => {
      message.error(t('library.messages.uploadError'));
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: FormData }) => 
      api.libraryResources.update(id, data),
    onSuccess: () => {
      message.success(t('library.messages.updated'));
      queryClient.invalidateQueries({ queryKey: ['library-resources'] });
      setEditingResource(null);
      form.resetFields();
      setFileList([]);
    },
    onError: () => {
      message.error(t('library.messages.updateError'));
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.libraryResources.delete(id),
    onSuccess: () => {
      message.success(t('library.messages.deleted'));
      queryClient.invalidateQueries({ queryKey: ['library-resources'] });
    },
    onError: () => {
      message.error(t('library.messages.deleteError'));
    },
  });

  const handleSubmit = (values: { title: string; category?: string; notes?: string }) => {
    const formData = new FormData();
    formData.append('title', values.title);
    if (values.category) formData.append('category', values.category);
    if (values.notes) formData.append('notes', values.notes);

    if (editingResource) {
      if (fileList.length > 0 && fileList[0].originFileObj) {
        formData.append('file', fileList[0].originFileObj);
      }
      updateMutation.mutate({ id: editingResource.id, data: formData });
    } else {
      if (fileList.length > 0 && fileList[0].originFileObj) {
        formData.append('file', fileList[0].originFileObj);
        createMutation.mutate(formData);
      } else {
        message.error(t('library.selectFileError'));
      }
    }
  };

  const handleDownload = async (resource: LibraryResource) => {
    try {
      const response = await api.libraryResources.download(resource.id);
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = resource.file_name || 'download';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      message.error(t('library.messages.downloadError'));
    }
  };

  const openEditModal = (resource: LibraryResource) => {
    setEditingResource(resource);
    form.setFieldsValue({
      title: resource.title,
      category: resource.category,
      notes: resource.notes,
    });
    setFileList([]);
  };

  const columns: TableProps<LibraryResource>['columns'] = [
    {
      title: t('library.table.title'),
      dataIndex: 'title',
      key: 'title',
      render: (title: string) => (
        <Space>
          <FileTextOutlined style={{ color: '#a855f7' }} />
          <Text strong>{title}</Text>
        </Space>
      ),
    },
    {
      title: t('library.table.category'),
      dataIndex: 'category',
      key: 'category',
      width: 140,
      render: (category: string) => category ? <Tag color="purple">{category}</Tag> : '-',
      filters: [...new Set(resources.map((r: LibraryResource) => r.category).filter(Boolean))].map(cat => ({
        text: cat as string,
        value: cat as string,
      })),
      onFilter: (value, record) => record.category === value,
    },
    {
      title: t('library.table.file'),
      dataIndex: 'file_name',
      key: 'file_name',
      render: (fileName: string, record: LibraryResource) => (
        <Tooltip title={t('library.clickToDownload')}>
          <Button 
            type="link" 
            size="small" 
            icon={<DownloadOutlined />}
            onClick={() => handleDownload(record)}
            style={{ padding: 0 }}
          >
            {fileName} ({record.formatted_file_size})
          </Button>
        </Tooltip>
      ),
    },
    {
      title: t('library.table.usedIn'),
      dataIndex: 'projects_count',
      key: 'projects_count',
      width: 100,
      render: (count: number) => (
        <Badge 
          count={count || 0} 
          showZero 
          color={count > 0 ? '#22c55e' : '#94a3b8'}
          style={{ fontWeight: 600 }}
        />
      ),
      sorter: (a, b) => (a.projects_count || 0) - (b.projects_count || 0),
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      render: (_: any, record: LibraryResource) => {
        const items: MenuProps['items'] = [
          {
            key: 'download',
            icon: <DownloadOutlined />,
            label: t('common.download'),
            onClick: () => handleDownload(record),
          },
          {
            key: 'edit',
            icon: <EditOutlined />,
            label: t('common.edit'),
            onClick: () => openEditModal(record),
          },
          {
            type: 'divider',
          },
          {
            key: 'delete',
            icon: <DeleteOutlined />,
            label: t('common.delete'),
            danger: true,
            onClick: () => {
              Modal.confirm({
                title: t('library.deleteConfirm.title'),
                content: record.projects_count && record.projects_count > 0 
                  ? t('library.deleteConfirm.linkedWarning', { count: record.projects_count })
                  : t('library.deleteConfirm.noUndo'),
                okText: t('common.delete'),
                cancelText: t('common.cancel'),
                okButtonProps: { danger: true },
                onOk: () => deleteMutation.mutate(record.id),
              });
            },
          },
        ];
        return (
          <Dropdown menu={{ items }} trigger={['click']}>
            <Button type="text" icon={<MoreOutlined />} size="small" />
          </Dropdown>
        );
      },
    },
  ];

  const allCategories = [...new Set([...categories, ...suggestedCategories])];

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'stretch' : 'center',
        gap: isMobile ? 12 : 0,
        marginBottom: 24,
      }}>
        <div>
          <Title level={3} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
            <FolderOpenOutlined style={{ color: '#a855f7' }} />
            {t('library.title')}
          </Title>
          <Text type="secondary">
            {t('library.subtitle')}
          </Text>
        </div>
        <Button 
          type="primary" 
          icon={<UploadOutlined />} 
          onClick={() => {
            setEditingResource(null);
            form.resetFields();
            setFileList([]);
            setShowUploadModal(true);
          }}
          style={isMobile ? { width: '100%' } : undefined}
        >
          {t('library.uploadFile')}
        </Button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <Card size="small" style={{ flex: 1, background: isDark ? '#1e293b' : '#f8fafc' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#a855f7' }}>{resources.length}</div>
            <Text type="secondary">{t('library.stats.totalFiles')}</Text>
          </div>
        </Card>
        <Card size="small" style={{ flex: 1, background: isDark ? '#1e293b' : '#f8fafc' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#22c55e' }}>
              {resources.filter((r: LibraryResource) => (r.projects_count || 0) > 0).length}
            </div>
            <Text type="secondary">{t('library.stats.inUse')}</Text>
          </div>
        </Card>
        <Card size="small" style={{ flex: 1, background: isDark ? '#1e293b' : '#f8fafc' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#3b82f6' }}>
              {[...new Set(resources.map((r: LibraryResource) => r.category).filter(Boolean))].length}
            </div>
            <Text type="secondary">{t('library.stats.categories')}</Text>
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card
        style={{
          borderRadius: 12,
          background: isDark ? '#1e293b' : '#fff',
        }}
        styles={{ body: { padding: 0 } }}
      >
        {resources.length > 0 ? (
          <Table
            dataSource={resources as LibraryResource[]}
            columns={columns}
            rowKey="id"
            loading={isLoading}
            scroll={{ x: 600 }}
            pagination={resources.length > 10 ? { 
              pageSize: 10,
              showSizeChanger: !isMobile,
              size: isMobile ? 'small' : 'default',
            } : false}
            size="middle"
          />
        ) : (
          <Empty
            image={<FolderOpenOutlined style={{ fontSize: 48, color: '#94a3b8' }} />}
            description={
              <div style={{ padding: 24 }}>
                <Text type="secondary">{t('library.noResources')}</Text>
                <div style={{ marginTop: 16 }}>
                  <Button 
                    type="primary" 
                    icon={<UploadOutlined />}
                    onClick={() => setShowUploadModal(true)}
                  >
                    {t('library.uploadFirstFile')}
                  </Button>
                </div>
              </div>
            }
            style={{ padding: 48 }}
          />
        )}
      </Card>

      {/* Usage Info */}
      <Card size="small" style={{ marginTop: 16, background: isDark ? '#1e293b' : '#f8fafc' }}>
        <Space>
          <LinkOutlined style={{ color: '#3b82f6' }} />
          <Text type="secondary">
            <strong>{t('library.tipLabel')}</strong> {t('library.tip')}
          </Text>
        </Space>
      </Card>

      {/* Upload/Edit Modal */}
      <Modal
        title={editingResource ? t('library.editResource') : t('library.uploadToLibrary')}
        open={showUploadModal || !!editingResource}
        onCancel={() => {
          setShowUploadModal(false);
          setEditingResource(null);
          form.resetFields();
          setFileList([]);
        }}
        onOk={() => form.submit()}
        okText={editingResource ? t('common.update') : t('common.upload')}
        cancelText={t('common.cancel')}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="title"
            label={t('library.form.title')}
            rules={[{ required: true, message: t('library.form.titleRequired') }]}
          >
            <Input placeholder={t('library.form.titlePlaceholder')} />
          </Form.Item>

          <Form.Item
            name="category"
            label={t('library.form.category')}
          >
            <Select
              placeholder={t('library.form.categoryPlaceholder')}
              allowClear
              showSearch
              options={allCategories.map(cat => ({ label: cat, value: cat }))}
            />
          </Form.Item>

          <Form.Item
            label={editingResource ? t('library.replaceFile') : t('library.file')}
            required={!editingResource}
          >
            <Upload
              fileList={fileList}
              onChange={({ fileList }) => setFileList(fileList)}
              beforeUpload={() => false}
              maxCount={1}
            >
              <Button icon={<UploadOutlined />}>
                {editingResource ? t('library.selectNewFile') : t('library.selectFile')}
              </Button>
            </Upload>
            {editingResource && (
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                {t('library.current')}: {editingResource.file_name}
              </Text>
            )}
          </Form.Item>

          <Form.Item
            name="notes"
            label={t('library.form.notes')}
          >
            <Input.TextArea rows={2} placeholder={t('library.form.notesPlaceholder')} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
