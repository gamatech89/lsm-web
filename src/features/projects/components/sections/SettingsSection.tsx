/**
 * Settings Section - Project settings and configuration
 * 
 * Manages: Plugin Connection, Monitoring Toggles, Notifications
 */

import { useState, useEffect } from 'react';
import { 
  Typography, Card, Switch, Space, Button, Input, Alert, Tag,
  Row, Col, Divider, App, Tooltip, Table
} from 'antd';
import { 

  CheckCircleOutlined,
  ApiOutlined,
  BellOutlined,
  MailOutlined,
  SafetyCertificateOutlined,
  GlobalOutlined,
  EyeOutlined,
  SaveOutlined,
  RocketOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  ThunderboltOutlined,
  BugOutlined,
  SecurityScanOutlined,
  CloudServerOutlined,
} from '@ant-design/icons';
import { useThemeStore } from '@/stores/theme';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiClient } from '@/lib/api';

const { Text, Title } = Typography;

interface SettingsSectionProps {
  project: any;
}



interface NotificationTrigger {
  enabled: boolean;
  email: boolean;
}

interface NotificationPreferences {
  email_alerts_enabled: boolean;
  alert_email: string;
  triggers: {
    site_down: NotificationTrigger;
    ssl_expiring: NotificationTrigger;
    error_500: NotificationTrigger;
    plugin_updates: NotificationTrigger;
    backup_failed: NotificationTrigger;
    security_issue: NotificationTrigger;
  };
}

const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  email_alerts_enabled: true,
  alert_email: '',
  triggers: {
    site_down: { enabled: true, email: true },
    ssl_expiring: { enabled: true, email: true },
    error_500: { enabled: true, email: true },
    plugin_updates: { enabled: true, email: false },
    backup_failed: { enabled: true, email: true },
    security_issue: { enabled: true, email: true },
  },
};



const triggerConfig = [
  { key: 'site_down', label: 'Site Down / Unreachable', icon: <WarningOutlined style={{ color: '#ff4d4f' }} />, description: 'Alerts when site returns 5xx error or is unreachable' },
  { key: 'ssl_expiring', label: 'SSL Certificate Expiring', icon: <SafetyCertificateOutlined style={{ color: '#faad14' }} />, description: 'Alerts when SSL expires within 14 days' },
  { key: 'error_500', label: 'PHP / 500 Errors', icon: <BugOutlined style={{ color: '#ff7875' }} />, description: 'Alerts on server-side PHP errors' },
  { key: 'plugin_updates', label: 'Plugin Updates Available', icon: <ThunderboltOutlined style={{ color: '#1890ff' }} />, description: 'Alerts when plugins have available updates' },
  { key: 'backup_failed', label: 'Backup Failed', icon: <CloudServerOutlined style={{ color: '#ff4d4f' }} />, description: 'Alerts when a scheduled backup fails' },
  { key: 'security_issue', label: 'Security Issues', icon: <SecurityScanOutlined style={{ color: '#ff4d4f' }} />, description: 'Alerts on security vulnerabilities detected' },
];

