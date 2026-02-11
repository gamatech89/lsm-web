/**
 * Themes Section - WordPress Theme Management
 * 
 * Features:
 * - Lists all installed themes from WordPress
 * - Current active theme display
 * - Theme update notifications
 * - Theme switching and deletion support
 */

import { useState } from 'react';
import {
  Card,
  Typography,
  Tag,
  Button,
  Space,
  Empty,
  Spin,
  Row,
  Col,
  Alert,
  App,
  Table,
  Popconfirm,
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PictureOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  DeleteOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useThemeStore } from '@/stores/theme';

const { Title, Text } = Typography;

interface ThemesSectionProps {
  project: any;
}

interface Theme {
  slug: string;
  name: string;
  version: string;
  new_version?: string;
  update_available: boolean;
  author?: string;
  author_url?: string;
  description?: string;
  active: boolean;
  template?: string;
  screenshot?: string;
  requires_wp?: string;
  requires_php?: string;
}

export default function ThemesSection({ project }: ThemesSectionProps) {
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const hasRmbConnection = !!project.health_check_secret;

  // Fetch all themes
  const { data: themesData, isLoading, refetch } = useQuery({
    queryKey: ['project-themes', project.id],
    queryFn: () => api.rmb.getThemes(project.id).then(r => (r.data as any)?.data || r.data),
    enabled: hasRmbConnection,
    staleTime: 30000,
  });

  // Switch to default theme mutation
  const switchThemeMutation = useMutation({
    mutationFn: () => api.rmb.switchTheme(project.id),
    onSuccess: () => {
      message.success('Switched to default theme');
      queryClient.invalidateQueries({ queryKey: ['project-themes', project.id] });
    },
    onError: () => message.error('Failed to switch theme'),
  });

  // Activate theme mutation
  const activateThemeMutation = useMutation({
    mutationFn: (slug: string) => api.rmb.activateTheme(project.id, slug),
    onSuccess: () => {
      message.success('Theme activated');
      queryClient.invalidateQueries({ queryKey: ['project-themes', project.id] });
    },
    onError: () => message.error('Failed to activate theme'),
  });

  // Show empty state if not connected
  if (!hasRmbConnection) {
    return (
      <Empty
        image={<PictureOutlined style={{ fontSize: 48, color: '#94a3b8' }} />}
        description={<Text type="secondary">Connect WordPress to manage themes</Text>}
      />
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">Loading theme information...</Text>
        </div>
      </div>
    );
  }

  const themes: Theme[] = Array.isArray(themesData) ? themesData : [];
  const activeTheme = themes.find(t => t.active);
  const inactiveThemes = themes.filter(t => !t.active);
  const updateCount = themes.filter(t => t.update_available).length;

  const columns: ColumnsType<Theme> = [
    {
      title: 'Theme',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Theme) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 48,
              height: 36,
              borderRadius: 4,
              background: isDark ? '#334155' : '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {record.screenshot ? (
              <img src={record.screenshot} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <PictureOutlined style={{ color: '#64748b' }} />
            )}
          </div>
          <div>
            <Text strong>{name}</Text>
            {record.template && record.template !== record.slug && (
              <Tag style={{ marginLeft: 8 }}>Child Theme</Tag>
            )}
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>{record.slug}</Text>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Version',
      dataIndex: 'version',
      key: 'version',
      width: 120,
      render: (version: string, record: Theme) => (
        <Space direction="vertical" size={0}>
          <Tag>{version}</Tag>
          {record.update_available && record.new_version && (
            <Tag color="orange" icon={<ExclamationCircleOutlined />}>
              → {record.new_version}
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Author',
      dataIndex: 'author',
      key: 'author',
      width: 150,
      render: (author: string) => <Text type="secondary">{author || '-'}</Text>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_: any, record: Theme) => (
        <Space>
          {record.update_available && (
            <Tooltip title="Update available">
              <Button 
                type="primary" 
                size="small" 
                icon={<SyncOutlined />}
              >
                Update
              </Button>
            </Tooltip>
          )}
          <Tooltip title="Activate this theme">
            <Button 
              size="small"
              icon={<SwapOutlined />}
              onClick={() => activateThemeMutation.mutate(record.slug)}
              loading={activateThemeMutation.isPending}
            >
              Activate
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={5} style={{ margin: 0 }}>Theme Management</Title>
        <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
          Refresh
        </Button>
      </div>

      {/* Update Alert */}
      {updateCount > 0 && (
        <Alert
          type="info"
          message={`${updateCount} theme update${updateCount > 1 ? 's' : ''} available`}
          style={{ marginBottom: 16 }}
          showIcon
        />
      )}

      {/* Active Theme Card */}
      <Card
        title={
          <Space>
            <CheckCircleOutlined style={{ color: '#22c55e' }} />
            <span>Active Theme</span>
          </Space>
        }
        style={{
          borderRadius: 12,
          background: isDark ? '#1e293b' : '#fff',
          marginBottom: 16,
        }}
      >
        {activeTheme ? (
          <Row gutter={24} align="middle">
            <Col>
              <div
                style={{
                  width: 120,
                  height: 90,
                  borderRadius: 8,
                  background: isDark ? '#334155' : '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {activeTheme.screenshot ? (
                  <img src={activeTheme.screenshot} alt={activeTheme.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <PictureOutlined style={{ fontSize: 32, color: '#64748b' }} />
                )}
              </div>
            </Col>
            <Col flex={1}>
              <Title level={4} style={{ margin: 0 }}>{activeTheme.name}</Title>
              <Space style={{ marginTop: 8 }}>
                <Tag color="blue">Version {activeTheme.version}</Tag>
                {activeTheme.template && activeTheme.template !== activeTheme.slug && (
                  <Tag color="purple">Child of: {activeTheme.template}</Tag>
                )}
                {activeTheme.update_available && (
                  <Tag color="orange" icon={<ExclamationCircleOutlined />}>
                    Update Available → {activeTheme.new_version}
                  </Tag>
                )}
              </Space>
              {activeTheme.author && (
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary">By {activeTheme.author}</Text>
                </div>
              )}
            </Col>
            <Col>
              <Space direction="vertical" align="end">
                {activeTheme.update_available && (
                  <Button type="primary" icon={<SyncOutlined />}>
                    Update Theme
                  </Button>
                )}
                <Button 
                  onClick={() => switchThemeMutation.mutate()}
                  loading={switchThemeMutation.isPending}
                >
                  Switch to Default Theme
                </Button>
              </Space>
            </Col>
          </Row>
        ) : (
          <Empty description="No theme information available" />
        )}
      </Card>

      {/* Inactive Themes List */}
      {inactiveThemes.length > 0 && (
        <Card
          title={`Installed Themes (${inactiveThemes.length})`}
          style={{
            borderRadius: 12,
            background: isDark ? '#1e293b' : '#fff',
          }}
        >
          <Table
            columns={columns}
            dataSource={inactiveThemes}
            rowKey="slug"
            size="small"
            pagination={false}
            style={{
              background: 'transparent',
            }}
          />
        </Card>
      )}

      {/* Empty state if no inactive themes */}
      {inactiveThemes.length === 0 && activeTheme && (
        <Card
          style={{
            borderRadius: 12,
            background: isDark ? '#1e293b' : '#fff',
            textAlign: 'center',
          }}
        >
          <CheckCircleOutlined style={{ fontSize: 48, color: '#22c55e', marginBottom: 12 }} />
          <div>
            <Text type="secondary">No other themes installed</Text>
          </div>
        </Card>
      )}
    </div>
  );
}
