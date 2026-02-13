/**
 * Activity Section - WordPress Activity Log Monitoring
 * 
 * Features:
 * - Activity log display from WordPress
 * - Event type filtering
 * - Statistics cards
 * - Refresh from WordPress
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
  Select,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  HistoryOutlined,
  ReloadOutlined,
  UserOutlined,
  AppstoreOutlined,
  SettingOutlined,
  LoginOutlined,
  LogoutOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  DesktopOutlined,
  FileTextOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useThemeStore } from '@/stores/theme';
import { api } from '@/lib/api';
import { formatRelativeTime } from '@lsm/utils';

const { Title, Text } = Typography;

interface ActivitySectionProps {
  project: any;
}

interface ActivityEntry {
  action: string;
  status: string;
  context: Record<string, any>;
  timestamp: string;
  user_ip: string;
  user_id: number;
  username: string | null;
}

export default function ActivitySection({ project }: ActivitySectionProps) {
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';
  const hasLsmConnection = !!project.health_check_secret;
  
  const [actionFilter, setActionFilter] = useState<string | undefined>(undefined);

  // Fetch activity from WordPress
  const { data: activityData, isLoading, refetch } = useQuery({
    queryKey: ['activity-log', project.id, actionFilter],
    queryFn: () => api.lsm.getActivityFromWp(project.id, { 
      action: actionFilter,
      limit: 100,
    }).then(r => r.data),
    enabled: hasLsmConnection,
    staleTime: 30000,
  });

  // Fetch activity stats
  const { data: statsData, refetch: refetchStats } = useQuery({
    queryKey: ['activity-stats', project.id],
    queryFn: () => api.lsm.getActivityStatsFromWp(project.id).then(r => r.data),
    enabled: hasLsmConnection,
    staleTime: 30000,
  });

  // Show empty state if not connected
  if (!hasLsmConnection) {
    return (
      <Empty
        image={<HistoryOutlined style={{ fontSize: 48, color: '#94a3b8' }} />}
        description={<Text type="secondary">Connect WordPress to view activity log</Text>}
      />
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">Loading activity log...</Text>
        </div>
      </div>
    );
  }

  const activity: ActivityEntry[] = activityData?.activity || [];
  const stats = statsData?.stats;

  // Get action configuration
  const getActionConfig = (action: string) => {
    const configs: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
      plugin_activated: { color: '#22c55e', bg: '#dcfce7', icon: <AppstoreOutlined />, label: 'Plugin Activated' },
      plugin_deactivated: { color: '#f59e0b', bg: '#fef3c7', icon: <AppstoreOutlined />, label: 'Plugin Deactivated' },
      plugin_updated: { color: '#3b82f6', bg: '#dbeafe', icon: <UploadOutlined />, label: 'Plugin Updated' },
      plugin_deleted: { color: '#ef4444', bg: '#fee2e2', icon: <DeleteOutlined />, label: 'Plugin Deleted' },
      theme_switched: { color: '#8b5cf6', bg: '#ede9fe', icon: <DesktopOutlined />, label: 'Theme Switched' },
      theme_updated: { color: '#3b82f6', bg: '#dbeafe', icon: <DesktopOutlined />, label: 'Theme Updated' },
      core_updated: { color: '#06b6d4', bg: '#cffafe', icon: <GlobalOutlined />, label: 'Core Updated' },
      user_login: { color: '#22c55e', bg: '#dcfce7', icon: <LoginOutlined />, label: 'User Login' },
      login_failed: { color: '#ef4444', bg: '#fee2e2', icon: <LogoutOutlined />, label: 'Login Failed' },
      user_registered: { color: '#3b82f6', bg: '#dbeafe', icon: <UserOutlined />, label: 'User Registered' },
      user_deleted: { color: '#ef4444', bg: '#fee2e2', icon: <UserOutlined />, label: 'User Deleted' },
      setting_changed: { color: '#f59e0b', bg: '#fef3c7', icon: <SettingOutlined />, label: 'Setting Changed' },
      content_published: { color: '#22c55e', bg: '#dcfce7', icon: <FileTextOutlined />, label: 'Content Published' },
      content_trashed: { color: '#ef4444', bg: '#fee2e2', icon: <DeleteOutlined />, label: 'Content Trashed' },
    };
    return configs[action] || { color: '#64748b', bg: '#f1f5f9', icon: <HistoryOutlined />, label: action.replace(/_/g, ' ') };
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  // Format context for display
  const formatContext = (context: Record<string, any>) => {
    const parts: string[] = [];
    if (context.name) parts.push(context.name);
    if (context.plugin) parts.push(context.plugin);
    if (context.theme) parts.push(context.theme);
    if (context.username) parts.push(`User: ${context.username}`);
    if (context.setting) parts.push(`Setting: ${context.setting}`);
    if (context.title) parts.push(context.title);
    if (context.version) parts.push(`v${context.version}`);
    if (context.new_version) parts.push(`→ v${context.new_version}`);
    return parts.join(' · ');
  };

  const columns: ColumnsType<ActivityEntry> = [
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      width: 180,
      render: (action: string) => {
        const config = getActionConfig(action);
        return (
          <Tag 
            icon={config.icon}
            style={{ 
              backgroundColor: isDark ? 'transparent' : config.bg,
              borderColor: config.color,
              color: config.color,
            }}
          >
            {config.label}
          </Tag>
        );
      },
    },
    {
      title: 'Details',
      dataIndex: 'context',
      key: 'context',
      render: (context: Record<string, any>) => {
        const details = formatContext(context);
        return (
          <Text>{details || 'No details'}</Text>
        );
      },
    },
    {
      title: 'User',
      dataIndex: 'username',
      key: 'username',
      width: 150,
      render: (username: string | null, record: ActivityEntry) => (
        <div>
          {username ? (
            <Space size={4}>
              <UserOutlined style={{ color: '#64748b' }} />
              <Text>{username}</Text>
            </Space>
          ) : (
            <Text type="secondary">System</Text>
          )}
        </div>
      ),
    },
    {
      title: 'Time',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 140,
      sorter: (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      render: (date: string) => (
        <Tooltip title={new Date(date).toLocaleString()}>
          <Text type="secondary">{formatRelativeTime(date)}</Text>
        </Tooltip>
      ),
    },
    {
      title: 'IP',
      dataIndex: 'user_ip',
      key: 'user_ip',
      width: 120,
      render: (ip: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>{ip}</Text>
      ),
    },
  ];

  // Get unique action types for filter
  const actionTypes = [...new Set(activity.map(a => a.action))];

  // Calculate stats
  const successCount = stats?.by_status?.success ?? 0;
  const infoCount = stats?.by_status?.info ?? 0;
  const warningCount = stats?.by_status?.warning ?? 0;
  const errorCount = stats?.by_status?.error ?? 0;

  return (
    <div style={{ padding: '24px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={5} style={{ margin: 0 }}>Activity Log</Title>
        <Space>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={() => { refetch(); refetchStats(); }}
          >
            Refresh
          </Button>
        </Space>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <Card 
          size="small" 
          style={{ 
            background: isDark ? 'rgba(34, 197, 94, 0.1)' : '#dcfce7',
            borderColor: isDark ? 'rgba(34, 197, 94, 0.3)' : '#22c55e',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <Title level={3} style={{ margin: 0, color: '#22c55e' }}>{successCount}</Title>
            <Text type="secondary">Successful</Text>
          </div>
        </Card>
        <Card 
          size="small" 
          style={{ 
            background: isDark ? 'rgba(59, 130, 246, 0.1)' : '#dbeafe',
            borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : '#3b82f6',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <Title level={3} style={{ margin: 0, color: '#3b82f6' }}>{infoCount}</Title>
            <Text type="secondary">Info</Text>
          </div>
        </Card>
        <Card 
          size="small" 
          style={{ 
            background: isDark ? 'rgba(245, 158, 11, 0.1)' : '#fef3c7',
            borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : '#f59e0b',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <Title level={3} style={{ margin: 0, color: '#f59e0b' }}>{warningCount}</Title>
            <Text type="secondary">Warnings</Text>
          </div>
        </Card>
        <Card 
          size="small" 
          style={{ 
            background: isDark ? 'rgba(239, 68, 68, 0.1)' : '#fee2e2',
            borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#ef4444',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <Title level={3} style={{ margin: 0, color: '#ef4444' }}>{errorCount}</Title>
            <Text type="secondary">Errors</Text>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div style={{ marginBottom: 16 }}>
        <Select
          placeholder="Filter by action type"
          allowClear
          style={{ width: 250 }}
          value={actionFilter}
          onChange={setActionFilter}
          options={actionTypes.map(type => ({
            value: type,
            label: getActionConfig(type).label,
          }))}
        />
      </div>

      {/* Activity Table */}
      {activity.length === 0 ? (
        <Empty 
          image={<HistoryOutlined style={{ fontSize: 48, color: '#94a3b8' }} />}
          description={<Text type="secondary">No activity recorded yet</Text>}
        />
      ) : (
        <Table
          columns={columns}
          dataSource={activity}
          rowKey={(record, index) => `${record.timestamp}-${index}`}
          size="small"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `${total} activities`,
          }}
          style={{
            background: isDark ? '#1f2937' : '#ffffff',
            borderRadius: 8,
          }}
        />
      )}
    </div>
  );
}
