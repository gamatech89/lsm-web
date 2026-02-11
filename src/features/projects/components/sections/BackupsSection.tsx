/**
 * Backups Section - WordPress Backup Management
 * 
 * Features:
 * - List of recent backups from API
 * - Create manual backup
 * - Download/restore backups
 * - Backup scheduling info
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
  Modal,
  Alert,
  App,
  Badge,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  DatabaseOutlined,
  CloudDownloadOutlined,
  ReloadOutlined,
  DeleteOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useThemeStore } from '@/stores/theme';
import { api } from '@/lib/api';
import { formatRelativeTime, formatDate } from '@lsm/utils';
import type { Backup } from '@/lib/backups-api';

const { Title, Text } = Typography;

interface BackupsSectionProps {
  project: any;
}

export default function BackupsSection({ project }: BackupsSectionProps) {
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const hasRmbConnection = !!project.health_check_secret;

  // Fetch backups from API
  const { data: backupsData, isLoading, refetch } = useQuery({
    queryKey: ['backups', project.id],
    queryFn: () => api.backups.list(project.id).then(r => (r.data as any)?.data || r.data),
    enabled: hasRmbConnection,
    staleTime: 30000,
  });

  // Fetch backup stats
  const { data: statsData } = useQuery({
    queryKey: ['backups-stats', project.id],
    queryFn: () => api.backups.stats(project.id).then(r => (r.data as any)?.data || r.data),
    enabled: hasRmbConnection,
    staleTime: 30000,
  });

  // Create backup mutation
  const createMutation = useMutation({
    mutationFn: () => api.backups.create(project.id, { type: 'manual' }),
    onSuccess: () => {
      message.success('Backup started');
      queryClient.invalidateQueries({ queryKey: ['backups', project.id] });
      queryClient.invalidateQueries({ queryKey: ['backups-stats', project.id] });
    },
    onError: () => message.error('Failed to create backup'),
  });

  // Delete backup mutation
  const deleteMutation = useMutation({
    mutationFn: (backupId: number) => api.backups.delete(backupId),
    onSuccess: () => {
      message.success('Backup deleted');
      queryClient.invalidateQueries({ queryKey: ['backups', project.id] });
      queryClient.invalidateQueries({ queryKey: ['backups-stats', project.id] });
    },
    onError: () => message.error('Failed to delete backup'),
  });

  // Restore backup mutation
  const restoreMutation = useMutation({
    mutationFn: (backupId: number) => api.backups.restore(backupId),
    onSuccess: () => {
      message.info('Backup restore started');
    },
    onError: () => message.error('Failed to restore backup'),
  });

  // Download backup
  const handleDownload = async (backup: Backup) => {
    try {
      message.info('Preparing backup download...');
      const response = await api.backups.download(backup.id);
      const blob = new Blob([response.data as any]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${project.slug || project.id}-${new Date(backup.created_at).toISOString().slice(0, 10)}.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      message.error('Backup file not available');
    }
  };

  // Delete backup
  const handleDelete = (backup: Backup) => {
    modal.confirm({
      title: 'Delete Backup',
      content: `Are you sure you want to delete this backup from ${formatDate(backup.created_at)}?`,
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: () => deleteMutation.mutate(backup.id),
    });
  };

  // Restore backup
  const handleRestore = (backup: Backup) => {
    modal.confirm({
      title: 'Restore Backup',
      content: (
        <div>
          <Alert
            type="warning"
            message="This will replace your current site content"
            style={{ marginBottom: 12 }}
          />
          <Text>Restore backup from {formatDate(backup.created_at)}?</Text>
        </div>
      ),
      okText: 'Restore',
      onOk: () => restoreMutation.mutate(backup.id),
    });
  };

  // Format file size
  const formatSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    while (bytes >= 1024 && i < units.length - 1) {
      bytes /= 1024;
      i++;
    }
    return `${bytes.toFixed(1)} ${units[i]}`;
  };

  // Show empty state if not connected
  if (!hasRmbConnection) {
    return (
      <Empty
        image={<DatabaseOutlined style={{ fontSize: 48, color: '#94a3b8' }} />}
        description={<Text type="secondary">Connect WordPress to enable backups</Text>}
      />
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">Loading backups...</Text>
        </div>
      </div>
    );
  }

  const backups: Backup[] = Array.isArray(backupsData) ? backupsData : backupsData?.data || [];
  const stats = statsData;

  const columns: ColumnsType<Backup> = [
    {
      title: 'Date',
      dataIndex: 'created_at',
      key: 'date',
      render: (date: string) => (
        <div>
          <Text strong>{formatDate(date)}</Text>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {formatRelativeTime(date)}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={type === 'manual' ? 'blue' : type === 'scheduled' ? 'purple' : 'orange'}>
          {type === 'manual' ? 'Manual' : type === 'scheduled' ? 'Scheduled' : 'Pre-update'}
        </Tag>
      ),
    },
    {
      title: 'Includes',
      key: 'includes',
      render: (_, record: Backup) => (
        <Space size={4}>
          {record.includes_database && <Tag>Database</Tag>}
          {record.includes_files && <Tag>Files</Tag>}
          {record.includes_uploads && <Tag>Uploads</Tag>}
        </Space>
      ),
    },
    {
      title: 'Size',
      dataIndex: 'file_size',
      key: 'size',
      render: (size: number | null) => formatSize(size),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        switch (status) {
          case 'completed':
            return <Badge status="success" text={<Text style={{ color: '#22c55e' }}>Completed</Text>} />;
          case 'in_progress':
            return <Badge status="processing" text={<Text style={{ color: '#3b82f6' }}>In Progress</Text>} />;
          case 'pending':
            return <Badge status="default" text={<Text type="secondary">Pending</Text>} />;
          case 'failed':
            return <Badge status="error" text={<Text style={{ color: '#ef4444' }}>Failed</Text>} />;
          default:
            return null;
        }
      },
    },
    {
      title: '',
      key: 'actions',
      align: 'right',
      render: (_, record: Backup) => (
        <Space>
          <Tooltip title="Download">
            <Button
              type="text"
              icon={<CloudDownloadOutlined />}
              onClick={() => handleDownload(record)}
              disabled={record.status !== 'completed'}
            />
          </Tooltip>
          <Tooltip title="Restore">
            <Button
              type="text"
              icon={<HistoryOutlined />}
              onClick={() => handleRestore(record)}
              disabled={record.status !== 'completed'}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
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
        <Title level={5} style={{ margin: 0 }}>Backup Management</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            Refresh
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => createMutation.mutate()}
            loading={createMutation.isPending}
          >
            Create Backup
          </Button>
        </Space>
      </div>

      {/* Info Card */}
      <Card
        style={{
          marginBottom: 16,
          borderRadius: 12,
          background: isDark ? '#1e293b' : '#fff',
        }}
      >
        <Space size={32} wrap>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircleOutlined style={{ color: '#22c55e' }} />
              <Text strong>Last Backup</Text>
            </div>
            <Text type="secondary">
              {stats?.last_backup ? formatRelativeTime(stats.last_backup) : 'Never'}
            </Text>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ClockCircleOutlined style={{ color: '#6366f1' }} />
              <Text strong>Schedule</Text>
            </div>
            <Text type="secondary">Weekly (Sundays at 3:00 AM)</Text>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <DatabaseOutlined style={{ color: '#f59e0b' }} />
              <Text strong>Total Backups</Text>
            </div>
            <Text type="secondary">{stats?.total || backups.length} stored</Text>
          </div>
        </Space>
      </Card>

      {/* Backups Table */}
      {backups.length > 0 ? (
        <Table
          columns={columns}
          dataSource={backups}
          rowKey="id"
          pagination={false}
          style={{
            background: isDark ? '#0f172a' : '#fff',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        />
      ) : (
        <Empty
          image={<DatabaseOutlined style={{ fontSize: 48, color: '#94a3b8' }} />}
          description={
            <div>
              <Text type="secondary">No backups yet</Text>
              <div style={{ marginTop: 12 }}>
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />} 
                  onClick={() => createMutation.mutate()}
                  loading={createMutation.isPending}
                >
                  Create First Backup
                </Button>
              </div>
            </div>
          }
        />
      )}
    </div>
  );
}
