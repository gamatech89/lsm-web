/**
 * Issues Section - PHP Errors & Site Issues Monitoring
 * 
 * Features:
 * - PHP error log display from API
 * - Error severity filtering
 * - Error details and stack traces
 * - Clear errors action
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
  Table,
  Tooltip,
  Alert,
  Badge,
  List,
  App,
  Input,
  Select,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  BugOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  DeleteOutlined,
  SearchOutlined,
  CodeOutlined,
  SyncOutlined,
  CloudDownloadOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useThemeStore } from '@/stores/theme';
import { api } from '@/lib/api';
import { formatRelativeTime } from '@lsm/utils';
import type { PhpError } from '@/lib/php-errors-api';

const { Title, Text } = Typography;

interface IssuesSectionProps {
  project: any;
}

export default function IssuesSection({ project }: IssuesSectionProps) {
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const hasRmbConnection = !!project.health_check_secret;
  
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);

  // Fetch PHP errors from API
  const { data: errorsData, isLoading, refetch } = useQuery({
    queryKey: ['php-errors', project.id, typeFilter, searchTerm],
    queryFn: () => api.phpErrors.list(project.id, { 
      type: typeFilter, 
      search: searchTerm || undefined 
    }).then(r => (r.data as any)?.data || r.data),
    enabled: hasRmbConnection,
    staleTime: 30000,
  });

  // Fetch error stats
  const { data: statsData, refetch: refetchStats } = useQuery({
    queryKey: ['php-errors-stats', project.id],
    queryFn: () => api.phpErrors.stats(project.id).then(r => (r.data as any)?.data || r.data),
    enabled: hasRmbConnection,
    staleTime: 30000,
  });

  // Clear errors mutation
  const clearMutation = useMutation({
    mutationFn: () => api.phpErrors.clear(project.id),
    onSuccess: () => {
      message.success('Error log cleared');
      queryClient.invalidateQueries({ queryKey: ['php-errors', project.id] });
      queryClient.invalidateQueries({ queryKey: ['php-errors-stats', project.id] });
    },
    onError: () => message.error('Failed to clear errors'),
  });

  // Sync errors from WordPress mutation
  const syncMutation = useMutation({
    mutationFn: () => api.rmb.syncPhpErrors(project.id).then(r => r.data),
    onSuccess: (data) => {
      if (data.synced > 0) {
        message.success(`Synced ${data.synced} error(s) from WordPress`);
      } else {
        message.info('No new errors found on WordPress');
      }
      queryClient.invalidateQueries({ queryKey: ['php-errors', project.id] });
      queryClient.invalidateQueries({ queryKey: ['php-errors-stats', project.id] });
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.error || 'Failed to sync errors from WordPress';
      message.error(errorMsg);
    },
  });

  // Resolve error mutation
  const resolveMutation = useMutation({
    mutationFn: (errorId: number) => api.phpErrors.resolve(errorId),
    onSuccess: () => {
      message.success('Error marked as resolved');
      queryClient.invalidateQueries({ queryKey: ['php-errors', project.id] });
      queryClient.invalidateQueries({ queryKey: ['php-errors-stats', project.id] });
    },
    onError: () => message.error('Failed to resolve error'),
  });

  // Delete error mutation
  const deleteMutation = useMutation({
    mutationFn: (errorId: number) => api.phpErrors.delete(errorId),
    onSuccess: () => {
      message.success('Error deleted');
      queryClient.invalidateQueries({ queryKey: ['php-errors', project.id] });
      queryClient.invalidateQueries({ queryKey: ['php-errors-stats', project.id] });
    },
    onError: () => message.error('Failed to delete error'),
  });

  // Show empty state if not connected
  if (!hasRmbConnection) {
    return (
      <Empty
        image={<BugOutlined style={{ fontSize: 48, color: '#94a3b8' }} />}
        description={<Text type="secondary">Connect WordPress to monitor PHP errors</Text>}
      />
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">Loading error log...</Text>
        </div>
      </div>
    );
  }

  const errors: PhpError[] = Array.isArray(errorsData) ? errorsData : errorsData?.data || [];
  const stats = statsData;

  // Count by type from stats or local
  const fatalCount = stats?.by_type?.fatal ?? errors.filter((e) => e.type === 'fatal').length;
  const warningCount = stats?.by_type?.warning ?? errors.filter((e) => e.type === 'warning').length;
  const noticeCount = stats?.by_type?.notice ?? errors.filter((e) => e.type === 'notice').length;
  const deprecatedCount = stats?.by_type?.deprecated ?? errors.filter((e) => e.type === 'deprecated').length;

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'fatal':
        return { color: '#ef4444', bg: '#fee2e2', icon: <CloseCircleOutlined />, label: 'Fatal' };
      case 'warning':
        return { color: '#f59e0b', bg: '#fef3c7', icon: <WarningOutlined />, label: 'Warning' };
      case 'notice':
        return { color: '#3b82f6', bg: '#dbeafe', icon: <ExclamationCircleOutlined />, label: 'Notice' };
      case 'deprecated':
        return { color: '#8b5cf6', bg: '#ede9fe', icon: <ExclamationCircleOutlined />, label: 'Deprecated' };
      default:
        return { color: '#64748b', bg: '#f1f5f9', icon: <BugOutlined />, label: type };
    }
  };

  const handleClearErrors = () => {
    modal.confirm({
      title: 'Clear Error Log',
      content: 'Are you sure you want to clear all PHP errors? This action cannot be undone.',
      okText: 'Clear All',
      okButtonProps: { danger: true },
      onOk: () => clearMutation.mutate(),
    });
  };

  const columns: ColumnsType<PhpError> = [
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => {
        const config = getTypeConfig(type);
        return (
          <Tag 
            color={config.color} 
            icon={config.icon}
            style={{ 
              background: isDark ? 'transparent' : config.bg,
              borderColor: config.color,
            }}
          >
            {config.label}
          </Tag>
        );
      },
    },
    {
      title: 'Error Message',
      dataIndex: 'message',
      key: 'message',
      render: (message: string, record: PhpError) => (
        <div>
          <Text strong style={{ display: 'block', marginBottom: 4 }}>
            {message.length > 100 ? message.substring(0, 100) + '...' : message}
          </Text>
          {record.file && (
            <Space size={4}>
              <CodeOutlined style={{ color: '#64748b', fontSize: 12 }} />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.file}:{record.line}
              </Text>
            </Space>
          )}
        </div>
      ),
    },
    {
      title: 'Occurrences',
      dataIndex: 'count',
      key: 'count',
      width: 100,
      sorter: (a, b) => a.count - b.count,
      render: (count: number) => (
        <Badge 
          count={count} 
          showZero 
          style={{ 
            backgroundColor: count > 50 ? '#ef4444' : count > 10 ? '#f59e0b' : '#22c55e' 
          }} 
        />
      ),
    },
    {
      title: 'Last Seen',
      dataIndex: 'last_seen_at',
      key: 'last_seen_at',
      width: 140,
      sorter: (a, b) => new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime(),
      render: (date: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {formatRelativeTime(date)}
        </Text>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 100,
      render: (_, record: PhpError) => (
        <Space>
          <Tooltip title="Mark Resolved">
            <Button
              type="text"
              icon={<CheckCircleOutlined />}
              onClick={() => resolveMutation.mutate(record.id)}
              loading={resolveMutation.isPending}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => deleteMutation.mutate(record.id)}
              loading={deleteMutation.isPending}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={5} style={{ margin: 0 }}>PHP Error Monitoring</Title>
        <Space>
          <Button 
            type="primary"
            icon={<CloudDownloadOutlined />} 
            onClick={() => syncMutation.mutate()}
            loading={syncMutation.isPending}
          >
            Sync from WordPress
          </Button>
          <Button icon={<ReloadOutlined />} onClick={() => { refetch(); refetchStats(); }}>
            Refresh
          </Button>
          {errors.length > 0 && (
            <Button 
              danger 
              icon={<DeleteOutlined />} 
              onClick={handleClearErrors}
              loading={clearMutation.isPending}
            >
              Clear Log
            </Button>
          )}
        </Space>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Fatal Errors', count: fatalCount, color: '#ef4444', bg: '#fee2e2' },
          { label: 'Warnings', count: warningCount, color: '#f59e0b', bg: '#fef3c7' },
          { label: 'Notices', count: noticeCount, color: '#3b82f6', bg: '#dbeafe' },
          { label: 'Deprecated', count: deprecatedCount, color: '#8b5cf6', bg: '#ede9fe' },
        ].map((item) => (
          <Card
            key={item.label}
            size="small"
            style={{
              borderRadius: 8,
              background: isDark ? '#1e293b' : item.bg,
              borderColor: isDark ? '#334155' : item.color,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 700, color: item.color }}>
              {item.count}
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>{item.label}</Text>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <Input
          placeholder="Search errors..."
          prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ maxWidth: 300 }}
          allowClear
        />
        <Select
          placeholder="Filter by type"
          value={typeFilter}
          onChange={setTypeFilter}
          style={{ width: 150 }}
          allowClear
          options={[
            { value: 'fatal', label: 'Fatal' },
            { value: 'warning', label: 'Warning' },
            { value: 'notice', label: 'Notice' },
            { value: 'deprecated', label: 'Deprecated' },
          ]}
        />
      </div>

      {/* Error Table or Empty State */}
      {errors.length > 0 ? (
        <Table
          columns={columns}
          dataSource={errors}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          style={{
            background: isDark ? '#0f172a' : '#fff',
            borderRadius: 12,
            overflow: 'hidden',
          }}
          expandable={{
            expandedRowRender: (record) => (
              <div style={{ padding: 16 }}>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>Full Error Message:</Text>
                <div
                  style={{
                    background: isDark ? '#0f172a' : '#f8fafc',
                    padding: 12,
                    borderRadius: 8,
                    fontFamily: 'monospace',
                    fontSize: 12,
                    overflowX: 'auto',
                  }}
                >
                  {record.message}
                </div>
                <div style={{ marginTop: 12, display: 'flex', gap: 24 }}>
                  <div>
                    <Text type="secondary">First seen: </Text>
                    <Text>{formatRelativeTime(record.first_seen_at)}</Text>
                  </div>
                  <div>
                    <Text type="secondary">Last seen: </Text>
                    <Text>{formatRelativeTime(record.last_seen_at)}</Text>
                  </div>
                  <div>
                    <Text type="secondary">Total occurrences: </Text>
                    <Text strong>{record.count}</Text>
                  </div>
                  {record.plugin_slug && (
                    <div>
                      <Text type="secondary">Plugin: </Text>
                      <Text>{record.plugin_slug}</Text>
                    </div>
                  )}
                </div>
              </div>
            ),
          }}
        />
      ) : (
        <Card
          style={{
            borderRadius: 12,
            background: isDark ? '#1e293b' : '#fff',
            textAlign: 'center',
            padding: 40,
          }}
        >
          <CheckCircleOutlined style={{ fontSize: 48, color: '#22c55e', marginBottom: 16 }} />
          <div>
            <Text strong style={{ fontSize: 16, display: 'block' }}>No PHP errors detected</Text>
            <Text type="secondary">Your site is running smoothly</Text>
          </div>
        </Card>
      )}
    </div>
  );
}
