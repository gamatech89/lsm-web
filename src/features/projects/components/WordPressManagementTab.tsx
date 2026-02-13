/**
 * WordPress Management Tab
 * 
 * Premium inline panel for WordPress site management within project detail page.
 * Features: SSO Login, Cache Control, Updates, Recovery/Killswitch
 */

import { useState } from 'react';
import {
  Typography,
  Button,
  Space,
  Spin,
  Statistic,
  Alert,
  Popconfirm,
  Divider,
  Badge,
  App,
  Card,
  Row,
  Col,
  Input,
  Modal,
  Tooltip,
  Switch,
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
  ApiOutlined,
  RocketOutlined,
  SettingOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

const { Title, Text, Paragraph } = Typography;

interface WordPressManagementTabProps {
  project: any;
}

export function WordPressManagementTab({ project }: WordPressManagementTabProps) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [ssoLoading, setSsoLoading] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(project.health_check_secret || '');
  const [savingApiKey, setSavingApiKey] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  // Check LSM status
  const { data: lsmStatus, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ['lsm-status', project.id],
    queryFn: () => api.lsm.getStatus(project.id).then(r => (r.data as any)?.data || r.data),
    enabled: !!project.health_check_secret,
    staleTime: 30000,
  });

  // Get health data
  const { data: health, isLoading: healthLoading, refetch: refetchHealth } = useQuery({
    queryKey: ['lsm-health', project.id],
    queryFn: () => api.lsm.getHealth(project.id).then(r => (r.data as any)?.data || r.data),
    enabled: !!project.health_check_secret && lsmStatus?.connected,
    staleTime: 30000,
  });

  // Get available updates
  const { data: updates, isLoading: updatesLoading, refetch: refetchUpdates } = useQuery({
    queryKey: ['lsm-updates', project.id],
    queryFn: () => api.lsm.getUpdates(project.id).then(r => (r.data as any)?.data || r.data),
    enabled: !!project.health_check_secret && lsmStatus?.connected,
    staleTime: 60000,
  });

  // Get recovery status (includes maintenance_mode)
  const { data: recoveryStatus, refetch: refetchRecoveryStatus } = useQuery({
    queryKey: ['lsm-recovery-status', project.id],
    queryFn: () => api.lsm.getRecoveryStatus(project.id).then(r => (r.data as any)?.data || r.data),
    enabled: !!project.health_check_secret && lsmStatus?.connected,
    staleTime: 10000,
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
    onSuccess: () => {
      message.success('Maintenance mode enabled');
      refetchRecoveryStatus();
    },
    onError: () => message.error('Failed to enable maintenance mode'),
  });

  const disableMaintenanceMutation = useMutation({
    mutationFn: () => api.lsm.disableMaintenance(project.id),
    onSuccess: () => {
      message.success('Maintenance mode disabled');
      refetchRecoveryStatus();
    },
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

  // Save API Key handler
  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) {
      message.error('Please enter an API key');
      return;
    }
    setSavingApiKey(true);
    try {
      await api.projects.update(project.id, { health_check_secret: apiKeyInput });
      message.success('API key saved successfully');
      setShowApiKeyModal(false);
      // Invalidate and refetch to ensure UI updates
      await queryClient.invalidateQueries({ queryKey: ['projects', project.id] });
      await queryClient.invalidateQueries({ queryKey: ['lsm-status', project.id] });
      await queryClient.refetchQueries({ queryKey: ['projects', project.id] });
      refetchStatus();
    } catch (error) {
      message.error('Failed to save API key');
    } finally {
      setSavingApiKey(false);
    }
  };

  // Plugin Download Handler
  const [downloadingPlugin, setDownloadingPlugin] = useState(false);

  const handleDownloadPlugin = async () => {
    setDownloadingPlugin(true);
    try {
      // Use helper method
      const response = await api.lsm.downloadPlugin(project.id);
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'landeseiten-maintenance.zip');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      message.success('Plugin downloaded successfully');
    } catch (error) {
      console.error('Download error:', error);
      message.error('Failed to download plugin');
    } finally {
      setDownloadingPlugin(false);
    }
  };

  // Not configured state - show API key input
  if (!project.health_check_secret) {
    return (
      <div style={{ padding: '40px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
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
          <Title level={4} style={{ marginBottom: 8 }}>Connect WordPress Site</Title>
          <Paragraph type="secondary" style={{ maxWidth: 500, margin: '0 auto 24px' }}>
            Install the <strong>Landeseiten Maintenance</strong> plugin on your WordPress site, 
            then paste the API key below to enable remote management.
          </Paragraph>
        </div>
        
        <Card style={{ maxWidth: 500, margin: '0 auto', borderRadius: 12 }}>
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>API Key</Text>
            <Input.Password
              size="large"
              placeholder="Paste API key from Landeseiten Maintenance plugin..."
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              onPressEnter={handleSaveApiKey}
            />
            <Text type="secondary" style={{ fontSize: 12, marginTop: 6, display: 'block' }}>
              Find this in WordPress Admin → Landeseiten → API Connection
            </Text>
          </div>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={savingApiKey}
            onClick={handleSaveApiKey}
            block
            size="large"
          >
            Save & Connect
          </Button>
        </Card>
        
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <Button 
            type="link" 
            icon={<RocketOutlined />}
            onClick={handleDownloadPlugin}
            loading={downloadingPlugin}
          >
            Download Plugin
          </Button>
        </div>
      </div>
    );
  }

  // Loading state
  if (statusLoading) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  // Connection error state
  if (!lsmStatus?.connected) {
    return (
      <div style={{ padding: 24 }}>
        {/* API Key Update Modal */}
        <Modal
          title="Update API Key"
          open={showApiKeyModal}
          onCancel={() => setShowApiKeyModal(false)}
          footer={[
            <Button key="cancel" onClick={() => setShowApiKeyModal(false)}>
              Cancel
            </Button>,
            <Button key="save" type="primary" loading={savingApiKey} onClick={handleSaveApiKey}>
              Save API Key
            </Button>,
          ]}
        >
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary">
              If you reinstalled the WordPress plugin, paste the new API key here.
            </Text>
          </div>
          <Input.Password
            size="large"
            placeholder="Paste new API key from WordPress..."
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
          />
        </Modal>

        <Alert
          message="Cannot Connect to WordPress"
          description={lsmStatus?.message || 'Check if the plugin is active and API key is correct.'}
          type="error"
          showIcon
          action={
            <Button 
              size="small" 
              onClick={() => {
                setApiKeyInput(project.health_check_secret || '');
                setShowApiKeyModal(true);
              }}
            >
              Update API Key
            </Button>
          }
        />
      </div>
    );
  }

  // Connected - show full panel
  return (
    <div style={{ padding: '16px 0' }}>
      {/* API Key Update Modal */}
      <Modal
        title="Update API Key"
        open={showApiKeyModal}
        onCancel={() => setShowApiKeyModal(false)}
        footer={[
          <Button key="cancel" onClick={() => setShowApiKeyModal(false)}>
            Cancel
          </Button>,
          <Button key="save" type="primary" loading={savingApiKey} onClick={handleSaveApiKey}>
            Save API Key
          </Button>,
        ]}
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">
            If you reinstalled the WordPress plugin, paste the new API key here.
          </Text>
        </div>
        <Input.Password
          size="large"
          placeholder="Paste new API key from WordPress..."
          value={apiKeyInput}
          onChange={(e) => setApiKeyInput(e.target.value)}
        />
      </Modal>

      {/* Connection Header */}
      <div style={{ 
        padding: '16px 20px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: 12,
        marginBottom: 20,
        color: '#fff',
      }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Space>
              <Badge status="success" />
              <Text style={{ color: '#fff' }}>Connected to LSM v{lsmStatus?.plugin_version || '1.0.0'}</Text>
              <Tooltip title="Update API Key">
                <Button
                  type="text"
                  size="small"
                  icon={<SettingOutlined style={{ color: 'rgba(255,255,255,0.8)' }} />}
                  onClick={() => {
                    setApiKeyInput(project.health_check_secret || '');
                    setShowApiKeyModal(true);
                  }}
                  style={{ marginLeft: 8 }}
                />
              </Tooltip>
            </Space>
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
              }}
            >
              One-Click WP Login
            </Button>
          </Col>
        </Row>
      </div>

      <Row gutter={[16, 16]}>
        {/* Left Column - Actions & Stats */}
        <Col xs={24} md={12}>
          {/* Quick Stats */}
          <Card size="small" style={{ marginBottom: 16, borderRadius: 10 }}>
            <Row gutter={16}>
              <Col span={6} style={{ textAlign: 'center' }}>
                <Statistic
                  title="WP"
                  value={health?.wordpress?.version || project.wp_version || '-'}
                  valueStyle={{ fontSize: 14, fontWeight: 600 }}
                />
              </Col>
              <Col span={6} style={{ textAlign: 'center' }}>
                <Statistic
                  title="PHP"
                  value={health?.php?.version || project.php_version || '-'}
                  valueStyle={{ fontSize: 14, fontWeight: 600 }}
                />
              </Col>
              <Col span={6} style={{ textAlign: 'center' }}>
                <Statistic
                  title="Plugins"
                  value={health?.plugins?.total || '-'}
                  valueStyle={{ fontSize: 14, fontWeight: 600 }}
                />
              </Col>
              <Col span={6} style={{ textAlign: 'center' }}>
                <Statistic
                  title="SSL"
                  value={health?.ssl?.enabled ? 'Valid' : 'None'}
                  valueStyle={{ 
                    fontSize: 14, 
                    fontWeight: 600,
                    color: health?.ssl?.enabled ? '#52c41a' : '#faad14' 
                  }}
                />
              </Col>
            </Row>
          </Card>

          {/* Quick Actions */}
          <Card 
            title={<><ThunderboltOutlined /> Quick Actions</>}
            size="small"
            style={{ borderRadius: 10 }}
          >
            <Space wrap size={12}>
              <Button
                type="primary"
                icon={<LoginOutlined />}
                onClick={handleSsoLogin}
                loading={ssoLoading}
              >
                WP Login
              </Button>
              <Divider type="vertical" style={{ height: 32 }} />
              <Space size={8}>
                <Switch
                  checked={!!recoveryStatus?.maintenance_mode}
                  loading={enableMaintenanceMutation.isPending || disableMaintenanceMutation.isPending}
                  onChange={(checked) => {
                    if (checked) {
                      enableMaintenanceMutation.mutate();
                    } else {
                      disableMaintenanceMutation.mutate();
                    }
                  }}
                />
                <span style={{ color: '#888' }}>Maintenance</span>
              </Space>
              <Divider type="vertical" style={{ height: 32 }} />
              <Button
                icon={<ClearOutlined />}
                onClick={() => clearCacheMutation.mutate()}
                loading={clearCacheMutation.isPending}
              >
                Clear Cache
              </Button>
              <Button
                icon={<DatabaseOutlined />}
                onClick={() => optimizeDbMutation.mutate()}
                loading={optimizeDbMutation.isPending}
              >
                Optimize DB
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => flushRewriteMutation.mutate()}
                loading={flushRewriteMutation.isPending}
              >
                Flush URLs
              </Button>
            </Space>
          </Card>
        </Col>

        {/* Right Column - Updates & Recovery */}
        <Col xs={24} md={12}>
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
            size="small"
            style={{ marginBottom: 16, borderRadius: 10 }}
          >
            {updatesLoading ? (
              <div style={{ textAlign: 'center', padding: 16 }}><Spin /></div>
            ) : totalUpdates === 0 ? (
              <div style={{ textAlign: 'center', padding: 16 }}>
                <CheckCircleOutlined style={{ fontSize: 24, color: '#52c41a', marginBottom: 8 }} />
                <div><Text type="secondary">Everything up to date!</Text></div>
              </div>
            ) : (
              <>
                <Row gutter={8} style={{ marginBottom: 12 }}>
                  <Col span={8} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: coreUpdate ? '#f59e0b' : '#52c41a' }}>
                      {coreUpdate ? <WarningOutlined /> : <CheckCircleOutlined />}
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>Core</Text>
                  </Col>
                  <Col span={8} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: pluginUpdates ? '#f59e0b' : '#52c41a' }}>
                      {pluginUpdates}
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>Plugins</Text>
                  </Col>
                  <Col span={8} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: themeUpdates ? '#f59e0b' : '#52c41a' }}>
                      {themeUpdates}
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>Themes</Text>
                  </Col>
                </Row>
                <Space wrap size={8}>
                  {pluginUpdates > 0 && (
                    <Popconfirm
                      title={`Update all ${pluginUpdates} plugins?`}
                      onConfirm={() => updateAllPluginsMutation.mutate()}
                      okText="Update"
                    >
                      <Button
                        type="primary"
                        size="small"
                        icon={<CloudDownloadOutlined />}
                        loading={updateAllPluginsMutation.isPending}
                      >
                        Update Plugins
                      </Button>
                    </Popconfirm>
                  )}
                  {coreUpdate > 0 && (
                    <Popconfirm
                      title="Update WordPress Core?"
                      onConfirm={() => updateCoreMutation.mutate()}
                      okText="Update"
                    >
                      <Button
                        size="small"
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
            title={<span style={{ color: '#ef4444' }}><SafetyOutlined /> Emergency Recovery</span>}
            size="small"
            style={{ borderRadius: 10, borderColor: '#fecaca' }}
          >
            <Space wrap size={8}>
              <Popconfirm
                title="Disable All Plugins?"
                description="Deactivates all plugins except the maintenance plugin."
                onConfirm={() => disablePluginsMutation.mutate()}
                okButtonProps={{ danger: true }}
              >
                <Button size="small" danger icon={<CloseCircleOutlined />} loading={disablePluginsMutation.isPending}>
                  Disable Plugins
                </Button>
              </Popconfirm>
              <Button
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => restorePluginsMutation.mutate()}
                loading={restorePluginsMutation.isPending}
              >
                Restore Plugins
              </Button>
            </Space>
            <Divider style={{ margin: '12px 0' }} />
            <Popconfirm
              title="Execute Full Emergency Recovery?"
              description="Maintenance mode + disable plugins + fallback theme"
              onConfirm={() => emergencyRecoveryMutation.mutate()}
              okButtonProps={{ danger: true }}
            >
              <Button
                danger
                type="primary"
                icon={<WarningOutlined />}
                loading={emergencyRecoveryMutation.isPending}
                block
              >
                🚨 Full Emergency Recovery
              </Button>
            </Popconfirm>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