export default function SettingsSection({ project }: SettingsSectionProps) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';

  const cardStyle = {
    borderRadius: 12,
    background: isDark ? '#1e293b' : '#fff',
    marginBottom: 16,
  };

  // ─── Local State ─────────────────────────
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>(
    project.notification_preferences ?? DEFAULT_NOTIFICATION_PREFS
  );

  // Reset notif prefs when project data changes
  useEffect(() => {
    if (project.notification_preferences) {
      setNotifPrefs({
        ...DEFAULT_NOTIFICATION_PREFS,
        ...project.notification_preferences,
        triggers: {
          ...DEFAULT_NOTIFICATION_PREFS.triggers,
          ...(project.notification_preferences?.triggers ?? {}),
        },
      });
    }
  }, [project.notification_preferences]);



  // ─── Mutations ───────────────────────────
  const updateProjectMutation = useMutation({
    mutationFn: (data: Record<string, any>) => 
      api.projects.update(project.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', project.id] });
    },
  });

  const saveApiKeyMutation = useMutation({
    mutationFn: async () => {
      if (!apiKeyInput.trim()) throw new Error('Please enter an API key');
      return api.projects.update(project.id, { health_check_secret: apiKeyInput });
    },
    onSuccess: () => {
      message.success('API key saved! Connection established.');
      queryClient.invalidateQueries({ queryKey: ['projects', project.id] });
      queryClient.invalidateQueries({ queryKey: ['lsm-status', project.id] });
      setApiKeyInput('');
    },
    onError: (err: any) => message.error(err?.message || 'Failed to save API key'),
  });

  const saveNotifPrefsMutation = useMutation({
    mutationFn: () => 
      api.projects.update(project.id, { notification_preferences: notifPrefs }),
    onSuccess: () => {
      message.success('Notification preferences saved!');
      queryClient.invalidateQueries({ queryKey: ['projects', project.id] });
    },
    onError: () => message.error('Failed to save notification preferences'),
  });

  // Download Plugin
  const [downloadingPlugin, setDownloadingPlugin] = useState(false);
  const handleDownloadPlugin = async () => {
    setDownloadingPlugin(true);
    try {
      const response = await api.lsm.downloadPlugin(project.id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'landeseiten-maintenance.zip');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      message.success('Plugin downloaded!');
    } catch {
      message.error('Failed to download plugin');
    } finally {
      setDownloadingPlugin(false);
    }
  };

  // ─── Monitoring Toggle Handlers ──────────
  const handleMonitoringToggle = (field: string, checked: boolean) => {
    updateProjectMutation.mutate(
      { [field]: checked },
      {
        onSuccess: () => message.success(`${field.replace(/_/g, ' ')} ${checked ? 'enabled' : 'disabled'}`),
        onError: () => message.error('Failed to update setting'),
      }
    );
  };

  // ─── Notification Helpers ────────────────
  const updateTrigger = (key: string, field: keyof NotificationTrigger, value: boolean) => {
    setNotifPrefs(prev => ({
      ...prev,
      triggers: {
        ...prev.triggers,
        [key]: {
          ...prev.triggers[key as keyof typeof prev.triggers],
          [field]: value,
        },
      },
    }));
  };

  const isConnected = !!project.health_check_secret;
  const lastCheck = project.last_health_check_at 
    ? new Date(project.last_health_check_at).toLocaleString()
    : null;

  return (
    <div style={{ padding: '24px 0' }}>
      <Title level={5} style={{ marginBottom: 20 }}>Project Settings</Title>

      {/* ═══ PLUGIN CONNECTION ═══ */}
      <Card 
        style={cardStyle} 
        title={
          <Space>
            <ApiOutlined />
            <span>WordPress Connection</span>
            {isConnected && (
              <Tag color="green" icon={<CheckCircleOutlined />}>Connected</Tag>
            )}
          </Space>
        }
      >
        <div>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>API Key</Text>
          <div style={{ display: 'flex', gap: 8 }}>
            <Input.Password
              placeholder={isConnected ? '••••••••••••••••••••' : 'Paste API key from WordPress plugin...'}
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              onPressEnter={() => saveApiKeyMutation.mutate()}
              size="large"
              style={{ flex: 1 }}
            />
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saveApiKeyMutation.isPending}
              onClick={() => saveApiKeyMutation.mutate()}
              size="large"
            >
              Save & Connect
            </Button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Find this in WP Admin → Landeseiten → API Connection
            </Text>
            <a onClick={handleDownloadPlugin} style={{ fontSize: 12, cursor: 'pointer' }}>
              <RocketOutlined style={{ marginRight: 4 }} />
              {downloadingPlugin ? 'Downloading...' : "Don't have the plugin? Download it"}
            </a>
          </div>
        </div>
        {isConnected && lastCheck && (
          <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 8, background: isDark ? '#0f172a' : '#f8fafc' }}>
            <Space>
              <ClockCircleOutlined style={{ color: '#8b5cf6' }} />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Last health check: <Text strong style={{ fontSize: 12 }}>{lastCheck}</Text>
              </Text>
            </Space>
          </div>
        )}
      </Card>

      {/* ═══ MONITORING ═══ */}
      <Card 
        style={cardStyle} 
        title={
          <Space>
            <EyeOutlined />
            <span>Monitoring</span>
          </Space>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Space>
                <EyeOutlined style={{ color: '#52c41a' }} />
                <Text strong>Uptime Monitoring</Text>
              </Space>
              <div style={{ marginLeft: 22 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Check site availability every 5 minutes</Text>
              </div>
            </div>
            <Switch 
              checked={project.uptime_monitoring_enabled !== false}
              loading={updateProjectMutation.isPending}
              onChange={(checked) => handleMonitoringToggle('uptime_monitoring_enabled', checked)}
            />
          </div>
          <Divider style={{ margin: '4px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Space>
                <SafetyCertificateOutlined style={{ color: '#1890ff' }} />
                <Text strong>SSL Expiry Alerts</Text>
              </Space>
              <div style={{ marginLeft: 22 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Get notified before SSL expires
                  {project.ssl_expires_at && (
                    <> · Expires: <Text strong style={{ fontSize: 12 }}>{new Date(project.ssl_expires_at).toLocaleDateString()}</Text></>
                  )}
                </Text>
              </div>
            </div>
            <Switch 
              checked={project.ssl_alerts_enabled !== false}
              loading={updateProjectMutation.isPending}
              onChange={(checked) => handleMonitoringToggle('ssl_alerts_enabled', checked)}
            />
          </div>
        </Space>
      </Card>

      {/* ═══ NOTIFICATIONS ═══ */}
      <Card 
        style={cardStyle} 
        title={
          <Space>
            <BellOutlined />
            <span>Notifications</span>
          </Space>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }} size={20}>
          {/* Email Configuration */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Space>
                <MailOutlined style={{ color: '#1890ff' }} />
                <Text strong>Email Alerts</Text>
              </Space>
              <Switch 
                checked={notifPrefs.email_alerts_enabled}
                onChange={(checked) => {
                  const updated = { ...notifPrefs, email_alerts_enabled: checked };
                  setNotifPrefs(updated);
                  saveNotifPrefsMutation.mutate();
                }}
              />
            </div>
            {notifPrefs.email_alerts_enabled && (
              <div style={{ display: 'flex', gap: 8, maxWidth: 500 }}>
                <Input
                  prefix={<MailOutlined />}
                  placeholder="Alert email address (defaults to project client email)"
                  value={notifPrefs.alert_email}
                  onChange={(e) => setNotifPrefs(prev => ({ ...prev, alert_email: e.target.value }))}
                />
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={saveNotifPrefsMutation.isPending}
                  onClick={() => saveNotifPrefsMutation.mutate()}
                >
                  Save
                </Button>
              </div>
            )}
          </div>

          <Divider style={{ margin: 0 }} />

          {/* Notification Triggers Table */}
          <div>
            <Text strong style={{ display: 'block', marginBottom: 12 }}>Alert Triggers</Text>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {triggerConfig.map((trigger) => {
                const triggerKey = trigger.key as keyof NotificationPreferences['triggers'];
                const triggerState = notifPrefs.triggers[triggerKey];
                return (
                  <div 
                    key={trigger.key}
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '10px 16px',
                      borderRadius: 8,
                      background: isDark ? '#0f172a' : '#f8fafc',
                      border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                    }}
                  >
                    <Space>
                      {trigger.icon}
                      <div>
                        <Text strong style={{ display: 'block' }}>{trigger.label}</Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>{trigger.description}</Text>
                      </div>
                    </Space>
                    <Space size={16}>
                      <Tooltip title="In-App notification">
                        <div style={{ textAlign: 'center' }}>
                          <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>In-App</Text>
                          <Switch 
                            size="small"
                            checked={triggerState?.enabled ?? true}
                            onChange={(checked) => updateTrigger(trigger.key, 'enabled', checked)}
                          />
                        </div>
                      </Tooltip>
                      <Tooltip title="Email notification">
                        <div style={{ textAlign: 'center' }}>
                          <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>Email</Text>
                          <Switch 
                            size="small"
                            checked={triggerState?.email ?? false}
                            onChange={(checked) => updateTrigger(trigger.key, 'email', checked)}
                            disabled={!notifPrefs.email_alerts_enabled}
                          />
                        </div>
                      </Tooltip>
                    </Space>
                  </div>
                );
              })}
            </div>
          </div>

          {!notifPrefs.email_alerts_enabled && (
            <Alert
              type="info"
              message="Email alerts are disabled. Enable them above to receive email notifications for critical events."
              showIcon
              style={{ borderRadius: 8 }}
            />
          )}
        </Space>
      </Card>


    </div>
  );
}
