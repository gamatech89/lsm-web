/**
 * WordPress Management Panel Component
 * 
 * Comprehensive WordPress site management via LSM plugin.
 * Features: SSO Login, Cache Control, Updates, Recovery/Killswitch
 */

import { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Space,
  Spin,
  Tag,
  Statistic,
  Alert,
  Popconfirm,
  Divider,
  Badge,
  App,
} from 'antd';
import {
  LoginOutlined,
  ClearOutlined,
  SyncOutlined,
  DatabaseOutlined,
  WarningOutlined,
  SafetyOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ThunderboltOutlined,
  ToolOutlined,
  CloudDownloadOutlined,
  PoweroffOutlined,
  ReloadOutlined,
  BgColorsOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useThemeStore } from '@/stores/theme';
import { formatRelativeTime } from '@lsm/utils';

const { Title, Text, Paragraph } = Typography;

interface WordPressManagementProps {
  project: any;
  isDark?: boolean;
}

export function WordPressManagement({ project, isDark }: WordPressManagementProps) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [ssoLoading, setSsoLoading] = useState(false);

  // Check LSM status
  const { data: lsmStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['lsm-status', project.id],
    queryFn: () => api.lsm.getStatus(project.id).then(r => r.data),
    enabled: !!project.health_check_secret,
  });

  // Get available updates
  const { data: updates, isLoading: updatesLoading, refetch: refetchUpdates } = useQuery({
    queryKey: ['lsm-updates', project.id],
    queryFn: () => api.lsm.getUpdates(project.id).then(r => r.data),
    enabled: !!project.health_check_secret && lsmStatus?.connected,
    staleTime: 60000,
  });

  // SSO Login mutation
  const handleSsoLogin = async () => {
    setSsoLoading(true);
    try {
      const response = await api.lsm.generateLoginToken(project.id);
      if (response.data.success && response.data.login_url) {
        window.open(response.data.login_url, '_blank');
        message.success('Opening WordPress admin...');
      } else {
        message.error('Failed to generate login token');
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Failed to login');
    } finally {
      setSsoLoading(false);
    }
  };

  // Clear cache mutation
  const clearCacheMutation = useMutation({
    mutationFn: () => api.lsm.clearCache(project.id),
    onSuccess: (response) => {
      const cleared = response.data.cleared?.length || 0;
      message.success(`Cleared ${cleared} cache type(s)`);
    },
    onError: () => message.error('Failed to clear cache'),
  });

  // Optimize DB mutation
  const optimizeDbMutation = useMutation({
    mutationFn: () => api.lsm.optimizeDatabase(project.id),
    onSuccess: (response) => {
      message.success(`Optimized ${response.data.tables_count || 0} tables`);
    },
    onError: () => message.error('Failed to optimize database'),
  });

  // Flush rewrite mutation
  const flushRewriteMutation = useMutation({
    mutationFn: () => api.lsm.flushRewrite(project.id),
    onSuccess: () => message.success('Rewrite rules flushed'),
    onError: () => message.error('Failed to flush rewrite rules'),
  });

  // Update all plugins mutation
  const updateAllPluginsMutation = useMutation({
    mutationFn: () => api.lsm.updateAllPlugins(project.id),
    onSuccess: (response) => {
      const updated = response.data.updated_count || 0;
      message.success(`Updated ${updated} plugin(s)`);
      refetchUpdates();
      queryClient.invalidateQueries({ queryKey: ['projects', project.id] });
    },
    onError: () => message.error('Failed to update plugins'),
  });

  // Update core mutation
  const updateCoreMutation = useMutation({
    mutationFn: () => api.lsm.updateCore(project.id),
    onSuccess: () => {
      message.success('WordPress core updated');
      refetchUpdates();
      queryClient.invalidateQueries({ queryKey: ['projects', project.id] });
    },
    onError: () => message.error('Failed to update WordPress core'),
  });

  // Enable maintenance mutation
  const enableMaintenanceMutation = useMutation({
    mutationFn: () => api.lsm.enableMaintenance(project.id),
    onSuccess: () => message.success('Maintenance mode enabled'),
    onError: () => message.error('Failed to enable maintenance mode'),
  });

  // Disable maintenance mutation  
  const disableMaintenanceMutation = useMutation({
    mutationFn: () => api.lsm.disableMaintenance(project.id),
    onSuccess: () => message.success('Maintenance mode disabled'),
    onError: () => message.error('Failed to disable maintenance mode'),
  });

  // Disable all plugins mutation
  const disablePluginsMutation = useMutation({
    mutationFn: () => api.lsm.disablePlugins(project.id),
    onSuccess: (response) => {
      message.warning(`Disabled ${response.data.disabled_count || 0} plugin(s)`);
    },
    onError: () => message.error('Failed to disable plugins'),
  });

  // Restore plugins mutation
  const restorePluginsMutation = useMutation({
    mutationFn: () => api.lsm.restorePlugins(project.id),
    onSuccess: (response) => {
      message.success(`Restored ${response.data.restored_count || 0} plugin(s)`);
    },
    onError: () => message.error('Failed to restore plugins'),
  });

  // Emergency recovery mutation
  const emergencyRecoveryMutation = useMutation({
    mutationFn: () => api.lsm.emergencyRecovery(project.id),
    onSuccess: () => {
      message.warning('Emergency recovery executed!');
    },
    onError: () => message.error('Failed to execute emergency recovery'),
  });

  // Card style
  const cardStyle = {
    borderRadius: 12,
    border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
    background: isDark ? '#1e293b' : '#fff',
  };

  // Not configured state
  if (!project.health_check_secret) {
    return (
      <div style={{ padding: '24px 0' }}>
        <Alert
          message="WordPress Management Not Configured"
          description={
            <div>
              <Paragraph style={{ marginBottom: 12 }}>
                To enable remote WordPress management, install the <strong>Remote Management Bridge</strong> plugin 
                on this WordPress site and add the API key in project settings.
              </Paragraph>
              <Button type="primary" onClick={() => window.open('https://github.com/your-org/lsm-plugin', '_blank')}>
                Get LSM Plugin
              </Button>
            </div>
          }
          type="info"
          showIcon
        />
      </div>
    );
  }

  // Loading state
  if (statusLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  // Not connected state
  if (!lsmStatus?.connected) {
    return (
      <div style={{ padding: '24px 0' }}>
        <Alert
          message="Cannot Connect to WordPress"
          description={lsmStatus?.message || 'Failed to connect to the LSM plugin on this site.'}
          type="error"
          showIcon
        />
      </div>
    );
  }

  // Calculate update counts
  const pluginUpdates = updates?.plugins?.length || 0;
  const themeUpdates = updates?.themes?.length || 0;
  const coreUpdate = updates?.core ? 1 : 0;
  const totalUpdates = pluginUpdates + themeUpdates + coreUpdate;

  return (
    <div style={{ padding: '16px 0' }}>
      {/* Connection Status */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Badge status="success" />
        <Text type="secondary">
          Connected to LSM Plugin v{lsmStatus.plugin_version || 'Unknown'}
        </Text>
        {project.last_health_check_at && (
          <Text type="secondary" style={{ marginLeft: 'auto' }}>
            Last check: {formatRelativeTime(project.last_health_check_at)}
          </Text>
        )}
      </div>

      <Row gutter={[16, 16]}>
        {/* Quick Actions Card */}
        <Col xs={24} md={12}>
          <Card title={<><ThunderboltOutlined /> Quick Actions</>} size="small" style={cardStyle}>
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              <Button
                type="primary"
                icon={<LoginOutlined />}
                onClick={handleSsoLogin}
                loading={ssoLoading}
                block
                size="large"
                style={{ height: 48, fontSize: 15 }}
              >
                One-Click WP Login
              </Button>

              <Divider style={{ margin: '8px 0' }} />

              <Row gutter={8}>
                <Col span={8}>
                  <Button
                    icon={<ClearOutlined />}
                    onClick={() => clearCacheMutation.mutate()}
                    loading={clearCacheMutation.isPending}
                    block
                  >
                    Clear Cache
                  </Button>
                </Col>
                <Col span={8}>
                  <Button
                    icon={<DatabaseOutlined />}
                    onClick={() => optimizeDbMutation.mutate()}
                    loading={optimizeDbMutation.isPending}
                    block
                  >
                    Optimize DB
                  </Button>
                </Col>
                <Col span={8}>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={() => flushRewriteMutation.mutate()}
                    loading={flushRewriteMutation.isPending}
                    block
                  >
                    Flush URLs
                  </Button>
                </Col>
              </Row>
            </Space>
          </Card>
        </Col>

        {/* Updates Card */}
        <Col xs={24} md={12}>
          <Card
            title={
              <Space>
                <CloudDownloadOutlined />
                <span>Available Updates</span>
                {totalUpdates > 0 && (
                  <Badge count={totalUpdates} style={{ backgroundColor: '#f59e0b' }} />
                )}
              </Space>
            }
            size="small"
            style={cardStyle}
            extra={
              <Button
                type="text"
                icon={<SyncOutlined spin={updatesLoading} />}
                onClick={() => refetchUpdates()}
                size="small"
              />
            }
          >
            {updatesLoading ? (
              <Spin size="small" />
            ) : (
              <Space direction="vertical" style={{ width: '100%' }} size={12}>
                <Row gutter={16}>
                  <Col span={8}>
                    <Statistic
                      title="Core"
                      value={coreUpdate}
                      valueStyle={{ color: coreUpdate ? '#f59e0b' : '#10b981' }}
                      prefix={coreUpdate ? <WarningOutlined /> : <CheckCircleOutlined />}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="Plugins"
                      value={pluginUpdates}
                      valueStyle={{ color: pluginUpdates ? '#f59e0b' : '#10b981' }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="Themes"
                      value={themeUpdates}
                      valueStyle={{ color: themeUpdates ? '#f59e0b' : '#10b981' }}
                    />
                  </Col>
                </Row>

                {totalUpdates > 0 && (
                  <>
                    <Divider style={{ margin: '8px 0' }} />
                    <Space>
                      {pluginUpdates > 0 && (
                        <Popconfirm
                          title={`Update all ${pluginUpdates} plugins?`}
                          description="This will update all plugins with available updates."
                          onConfirm={() => updateAllPluginsMutation.mutate()}
                          okText="Update All"
                        >
                          <Button
                            type="primary"
                            icon={<CloudDownloadOutlined />}
                            loading={updateAllPluginsMutation.isPending}
                            size="small"
                          >
                            Update Plugins
                          </Button>
                        </Popconfirm>
                      )}
                      {coreUpdate > 0 && (
                        <Popconfirm
                          title="Update WordPress Core?"
                          description={`Update to v${updates?.core?.new_version}`}
                          onConfirm={() => updateCoreMutation.mutate()}
                          okText="Update"
                        >
                          <Button
                            icon={<CloudDownloadOutlined />}
                            loading={updateCoreMutation.isPending}
                            size="small"
                          >
                            Update Core
                          </Button>
                        </Popconfirm>
                      )}
                    </Space>
                  </>
                )}
              </Space>
            )}
          </Card>
        </Col>

        {/* Site Info Card */}
        <Col xs={24} md={12}>
          <Card title={<><ToolOutlined /> Site Info</>} size="small" style={cardStyle}>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Row justify="space-between">
                <Text type="secondary">WordPress</Text>
                <Text strong>{project.wp_version || 'Unknown'}</Text>
              </Row>
              <Row justify="space-between">
                <Text type="secondary">PHP</Text>
                <Text strong>{project.php_version || 'Unknown'}</Text>
              </Row>
              <Row justify="space-between">
                <Text type="secondary">SSL</Text>
                <Tag color={project.ssl_status === 'valid' ? 'green' : 'orange'}>
                  {project.ssl_status || 'Unknown'}
                </Tag>
              </Row>
              <Row justify="space-between">
                <Text type="secondary">Outdated Plugins</Text>
                <Tag color={project.outdated_plugins_count > 0 ? 'orange' : 'green'}>
                  {project.outdated_plugins_count ?? '?'}
                </Tag>
              </Row>
            </Space>
          </Card>
        </Col>

        {/* Emergency Recovery Card */}
        <Col xs={24} md={12}>
          <Card
            title={
              <Space>
                <SafetyOutlined />
                <span style={{ color: '#ef4444' }}>Emergency Recovery</span>
              </Space>
            }
            size="small"
            style={{ ...cardStyle, borderColor: isDark ? '#7f1d1d' : '#fecaca' }}
          >
            <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
              Use these options if the site is broken or unresponsive.
            </Text>
            <Space wrap>
              <Popconfirm
                title="Enable Maintenance Mode?"
                description="Visitors will see a maintenance page."
                onConfirm={() => enableMaintenanceMutation.mutate()}
                okText="Enable"
              >
                <Button
                  icon={<PoweroffOutlined />}
                  loading={enableMaintenanceMutation.isPending}
                  size="small"
                >
                  Maintenance On
                </Button>
              </Popconfirm>

              <Button
                icon={<PoweroffOutlined />}
                onClick={() => disableMaintenanceMutation.mutate()}
                loading={disableMaintenanceMutation.isPending}
                size="small"
              >
                Maintenance Off
              </Button>

              <Divider type="vertical" />

              <Popconfirm
                title="Disable All Plugins?"
                description="This will deactivate all plugins except LSM."
                onConfirm={() => disablePluginsMutation.mutate()}
                okText="Disable All"
                okButtonProps={{ danger: true }}
              >
                <Button
                  danger
                  icon={<CloseCircleOutlined />}
                  loading={disablePluginsMutation.isPending}
                  size="small"
                >
                  Disable Plugins
                </Button>
              </Popconfirm>

              <Button
                icon={<CheckCircleOutlined />}
                onClick={() => restorePluginsMutation.mutate()}
                loading={restorePluginsMutation.isPending}
                size="small"
              >
                Restore Plugins
              </Button>
            </Space>

            <Divider style={{ margin: '12px 0' }} />

            <Popconfirm
              title="Execute Full Emergency Recovery?"
              description="This will: enable maintenance, disable all plugins, and switch to default theme."
              onConfirm={() => emergencyRecoveryMutation.mutate()}
              okText="Execute Recovery"
              okButtonProps={{ danger: true }}
            >
              <Button
                danger
                type="primary"
                icon={<WarningOutlined />}
                loading={emergencyRecoveryMutation.isPending}
                block
              >
                🚨 Emergency Recovery
              </Button>
            </Popconfirm>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
