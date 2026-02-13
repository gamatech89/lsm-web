/**
 * WordPress Management Drawer
 * 
 * Premium slide-out panel for comprehensive WordPress site management.
 * Features: SSO Login, Cache Control, Updates, Recovery/Killswitch
 */

import { useState } from 'react';
import {
  Drawer,
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
  Progress,
  Card,
  Row,
  Col,
  List,
  Tooltip,
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
  CloudDownloadOutlined,
  PoweroffOutlined,
  ReloadOutlined,
  GlobalOutlined,
  LockOutlined,
  ApiOutlined,
  SettingOutlined,
  ExclamationCircleOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatRelativeTime } from '@lsm/utils';

const { Title, Text, Paragraph } = Typography;

interface WordPressManagementDrawerProps {
  project: any;
  open: boolean;
  onClose: () => void;
}

export function WordPressManagementDrawer({ project, open, onClose }: WordPressManagementDrawerProps) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [ssoLoading, setSsoLoading] = useState(false);

  // Check LSM status
  const { data: lsmStatus, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ['lsm-status', project.id],
    queryFn: () => api.lsm.getStatus(project.id).then(r => r.data),
    enabled: open && !!project.health_check_secret,
  });

  // Get health data
  const { data: health, isLoading: healthLoading, refetch: refetchHealth } = useQuery({
    queryKey: ['lsm-health', project.id],
    queryFn: () => api.lsm.getHealth(project.id).then(r => r.data),
    enabled: open && !!project.health_check_secret && lsmStatus?.connected,
    staleTime: 30000,
  });

  // Get available updates
  const { data: updates, isLoading: updatesLoading, refetch: refetchUpdates } = useQuery({
    queryKey: ['lsm-updates', project.id],
    queryFn: () => api.lsm.getUpdates(project.id).then(r => r.data),
    enabled: open && !!project.health_check_secret && lsmStatus?.connected,
    staleTime: 60000,
  });

  // SSO Login
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

  // Mutations
  const clearCacheMutation = useMutation({
    mutationFn: () => api.lsm.clearCache(project.id),
    onSuccess: (response) => {
      const cleared = response.data.cleared?.length || 0;
      message.success(`Cleared ${cleared} cache type(s)`);
    },
    onError: () => message.error('Failed to clear cache'),
  });

  const optimizeDbMutation = useMutation({
    mutationFn: () => api.lsm.optimizeDatabase(project.id),
    onSuccess: (response) => {
      message.success(`Optimized ${response.data.tables_count || 0} tables`);
    },
    onError: () => message.error('Failed to optimize database'),
  });

  const flushRewriteMutation = useMutation({
    mutationFn: () => api.lsm.flushRewrite(project.id),
    onSuccess: () => message.success('Rewrite rules flushed'),
    onError: () => message.error('Failed to flush rewrite rules'),
  });

  const updateAllPluginsMutation = useMutation({
    mutationFn: () => api.lsm.updateAllPlugins(project.id),
    onSuccess: (response) => {
      message.success(`Updated ${response.data.updated_count || 0} plugin(s)`);
      refetchUpdates();
      refetchHealth();
      queryClient.invalidateQueries({ queryKey: ['projects', project.id] });
    },
    onError: () => message.error('Failed to update plugins'),
  });

  const updateCoreMutation = useMutation({
    mutationFn: () => api.lsm.updateCore(project.id),
    onSuccess: () => {
      message.success('WordPress core updated');
      refetchUpdates();
      refetchHealth();
    },
    onError: () => message.error('Failed to update WordPress core'),
  });

  const enableMaintenanceMutation = useMutation({
    mutationFn: () => api.lsm.enableMaintenance(project.id),
    onSuccess: () => message.success('Maintenance mode enabled'),
    onError: () => message.error('Failed to enable maintenance mode'),
  });

  const disableMaintenanceMutation = useMutation({
    mutationFn: () => api.lsm.disableMaintenance(project.id),
    onSuccess: () => message.success('Maintenance mode disabled'),
    onError: () => message.error('Failed to disable maintenance mode'),
  });

  const disablePluginsMutation = useMutation({
    mutationFn: () => api.lsm.disablePlugins(project.id),
    onSuccess: (response) => {
      message.warning(`Disabled ${response.data.disabled_count || 0} plugin(s)`);
    },
    onError: () => message.error('Failed to disable plugins'),
  });

  const restorePluginsMutation = useMutation({
    mutationFn: () => api.lsm.restorePlugins(project.id),
    onSuccess: (response) => {
      message.success(`Restored ${response.data.restored_count || 0} plugin(s)`);
    },
    onError: () => message.error('Failed to restore plugins'),
  });

  const emergencyRecoveryMutation = useMutation({
    mutationFn: () => api.lsm.emergencyRecovery(project.id),
    onSuccess: () => message.warning('Emergency recovery executed!'),
    onError: () => message.error('Failed to execute emergency recovery'),
  });

  // Calculate update counts
  const pluginUpdates = updates?.plugins?.length || 0;
  const themeUpdates = updates?.themes?.length || 0;
  const coreUpdate = updates?.core ? 1 : 0;
  const totalUpdates = pluginUpdates + themeUpdates + coreUpdate;

  // Not configured content
  const notConfiguredContent = (
    <div style={{ textAlign: 'center', padding: '60px 24px' }}>
      <div style={{ 
        width: 80, 
        height: 80, 
        borderRadius: '50%', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 24px',
      }}>
        <ApiOutlined style={{ fontSize: 36, color: '#fff' }} />
      </div>
      <Title level={4} style={{ marginBottom: 16 }}>Connect WordPress Site</Title>
      <Paragraph type="secondary" style={{ maxWidth: 360, margin: '0 auto 24px' }}>
        Install the Remote Management Bridge plugin on your WordPress site to enable 
        remote management, SSO login, and emergency recovery features.
      </Paragraph>
      <Space direction="vertical" size={16} style={{ width: '100%', maxWidth: 300 }}>
        <Button type="primary" size="large" icon={<RocketOutlined />} block>
          Get LSM Plugin
        </Button>
        <Alert
          message="After installation, copy the API key from WordPress → Settings → LSM, 
          then paste it in this project's edit form under WordPress Integration."
          type="info"
          showIcon
        />
      </Space>
    </div>
  );

  // Main content
  const mainContent = (
    <div style={{ padding: '0' }}>
      {/* Connection Status Header */}
      <div style={{ 
        padding: '20px 24px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: 16,
        marginBottom: 24,
        color: '#fff',
      }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Space>
              <Badge status="success" />
              <Text style={{ color: '#fff' }}>Connected to LSM v{lsmStatus?.plugin_version || '1.0.0'}</Text>
            </Space>
            <div style={{ marginTop: 8 }}>
              <Title level={4} style={{ color: '#fff', margin: 0 }}>{project.name}</Title>
              <Text style={{ color: 'rgba(255,255,255,0.8)' }}>{project.url}</Text>
            </div>
          </Col>
          <Col>
            <Button
              type="primary"
              size="large"
              icon={<LoginOutlined />}
              loading={ssoLoading}
              onClick={handleSsoLogin}
              style={{ 
                background: 'rgba(255,255,255,0.2)', 
                borderColor: 'transparent',
                height: 48,
                fontSize: 15,
              }}
            >
              WP Admin Login
            </Button>
          </Col>
        </Row>
      </div>

      {/* Quick Stats Row */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card size="small" style={{ textAlign: 'center', borderRadius: 12 }}>
            <Statistic
              title="WordPress"
              value={health?.wordpress?.version || project.wp_version || '-'}
              valueStyle={{ fontSize: 16, fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ textAlign: 'center', borderRadius: 12 }}>
            <Statistic
              title="PHP"
              value={health?.php?.version || project.php_version || '-'}
              valueStyle={{ fontSize: 16, fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ textAlign: 'center', borderRadius: 12 }}>
            <Statistic
              title="Plugins"
              value={health?.plugins?.total || '-'}
              suffix={health?.plugins?.active ? `/ ${health.plugins.active} active` : ''}
              valueStyle={{ fontSize: 16, fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ textAlign: 'center', borderRadius: 12 }}>
            <Statistic
              title="SSL"
              value={health?.ssl?.enabled ? 'Valid' : 'None'}
              valueStyle={{ 
                fontSize: 16, 
                fontWeight: 600,
                color: health?.ssl?.enabled ? '#52c41a' : '#faad14' 
              }}
              prefix={health?.ssl?.enabled ? <LockOutlined /> : <ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Quick Actions */}
      <div style={{ marginBottom: 24 }}>
        <Title level={5} style={{ marginBottom: 16 }}>
          <ThunderboltOutlined style={{ marginRight: 8 }} />
          Quick Actions
        </Title>
        <Row gutter={12}>
          <Col span={8}>
            <Button
              icon={<ClearOutlined />}
              onClick={() => clearCacheMutation.mutate()}
              loading={clearCacheMutation.isPending}
              block
              size="large"
              style={{ height: 56 }}
            >
              <div>
                <div>Clear Cache</div>
                <Text type="secondary" style={{ fontSize: 11 }}>All cache plugins</Text>
              </div>
            </Button>
          </Col>
          <Col span={8}>
            <Button
              icon={<DatabaseOutlined />}
              onClick={() => optimizeDbMutation.mutate()}
              loading={optimizeDbMutation.isPending}
              block
              size="large"
              style={{ height: 56 }}
            >
              <div>
                <div>Optimize DB</div>
                <Text type="secondary" style={{ fontSize: 11 }}>Clean tables</Text>
              </div>
            </Button>
          </Col>
          <Col span={8}>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => flushRewriteMutation.mutate()}
              loading={flushRewriteMutation.isPending}
              block
              size="large"
              style={{ height: 56 }}
            >
              <div>
                <div>Flush URLs</div>
                <Text type="secondary" style={{ fontSize: 11 }}>Permalinks</Text>
              </div>
            </Button>
          </Col>
        </Row>
      </div>

      {/* Available Updates */}
      <Card
        title={
          <Space>
            <CloudDownloadOutlined />
            Available Updates
            {totalUpdates > 0 && <Badge count={totalUpdates} style={{ backgroundColor: '#f59e0b' }} />}
          </Space>
        }
        extra={
          <Button 
            type="text" 
            icon={<SyncOutlined spin={updatesLoading} />} 
            onClick={() => refetchUpdates()} 
            size="small"
          />
        }
        style={{ marginBottom: 24, borderRadius: 12 }}
      >
        {updatesLoading ? (
          <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
        ) : totalUpdates === 0 ? (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <CheckCircleOutlined style={{ fontSize: 32, color: '#52c41a', marginBottom: 8 }} />
            <div><Text type="secondary">Everything is up to date!</Text></div>
          </div>
        ) : (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ 
                    fontSize: 28, 
                    fontWeight: 700,
                    color: coreUpdate ? '#f59e0b' : '#52c41a'
                  }}>
                    {coreUpdate ? <WarningOutlined /> : <CheckCircleOutlined />}
                  </div>
                  <Text type="secondary">Core</Text>
                  {coreUpdate > 0 && (
                    <div><Text type="secondary" style={{ fontSize: 11 }}>→ v{updates?.core?.new_version}</Text></div>
                  )}
                </div>
              </Col>
              <Col span={8}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: pluginUpdates ? '#f59e0b' : '#52c41a' }}>
                    {pluginUpdates}
                  </div>
                  <Text type="secondary">Plugins</Text>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: themeUpdates ? '#f59e0b' : '#52c41a' }}>
                    {themeUpdates}
                  </div>
                  <Text type="secondary">Themes</Text>
                </div>
              </Col>
            </Row>

            <Space wrap>
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
                  >
                    Update All Plugins
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
                  >
                    Update Core
                  </Button>
                </Popconfirm>
              )}
            </Space>
          </>
        )}
      </Card>

      {/* Emergency Recovery */}
      <Card
        title={
          <Space>
            <SafetyOutlined style={{ color: '#ef4444' }} />
            <span style={{ color: '#ef4444' }}>Emergency Recovery</span>
          </Space>
        }
        style={{ borderRadius: 12, borderColor: '#fecaca' }}
      >
        <Paragraph type="secondary" style={{ marginBottom: 16 }}>
          Use these options if the site is broken or unresponsive.
        </Paragraph>
        
        <Space wrap style={{ marginBottom: 16 }}>
          <Popconfirm
            title="Enable Maintenance Mode?"
            description="Visitors will see a maintenance page."
            onConfirm={() => enableMaintenanceMutation.mutate()}
            okText="Enable"
          >
            <Button icon={<PoweroffOutlined />} loading={enableMaintenanceMutation.isPending}>
              Maintenance On
            </Button>
          </Popconfirm>

          <Button
            icon={<PoweroffOutlined />}
            onClick={() => disableMaintenanceMutation.mutate()}
            loading={disableMaintenanceMutation.isPending}
          >
            Maintenance Off
          </Button>

          <Popconfirm
            title="Disable All Plugins?"
            description="This will deactivate all plugins except LSM."
            onConfirm={() => disablePluginsMutation.mutate()}
            okText="Disable All"
            okButtonProps={{ danger: true }}
          >
            <Button danger icon={<CloseCircleOutlined />} loading={disablePluginsMutation.isPending}>
              Disable Plugins
            </Button>
          </Popconfirm>

          <Button
            icon={<CheckCircleOutlined />}
            onClick={() => restorePluginsMutation.mutate()}
            loading={restorePluginsMutation.isPending}
          >
            Restore Plugins
          </Button>
        </Space>

        <Divider style={{ margin: '16px 0' }} />

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
            size="large"
          >
            🚨 Full Emergency Recovery
          </Button>
        </Popconfirm>
      </Card>
    </div>
  );

  return (
    <Drawer
      title={
        <Space>
          <SettingOutlined />
          WordPress Management
        </Space>
      }
      placement="right"
      width={560}
      open={open}
      onClose={onClose}
      extra={
        <Button 
          type="text" 
          icon={<GlobalOutlined />} 
          onClick={() => window.open(project.url, '_blank')}
        >
          Visit Site
        </Button>
      }
    >
      {!project.health_check_secret ? (
        notConfiguredContent
      ) : statusLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Spin size="large" />
        </div>
      ) : !lsmStatus?.connected ? (
        <Alert
          message="Cannot Connect to WordPress"
          description={lsmStatus?.message || 'Failed to connect to the LSM plugin on this site. Check if the plugin is installed and API key is correct.'}
          type="error"
          showIcon
          style={{ margin: '24px 0' }}
        />
      ) : (
        mainContent
      )}
    </Drawer>
  );
}
