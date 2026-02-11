/**
 * Resources Section - Project Resources & Links
 * 
 * Displays project resources: Links (project-specific) and Library Files (shared).
 * - Links: External URLs like design files, documentation
 * - Library Files: Shared files from the resource library linked to this project
 */

import { useState } from 'react';
import {
  Card,
  Typography,
  Button,
  Empty,
  Table,
  Tag,
  Space,
  Dropdown,
  App,
  Modal,
  Select,
  Tabs,
} from 'antd';
import type { MenuProps, TableProps } from 'antd';
import {
  PlusOutlined,
  LinkOutlined,
  FileTextOutlined,
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  FolderOpenOutlined,
  DisconnectOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useThemeStore } from '@/stores/theme';
import { ResourceFormModal } from '../ResourceFormModal';

const { Title, Text } = Typography;

interface ResourcesSectionProps {
  project: any;
}

const typeConfig = {
  link: { icon: LinkOutlined, color: 'blue', label: 'Link' },
  file: { icon: FileTextOutlined, color: 'green', label: 'File' },
  library: { icon: FolderOpenOutlined, color: 'purple', label: 'Library' },
};

export default function ResourcesSection({ project }: ResourcesSectionProps) {
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingResource, setEditingResource] = useState<any>(null);
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [selectedLibraryItem, setSelectedLibraryItem] = useState<number | null>(null);

  // Project resources (links and files)
  const resources = project.resources || [];
  
  // Library resources linked to this project
  const libraryResources = project.library_resources || [];

  // Fetch all available library resources
  const { data: allLibraryResources } = useQuery({
    queryKey: ['library-resources'],
    queryFn: () => api.libraryResources.getAll().then(r => r.data.data || r.data),
    staleTime: 5 * 60 * 1000,
  });

  // Delete mutation for project resources
  const deleteMutation = useMutation({
    mutationFn: (resourceId: number) => api.resources.delete(resourceId),
    onSuccess: () => {
      message.success('Resource deleted');
      queryClient.invalidateQueries({ queryKey: ['projects', project.id] });
    },
  });

  // Unlink library resource mutation
  const unlinkMutation = useMutation({
    mutationFn: (libraryResourceId: number) => 
      api.libraryResources.unlinkFromProject(libraryResourceId, project.id),
    onSuccess: () => {
      message.success('Library resource unlinked');
      queryClient.invalidateQueries({ queryKey: ['projects', project.id] });
    },
    onError: () => {
      message.error('Failed to unlink resource');
    },
  });

  // Link library resource mutation
  const linkMutation = useMutation({
    mutationFn: (libraryResourceId: number) => 
      api.libraryResources.linkToProject(libraryResourceId, project.id),
    onSuccess: () => {
      message.success('Library resource linked');
      queryClient.invalidateQueries({ queryKey: ['projects', project.id] });
      setShowLibraryModal(false);
      setSelectedLibraryItem(null);
    },
    onError: () => {
      message.error('Failed to link resource');
    },
  });

  // Columns for project resources (links/files)
  const resourceColumns: TableProps<any>['columns'] = [
    {
      title: 'Name',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: any) => {
        const config = typeConfig[record.type as keyof typeof typeConfig] || typeConfig.link;
        const Icon = config.icon;
        return (
          <Space>
            <Icon style={{ color: isDark ? '#94a3b8' : '#64748b' }} />
            <Text strong>{title}</Text>
          </Space>
        );
      },
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: keyof typeof typeConfig) => {
        const config = typeConfig[type] || typeConfig.link;
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: 'URL / File',
      key: 'value',
      render: (_: any, record: any) => {
        if (record.url) {
          return (
            <a href={record.url} target="_blank" rel="noopener noreferrer">
              {record.url.length > 50 ? record.url.substring(0, 50) + '...' : record.url}
            </a>
          );
        }
        if (record.file_name) {
          return <Text type="secondary">{record.file_name}</Text>;
        }
        return '-';
      },
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      render: (_: any, record: any) => {
        const items: MenuProps['items'] = [
          {
            key: 'edit',
            icon: <EditOutlined />,
            label: 'Edit',
            onClick: () => setEditingResource(record),
          },
          {
            key: 'delete',
            icon: <DeleteOutlined />,
            label: 'Delete',
            danger: true,
            onClick: () => deleteMutation.mutate(record.id),
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

  // Columns for library resources
  const libraryColumns: TableProps<any>['columns'] = [
    {
      title: 'File Name',
      dataIndex: 'title',
      key: 'title',
      render: (title: string) => (
        <Space>
          <FolderOpenOutlined style={{ color: '#a855f7' }} />
          <Text strong>{title}</Text>
        </Space>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category: string) => category ? <Tag>{category}</Tag> : '-',
    },
    {
      title: 'File',
      dataIndex: 'file_name',
      key: 'file_name',
      render: (fileName: string, record: any) => (
        <Text type="secondary">{fileName} ({record.formatted_file_size || 'N/A'})</Text>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 100,
      render: (_: any, record: any) => {
        const items: MenuProps['items'] = [
          {
            key: 'download',
            icon: <DownloadOutlined />,
            label: 'Download',
            onClick: async () => {
              try {
                const response = await api.libraryResources.download(record.id);
                const blob = new Blob([response.data]);
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = record.file_name || 'download';
                a.click();
                window.URL.revokeObjectURL(url);
              } catch {
                message.error('Failed to download file');
              }
            },
          },
          {
            type: 'divider',
          },
          {
            key: 'unlink',
            icon: <DisconnectOutlined />,
            label: 'Unlink from Project',
            danger: true,
            onClick: () => unlinkMutation.mutate(record.id),
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

  // Get library resources not already linked
  const availableLibraryResources = (allLibraryResources || []).filter(
    (lr: any) => !libraryResources.some((linked: any) => linked.id === lr.id)
  );

  const linkResources = resources.filter((r: any) => r.type === 'link');
  const fileResources = resources.filter((r: any) => r.type === 'file');
  const totalCount = resources.length + libraryResources.length;

  return (
    <div style={{ padding: '24px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Title level={5} style={{ margin: 0 }}>Resources</Title>
          <Text type="secondary">{totalCount} resources</Text>
        </div>
        <Space>
          <Button icon={<FolderOpenOutlined />} onClick={() => setShowLibraryModal(true)}>
            Link from Library
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCreateModal(true)}>
            Add Link/File
          </Button>
        </Space>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <Card size="small" style={{ flex: 1, background: isDark ? '#1e293b' : '#f8fafc' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#3b82f6' }}>{linkResources.length}</div>
            <Text type="secondary">Links</Text>
          </div>
        </Card>
        <Card size="small" style={{ flex: 1, background: isDark ? '#1e293b' : '#f8fafc' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#22c55e' }}>{fileResources.length}</div>
            <Text type="secondary">Files</Text>
          </div>
        </Card>
        <Card size="small" style={{ flex: 1, background: isDark ? '#1e293b' : '#f8fafc' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#a855f7' }}>{libraryResources.length}</div>
            <Text type="secondary">Library</Text>
          </div>
        </Card>
      </div>

      {/* Content */}
      {totalCount > 0 ? (
        <Card
          style={{
            borderRadius: 12,
            background: isDark ? '#1e293b' : '#fff',
          }}
          styles={{ body: { padding: 0 } }}
        >
          <Tabs
            defaultActiveKey="links"
            style={{ padding: '12px 16px 0' }}
            items={[
              {
                key: 'links',
                label: `Links & Files (${resources.length})`,
                children: resources.length > 0 ? (
                  <Table
                    dataSource={resources}
                    columns={resourceColumns}
                    rowKey="id"
                    pagination={false}
                    size="middle"
                  />
                ) : (
                  <Empty description="No links or files added" style={{ padding: 24 }} />
                ),
              },
              {
                key: 'library',
                label: `Library Files (${libraryResources.length})`,
                children: libraryResources.length > 0 ? (
                  <Table
                    dataSource={libraryResources}
                    columns={libraryColumns}
                    rowKey="id"
                    pagination={false}
                    size="middle"
                  />
                ) : (
                  <Empty 
                    description="No library files linked" 
                    style={{ padding: 24 }} 
                  >
                    <Button onClick={() => setShowLibraryModal(true)}>
                      Link from Library
                    </Button>
                  </Empty>
                ),
              },
            ]}
          />
        </Card>
      ) : (
        <Card
          style={{
            borderRadius: 12,
            background: isDark ? '#1e293b' : '#fff',
            textAlign: 'center',
            padding: 48,
          }}
        >
          <Empty
            image={<LinkOutlined style={{ fontSize: 48, color: '#94a3b8' }} />}
            description={
              <div>
                <Text type="secondary">No resources yet</Text>
                <div style={{ marginTop: 16 }}>
                  <Space>
                    <Button icon={<FolderOpenOutlined />} onClick={() => setShowLibraryModal(true)}>
                      Link from Library
                    </Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCreateModal(true)}>
                      Add Link/File
                    </Button>
                  </Space>
                </div>
              </div>
            }
          />
        </Card>
      )}

      {/* Create/Edit Modal */}
      <ResourceFormModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        projectId={project.id}
      />

      {editingResource && (
        <ResourceFormModal
          open={!!editingResource}
          onClose={() => setEditingResource(null)}
          projectId={project.id}
          resource={editingResource}
        />
      )}

      {/* Link Library Resource Modal */}
      <Modal
        title="Link Library Resource"
        open={showLibraryModal}
        onCancel={() => {
          setShowLibraryModal(false);
          setSelectedLibraryItem(null);
        }}
        onOk={() => selectedLibraryItem && linkMutation.mutate(selectedLibraryItem)}
        okText="Link to Project"
        okButtonProps={{ disabled: !selectedLibraryItem, loading: linkMutation.isPending }}
      >
        <div style={{ marginTop: 16 }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
            Select a file from the library to link to this project:
          </Text>
          <Select
            style={{ width: '100%' }}
            placeholder="Select library resource..."
            value={selectedLibraryItem}
            onChange={setSelectedLibraryItem}
            options={availableLibraryResources.map((lr: any) => ({
              label: `${lr.title} (${lr.file_name})`,
              value: lr.id,
            }))}
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          />
          {availableLibraryResources.length === 0 && (
            <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
              All library resources are already linked to this project.
            </Text>
          )}
        </div>
      </Modal>
    </div>
  );
}
