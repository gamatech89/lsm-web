/**
 * Maintenance Section - Quick Actions, Maintenance Mode, Emergency Recovery
 */

import { useState } from 'react';
import { 
  Typography, 
  Card, 
  Space, 
  Button, 
  Switch, 
  Alert, 
  Tag,
  Row,
  Col,
  Popconfirm,
  App,
  Statistic,
  Spin,
  Checkbox,
  Divider,
  Badge
} from 'antd';
import { 
  ClearOutlined,
  SyncOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  ToolOutlined,
  WarningOutlined,
  StopOutlined,
  UndoOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { ConnectWordPressCard } from '../ConnectWordPressCard';
import { useThemeStore } from '@/stores/theme';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

const { Text, Title } = Typography;

interface MaintenanceSectionProps {
  project: any;
}

export default function MaintenanceSection({ project }: MaintenanceSectionProps) {
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  // Cleanup options state
  const [cleanupOptions, setCleanupOptions] = useState({
    revisions: true,
    transients: true,
    drafts: true,
    spam: true,
    trash: true,
    orphan_meta: true,
    optimize_tables: true,
  });
  // Check if WordPress is connected
  const hasRmbConnection = !!project.health_check_secret;

  // Fetch recovery status (includes maintenance mode)
  const { data: recoveryStatus, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ['project-recovery-status', project.id],
    queryFn: () => api.rmb.getRecoveryStatus(project.id).then(r => r.data),
    enabled: hasRmbConnection,
    staleTime: 30000,
  });

  // Fetch database stats for cleanup preview
  const { data: dbStats, isLoading: dbStatsLoading, refetch: refetchDbStats } = useQuery({
    queryKey: ['project-db-stats', project.id],
    queryFn: () => api.rmb.getDatabaseStats(project.id).then(r => r.data?.data || r.data),
    enabled: hasRmbConnection,
    staleTime: 60000,
  });

  // Quick Actions Mutations
  const clearCacheMutation = useMutation({
    mutationFn: () => api.rmb.clearCache(project.id),
    onSuccess: (response) => {
      const data = response.data?.data || response.data;
      const clearedList = data?.cleared?.join(', ') || 'all caches';
      message.success(`Cache cleared: ${clearedList}`);
    },
    onError: () => message.error('Failed to clear cache'),
  });

  const flushRewriteMutation = useMutation({
    mutationFn: () => api.rmb.flushRewrite(project.id),
    onSuccess: () => message.success('Permalinks flushed successfully'),
    onError: () => message.error('Failed to flush permalinks'),
  });

  const optimizeDbMutation = useMutation({
    mutationFn: () => api.rmb.optimizeDatabase(project.id),
    onSuccess: (response) => {
      const data = response.data?.data || response.data;
      const saved = data?.saved || '0 B';
      const tables = data?.tables_count || 0;
      message.success(`Database optimized: ${tables} tables, ${saved} saved`);
    },
    onError: () => message.error('Failed to optimize database'),
  });

  const cleanupDbMutation = useMutation({
    mutationFn: async () => {
      // First cleanup selected items
      const cleanupResult = await api.rmb.cleanupDatabase(project.id, {
        revisions: cleanupOptions.revisions,
        transients: cleanupOptions.transients,
        drafts: cleanupOptions.drafts,
        spam: cleanupOptions.spam,
        trash: cleanupOptions.trash,
        orphan_meta: cleanupOptions.orphan_meta,
      });
      // Then optimize tables if selected
      if (cleanupOptions.optimize_tables) {
        await api.rmb.optimizeDatabase(project.id);
      }
      return cleanupResult;
    },
    onSuccess: (response) => {
      const data = response.data?.data || response.data;
      const total = data?.total_deleted || 0;
      const msg = cleanupOptions.optimize_tables 
        ? `Database cleanup: ${total} items removed. Tables optimized.`
        : `Database cleanup: ${total} items removed`;
      message.success(msg);
      refetchDbStats();
    },
    onError: () => message.error('Failed to cleanup database'),
  });

  // Maintenance Mode Mutations
  const enableMaintenanceMutation = useMutation({
    mutationFn: () => api.rmb.enableMaintenance(project.id),
    onSuccess: () => {
      message.success('Maintenance mode enabled');
      refetchStatus();
    },
    onError: () => message.error('Failed to enable maintenance mode'),
  });

  const disableMaintenanceMutation = useMutation({
    mutationFn: () => api.rmb.disableMaintenance(project.id),
    onSuccess: () => {
      message.success('Maintenance mode disabled');
      refetchStatus();
    },
    onError: () => message.error('Failed to disable maintenance mode'),
  });

  // Emergency Recovery Mutations
  const disablePluginsMutation = useMutation({
    mutationFn: () => api.rmb.disablePlugins(project.id),
    onSuccess: () => {
      message.success('All plugins disabled');
      refetchStatus();
      queryClient.invalidateQueries({ queryKey: ['project-plugins', project.id] });
    },
    onError: () => message.error('Failed to disable plugins'),
  });

  const restorePluginsMutation = useMutation({
    mutationFn: () => api.rmb.restorePlugins(project.id),
    onSuccess: () => {
      message.success('Plugins restored');
      refetchStatus();
      queryClient.invalidateQueries({ queryKey: ['project-plugins', project.id] });
    },
    onError: () => message.error('Failed to restore plugins'),
  });

  const emergencyRecoveryMutation = useMutation({
    mutationFn: () => api.rmb.emergencyRecovery(project.id),
    onSuccess: () => {
      message.success('Emergency recovery executed');
      refetchStatus();
      queryClient.invalidateQueries({ queryKey: ['project-plugins', project.id] });
    },
    onError: () => message.error('Failed to execute emergency recovery'),
  });

  const cardStyle = {
    borderRadius: 12,
    background: isDark ? '#1e293b' : '#fff',
    marginBottom: 16,
  };

  const dangerCardStyle = {
    ...cardStyle,
    borderColor: '#ff4d4f',
    borderWidth: 1,
  };

  // Not connected state - show connection UI
  if (!hasRmbConnection) {
    return <ConnectWordPressCard project={project} />;
  }

  const maintenanceMode = recoveryStatus?.maintenance_mode ?? false;

  return (
    <div style={{ padding: '24px 0' }}>
      {/* Quick Actions - Compact */}
      <Card 
        style={cardStyle} 
        title={
          <Space>
            <ToolOutlined />
            <span>Quick Actions</span>
          </Space>
        }
      >
        <Space wrap>
          <Button
            icon={<ClearOutlined />}
            loading={clearCacheMutation.isPending}
            onClick={() => clearCacheMutation.mutate()}
          >
            Clear Cache
          </Button>
          <Button
            icon={<SyncOutlined />}
            loading={flushRewriteMutation.isPending}
            onClick={() => flushRewriteMutation.mutate()}
          >
            Flush Permalinks
          </Button>
          <Button
            icon={<SyncOutlined />}
            onClick={() => queryClient.invalidateQueries({ queryKey: ['project-updates', project.id] })}
          >
            Check Updates
          </Button>
        </Space>
      </Card>

      {/* Database Cleanup - WP Rocket Style */}
      <Card 
        style={cardStyle} 
        title={
          <Space>
            <DatabaseOutlined />
            <span>Database</span>
          </Space>
        }
        loading={dbStatsLoading}
        extra={
          <Popconfirm
            title="Clean Selected Items?"
            description="This will permanently delete the selected items from your database."
            onConfirm={() => cleanupDbMutation.mutate()}
            okText="Clean"
            cancelText="Cancel"
          >
            <Button 
              type="primary" 
              icon={<DeleteOutlined />}
              loading={cleanupDbMutation.isPending || optimizeDbMutation.isPending}
              disabled={!Object.values(cleanupOptions).some(v => v)}
            >
              Clean Selected
            </Button>
          </Popconfirm>
        }
      >
        <Row gutter={[16, 12]}>
          <Col xs={24} sm={12}>
            <Checkbox
              checked={cleanupOptions.revisions}
              onChange={(e) => setCleanupOptions(prev => ({ ...prev, revisions: e.target.checked }))}
            >
              <Space>
                <span>Post Revisions</span>
                <Badge 
                  count={dbStats?.stats?.revisions?.count || 0} 
                  showZero 
                  style={{ backgroundColor: dbStats?.stats?.revisions?.count > 0 ? '#1890ff' : '#d9d9d9' }} 
                />
              </Space>
            </Checkbox>
          </Col>
          <Col xs={24} sm={12}>
            <Checkbox
              checked={cleanupOptions.transients}
              onChange={(e) => setCleanupOptions(prev => ({ ...prev, transients: e.target.checked }))}
            >
              <Space>
                <span>Expired Transients</span>
                <Badge 
                  count={dbStats?.stats?.transients?.count || 0} 
                  showZero 
                  style={{ backgroundColor: dbStats?.stats?.transients?.count > 0 ? '#1890ff' : '#d9d9d9' }} 
                />
              </Space>
            </Checkbox>
          </Col>
          <Col xs={24} sm={12}>
            <Checkbox
              checked={cleanupOptions.drafts}
              onChange={(e) => setCleanupOptions(prev => ({ ...prev, drafts: e.target.checked }))}
            >
              <Space>
                <span>Auto-drafts</span>
                <Badge 
                  count={dbStats?.stats?.drafts?.count || 0} 
                  showZero 
                  style={{ backgroundColor: dbStats?.stats?.drafts?.count > 0 ? '#1890ff' : '#d9d9d9' }} 
                />
              </Space>
            </Checkbox>
          </Col>
          <Col xs={24} sm={12}>
            <Checkbox
              checked={cleanupOptions.spam}
              onChange={(e) => setCleanupOptions(prev => ({ ...prev, spam: e.target.checked }))}
            >
              <Space>
                <span>Spam Comments</span>
                <Badge 
                  count={dbStats?.stats?.spam_comments?.count || 0} 
                  showZero 
                  style={{ backgroundColor: dbStats?.stats?.spam_comments?.count > 0 ? '#1890ff' : '#d9d9d9' }} 
                />
              </Space>
            </Checkbox>
          </Col>
          <Col xs={24} sm={12}>
            <Checkbox
              checked={cleanupOptions.trash}
              onChange={(e) => setCleanupOptions(prev => ({ ...prev, trash: e.target.checked }))}
            >
              <Space>
                <span>Trashed Content</span>
                <Badge 
                  count={(dbStats?.stats?.trashed_posts?.count || 0) + (dbStats?.stats?.trashed_comments?.count || 0)} 
                  showZero 
                  style={{ backgroundColor: ((dbStats?.stats?.trashed_posts?.count || 0) + (dbStats?.stats?.trashed_comments?.count || 0)) > 0 ? '#1890ff' : '#d9d9d9' }} 
                />
              </Space>
            </Checkbox>
          </Col>
          <Col xs={24} sm={12}>
            <Checkbox
              checked={cleanupOptions.orphan_meta}
              onChange={(e) => setCleanupOptions(prev => ({ ...prev, orphan_meta: e.target.checked }))}
            >
              <Space>
                <span>Orphaned Metadata</span>
                <Badge 
                  count={dbStats?.stats?.orphaned_meta?.count || 0} 
                  showZero 
                  style={{ backgroundColor: dbStats?.stats?.orphaned_meta?.count > 0 ? '#1890ff' : '#d9d9d9' }} 
                />
              </Space>
            </Checkbox>
          </Col>
          <Col xs={24} sm={12}>
            <Checkbox
              checked={cleanupOptions.optimize_tables}
              onChange={(e) => setCleanupOptions(prev => ({ ...prev, optimize_tables: e.target.checked }))}
            >
              <Space>
                <span>Optimize Tables</span>
                {dbStats?.stats?.tables_to_optimize && (
                  <Tag color="blue">{dbStats.stats.tables_to_optimize.count} tables</Tag>
                )}
              </Space>
            </Checkbox>
          </Col>
        </Row>
      </Card>

      {/* Maintenance Mode */}
      <Card 
        style={cardStyle} 
        title={
          <Space>
            <WarningOutlined />
            <span>Maintenance Mode</span>
          </Space>
        }
        loading={statusLoading}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>
              Site Maintenance Mode
            </Text>
            <Text type="secondary">
              When enabled, visitors see a maintenance page while you work on the site
            </Text>
          </div>
          <Space>
            <Tag 
              icon={maintenanceMode ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
              color={maintenanceMode ? 'orange' : 'green'}
            >
              {maintenanceMode ? 'Enabled' : 'Disabled'}
            </Tag>
            {maintenanceMode ? (
              <Button
                type="primary"
                onClick={() => disableMaintenanceMutation.mutate()}
                loading={disableMaintenanceMutation.isPending}
              >
                Disable
              </Button>
            ) : (
              <Button
                type="default"
                onClick={() => enableMaintenanceMutation.mutate()}
                loading={enableMaintenanceMutation.isPending}
              >
                Enable
              </Button>
            )}
          </Space>
        </div>
      </Card>

      {/* Emergency Recovery - Danger Zone */}
      <Card 
        style={dangerCardStyle}
        title={
          <Space>
            <ThunderboltOutlined style={{ color: '#ff4d4f' }} />
            <span style={{ color: '#ff4d4f' }}>Emergency Recovery</span>
          </Space>
        }
      >
        <Alert
          type="warning"
          message={
            <span style={{ color: '#854d0e' }}>
              These actions should only be used in emergencies. They can break your site if used incorrectly.
            </span>
          }
          style={{ marginBottom: 16, backgroundColor: '#fef9c3', borderColor: '#facc15' }}
          showIcon
        />
        
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          {/* Disable Plugins */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${isDark ? '#334155' : '#f0f0f0'}` }}>
            <div>
              <Text strong style={{ display: 'block' }}>
                <StopOutlined style={{ marginRight: 8 }} />
                Disable All Plugins
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Deactivates all plugins except the maintenance plugin. Use when a plugin is causing issues.
              </Text>
            </div>
            <Popconfirm
              title="Disable All Plugins?"
              description="This will deactivate all plugins. The site may not function correctly."
              onConfirm={() => disablePluginsMutation.mutate()}
              okText="Disable"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <Button 
                danger 
                loading={disablePluginsMutation.isPending}
              >
                Disable Plugins
              </Button>
            </Popconfirm>
          </div>

          {/* Restore Plugins */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${isDark ? '#334155' : '#f0f0f0'}` }}>
            <div>
              <Text strong style={{ display: 'block' }}>
                <UndoOutlined style={{ marginRight: 8 }} />
                Restore Plugins
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Re-activates plugins that were previously disabled by emergency actions.
              </Text>
            </div>
            <Button 
              onClick={() => restorePluginsMutation.mutate()}
              loading={restorePluginsMutation.isPending}
            >
              Restore Plugins
            </Button>
          </div>

          {/* Full Emergency Recovery */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
            <div>
              <Text strong style={{ display: 'block', color: '#ff4d4f' }}>
                <ThunderboltOutlined style={{ marginRight: 8 }} />
                Full Emergency Recovery
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Disables all plugins AND switches to default theme. Last resort option.
              </Text>
            </div>
            <Popconfirm
              title="Execute Emergency Recovery?"
              description="This will disable all plugins and switch to the default theme. Use only as a last resort!"
              onConfirm={() => emergencyRecoveryMutation.mutate()}
              okText="Execute"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <Button 
                danger 
                type="primary"
                loading={emergencyRecoveryMutation.isPending}
              >
                Emergency Recovery
              </Button>
            </Popconfirm>
          </div>
        </Space>
      </Card>
    </div>
  );
}
