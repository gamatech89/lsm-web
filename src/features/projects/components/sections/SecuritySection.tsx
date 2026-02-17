/**
 * Security Section - WordPress Security Overview
 * 
 * Features:
 * - Security score/status overview
 * - Plugin vulnerability scanning
 * - Security settings review
 * - Hardening recommendations
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
  Progress,
  Alert,
  List,
  App,
  Switch,
  Divider,
  Tooltip,
  Modal,
  Tabs,
  Table,
  Collapse,
  Badge,
  Popconfirm,
} from 'antd';
import {
  SafetyOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  BugOutlined,
  LockOutlined,
  EyeInvisibleOutlined,
  ApiOutlined,
  CommentOutlined,
  UserAddOutlined,
  SettingOutlined,
  EditOutlined,
  InfoCircleOutlined,
  CodeOutlined,
  CopyOutlined,
  SecurityScanOutlined,
  ThunderboltOutlined,
  HistoryOutlined,
  FileSearchOutlined,
  DatabaseOutlined,
  FolderOutlined,
  KeyOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useThemeStore } from '@/stores/theme';

const { Title, Text, Paragraph } = Typography;

interface SecuritySectionProps {
  project: any;
}

interface SecurityCheck {
  key: string;
  label: string;
  description: string;
  status: 'pass' | 'warning' | 'fail';
  recommendation?: string;
}

export default function SecuritySection({ project }: SecuritySectionProps) {
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const hasLsmConnection = !!project.health_check_secret;
  const [updatingSetting, setUpdatingSetting] = useState<string | null>(null);
  const [scanDetailsOpen, setScanDetailsOpen] = useState(false);
  const [selectedScan, setSelectedScan] = useState<any>(null);

  // Fetch health data
  const { data: healthData, isLoading, refetch } = useQuery({
    queryKey: ['lsm-health', project.id],
    queryFn: () => api.lsm.getHealth(project.id).then(r => (r.data as any)?.data || r.data),
    enabled: hasLsmConnection,
    staleTime: 30000,
  });

  // Fetch security settings
  const { data: securitySettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['lsm-security-settings', project.id],
    queryFn: () => api.lsm.getSecuritySettings(project.id).then(r => r.data?.data || r.data),
    enabled: hasLsmConnection,
    staleTime: 30000,
  });

  // Fetch security headers
  const { data: securityHeaders, isLoading: isLoadingHeaders } = useQuery({
    queryKey: ['lsm-security-headers', project.id],
    queryFn: () => api.lsm.getSecurityHeaders(project.id).then(r => r.data?.data || r.data),
    enabled: hasLsmConnection,
    staleTime: 60000, // Cache for 1 minute
  });

  // State for snippet modal
  const [snippetModalOpen, setSnippetModalOpen] = useState(false);

  // Fetch security header snippets (only when modal is open)
  const { data: headerSnippets, isLoading: isLoadingSnippets } = useQuery({
    queryKey: ['lsm-security-header-snippets', project.id],
    queryFn: () => api.lsm.getSecurityHeaderSnippets(project.id).then(r => r.data?.data || r.data),
    enabled: hasLsmConnection && snippetModalOpen,
    staleTime: 300000, // Cache for 5 minutes
  });


  // Update security setting mutation
  const updateSettingMutation = useMutation({
    mutationFn: (settings: Record<string, boolean>) =>
      api.lsm.updateSecuritySettings(project.id, settings),
    onSuccess: (_, variables) => {
      const settingName = Object.keys(variables)[0];
      message.success(`${settingName.replace('_', ' ')} updated`);
      queryClient.invalidateQueries({ queryKey: ['lsm-security-settings', project.id] });
      setUpdatingSetting(null);
    },
    onError: (error: any) => {
      message.error(error?.message || 'Failed to update setting');
      setUpdatingSetting(null);
    },
  });

  const handleToggleSetting = (key: string, value: boolean) => {
    setUpdatingSetting(key);
    updateSettingMutation.mutate({ [key]: value });
  };

  // Show empty state if not connected
  if (!hasLsmConnection) {
    return (
      <Empty
        image={<SafetyOutlined style={{ fontSize: 48, color: '#94a3b8' }} />}
        description={<Text type="secondary">Connect WordPress to enable security scanning</Text>}
      />
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">Analyzing security...</Text>
        </div>
      </div>
    );
  }

  const ssl = healthData?.ssl;
  const plugins = healthData?.plugins;

  // Detect active security plugins from the plugins list
  const securityPluginNames = ['wordfence', 'sucuri', 'ithemes-security', 'better-wp-security', 'all-in-one-wp-security', 'jetpack', 'solid-security'];
  const activeSecurityPlugin = plugins?.list?.find(
    (p: any) => p.active && securityPluginNames.some(name => p.name?.toLowerCase().includes(name))
  );

  // Build security checks using correct data sources
  const securityChecks: SecurityCheck[] = [
    {
      key: 'ssl',
      label: 'SSL Certificate',
      description: ssl?.enabled ? 'Site is secured with HTTPS' : 'Site is not using HTTPS',
      status: ssl?.enabled ? 'pass' : 'fail',
      recommendation: !ssl?.enabled ? 'Enable SSL to encrypt data in transit' : undefined,
    },
    {
      key: 'debug',
      label: 'Debug Mode',
      description: securitySettings?.debug_enabled ? 'Debug mode is enabled in production' : 'Debug mode is disabled',
      status: securitySettings?.debug_enabled ? 'fail' : 'pass',
      recommendation: securitySettings?.debug_enabled ? 'Disable WP_DEBUG in production' : undefined,
    },
    {
      key: 'file_editing',
      label: 'File Editing',
      description: securitySettings?.file_editing_disabled ? 'Plugin/theme file editing is disabled' : 'Plugin/theme file editing is enabled',
      status: securitySettings?.file_editing_disabled ? 'pass' : 'warning',
      recommendation: !securitySettings?.file_editing_disabled ? 'Add DISALLOW_FILE_EDIT to wp-config.php' : undefined,
    },
    {
      key: 'security_plugin',
      label: 'Security Plugin',
      description: activeSecurityPlugin ? `${activeSecurityPlugin.name} is active` : 'No security plugin detected',
      status: activeSecurityPlugin ? 'pass' : 'warning',
      recommendation: !activeSecurityPlugin ? 'Consider installing a security plugin like Wordfence' : undefined,
    },
    {
      key: 'outdated_plugins',
      label: 'Plugin Updates',
      description: plugins?.outdated_count > 0 ? `${plugins.outdated_count} plugin(s) need updating` : 'All plugins are up to date',
      status: plugins?.outdated_count > 0 ? (plugins.outdated_count > 3 ? 'fail' : 'warning') : 'pass',
      recommendation: plugins?.outdated_count > 0 ? `Update ${plugins.outdated_count} outdated plugin(s)` : undefined,
    },
  ];

  // Calculate score - 60% from Security Checks, 40% from Security Controls
  const passCount = securityChecks.filter(c => c.status === 'pass').length;
  const warningCount = securityChecks.filter(c => c.status === 'warning').length;
  const failCount = securityChecks.filter(c => c.status === 'fail').length;
  
  // Security Checks score (60% weight)
  const checksScore = (passCount * 100 + warningCount * 50) / securityChecks.length;
  
  // Security Controls score (40% weight) - 7 controls, each worth ~14.3% of controls score
  let controlsScore = 0;
  if (securitySettings) {
    if (!securitySettings.comments_enabled) controlsScore += 100 / 7;
    if (!securitySettings.registration_enabled) controlsScore += 100 / 7;
    if (!securitySettings.xmlrpc_enabled) controlsScore += 100 / 7;
    if (!securitySettings.rest_api_public) controlsScore += 100 / 7;
    if (securitySettings.file_editing_disabled) controlsScore += 100 / 7;
    if (!securitySettings.debug_enabled) controlsScore += 100 / 7;
    if (securitySettings.security_headers_enabled) controlsScore += 100 / 7;
  }
  
  // Combined weighted score
  const score = Math.round(checksScore * 0.6 + controlsScore * 0.4);

  const getScoreColor = () => {
    if (score >= 80) return '#22c55e';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircleOutlined style={{ color: '#22c55e', fontSize: 20 }} />;
      case 'warning':
        return <ExclamationCircleOutlined style={{ color: '#f59e0b', fontSize: 20 }} />;
      case 'fail':
        return <CloseCircleOutlined style={{ color: '#ef4444', fontSize: 20 }} />;
      default:
        return null;
    }
  };

  return (
    <div style={{ padding: '24px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={5} style={{ margin: 0 }}>Security Overview</Title>
        <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
          Refresh
        </Button>
      </div>

      {/* Critical Alerts */}
      {failCount > 0 && (
        <Alert
          type="error"
          message={`${failCount} critical security issue${failCount > 1 ? 's' : ''} detected`}
          description="Address these issues immediately to protect your website."
          style={{ marginBottom: 16 }}
          showIcon
          icon={<WarningOutlined />}
        />
      )}

      {/* Score Card */}
      <Card
        style={{
          borderRadius: 12,
          background: isDark ? '#1e293b' : '#fff',
          marginBottom: 16,
          textAlign: 'center',
        }}
      >
        <Row gutter={24} align="middle">
          <Col xs={24} md={8}>
            <Progress
              type="circle"
              percent={score}
              size={140}
              strokeColor={getScoreColor()}
              format={() => (
                <Text strong style={{ fontSize: 28, color: getScoreColor() }}>
                  {score}
                </Text>
              )}
            />
            <div style={{ marginTop: 12 }}>
              <Text strong style={{ fontSize: 16 }}>Security Score</Text>
            </div>
          </Col>
          <Col xs={24} md={16}>
            <Row gutter={16}>
              <Col span={8}>
                <div
                  style={{
                    padding: 16,
                    borderRadius: 8,
                    background: isDark ? '#0f172a' : '#f0fdf4',
                    textAlign: 'center',
                  }}
                >
                  <CheckCircleOutlined style={{ fontSize: 24, color: '#22c55e' }} />
                  <div style={{ marginTop: 8 }}>
                    <Text strong style={{ fontSize: 20 }}>{passCount}</Text>
                    <div><Text type="secondary" style={{ fontSize: 12 }}>Passed</Text></div>
                  </div>
                </div>
              </Col>
              <Col span={8}>
                <div
                  style={{
                    padding: 16,
                    borderRadius: 8,
                    background: isDark ? '#0f172a' : '#fffbeb',
                    textAlign: 'center',
                  }}
                >
                  <ExclamationCircleOutlined style={{ fontSize: 24, color: '#f59e0b' }} />
                  <div style={{ marginTop: 8 }}>
                    <Text strong style={{ fontSize: 20 }}>{warningCount}</Text>
                    <div><Text type="secondary" style={{ fontSize: 12 }}>Warnings</Text></div>
                  </div>
                </div>
              </Col>
              <Col span={8}>
                <div
                  style={{
                    padding: 16,
                    borderRadius: 8,
                    background: isDark ? '#0f172a' : '#fef2f2',
                    textAlign: 'center',
                  }}
                >
                  <CloseCircleOutlined style={{ fontSize: 24, color: '#ef4444' }} />
                  <div style={{ marginTop: 8 }}>
                    <Text strong style={{ fontSize: 20 }}>{failCount}</Text>
                    <div><Text type="secondary" style={{ fontSize: 12 }}>Failed</Text></div>
                  </div>
                </div>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* Security Checks List */}
      <Card
        title="Security Checks"
        style={{
          borderRadius: 12,
          background: isDark ? '#1e293b' : '#fff',
        }}
      >
        <List
          dataSource={securityChecks}
          renderItem={(check) => (
            <List.Item
              extra={
                check.status === 'pass' ? (
                  <Tag color="success">Passed</Tag>
                ) : check.status === 'warning' ? (
                  <Tag color="warning">Warning</Tag>
                ) : (
                  <Tag color="error">Failed</Tag>
                )
              }
            >
              <List.Item.Meta
                avatar={getStatusIcon(check.status)}
                title={check.label}
                description={
                  <Space direction="vertical" size={4}>
                    <Text type="secondary">{check.description}</Text>
                    {check.recommendation && (
                      <Text type={check.status === 'fail' ? 'danger' : 'warning'} style={{ fontSize: 12 }}>
                        → {check.recommendation}
                      </Text>
                    )}
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </Card>

      {/* Security Controls Card */}
      <Card
        title="Security Controls"
        style={{
          marginTop: 16,
          borderRadius: 12,
          background: isDark ? '#1e293b' : '#fff',
        }}
      >
        {isLoadingSettings ? (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <Spin />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {/* Block Comments */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '16px 0',
              borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            }}>
              <div style={{ flex: 1 }}>
                <Space>
                  <Text strong>Block Comments</Text>
                  <Tooltip title="Disabling comments prevents spam and reduces attack surface. Recommended for static or portfolio sites." color="#1e293b">
                    <InfoCircleOutlined style={{ color: '#94a3b8', cursor: 'help' }} />
                  </Tooltip>
                </Space>
                <div>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    Disable visitor comments site-wide
                  </Text>
                </div>
              </div>
              <Switch
                checked={!(securitySettings?.comments_enabled ?? true)}
                loading={updatingSetting === 'comments_enabled'}
                onChange={(checked) => handleToggleSetting('comments_enabled', !checked)}
              />
            </div>

            {/* Block Registration */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '16px 0',
              borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            }}>
              <div style={{ flex: 1 }}>
                <Space>
                  <Text strong>Block Registration</Text>
                  <Tooltip title="Preventing public registration stops attackers from creating accounts. Only admins should add users." color="#1e293b">
                    <InfoCircleOutlined style={{ color: '#94a3b8', cursor: 'help' }} />
                  </Tooltip>
                </Space>
                <div>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    Only admins can create new user accounts
                  </Text>
                </div>
              </div>
              <Switch
                checked={!(securitySettings?.registration_enabled ?? false)}
                loading={updatingSetting === 'registration_enabled'}
                onChange={(checked) => handleToggleSetting('registration_enabled', !checked)}
              />
            </div>

            {/* Block XML-RPC */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '16px 0',
              borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            }}>
              <div style={{ flex: 1 }}>
                <Space>
                  <Text strong>Block XML-RPC</Text>
                  <Tooltip title="XML-RPC is a legacy API exploited for brute-force attacks. Disable unless you use the WordPress mobile app." color="#1e293b">
                    <InfoCircleOutlined style={{ color: '#94a3b8', cursor: 'help' }} />
                  </Tooltip>
                </Space>
                <div>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    Block legacy XML-RPC authentication protocol
                  </Text>
                </div>
              </div>
              <Switch
                checked={!(securitySettings?.xmlrpc_enabled ?? true)}
                loading={updatingSetting === 'xmlrpc_enabled'}
                onChange={(checked) => handleToggleSetting('xmlrpc_enabled', !checked)}
              />
            </div>

            {/* Block REST API */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '16px 0',
              borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            }}>
              <div style={{ flex: 1 }}>
                <Space>
                  <Text strong>Restrict REST API</Text>
                  <Tooltip title="Restricting REST API prevents anonymous access to usernames and sensitive data. Enable for better privacy." color="#1e293b">
                    <InfoCircleOutlined style={{ color: '#94a3b8', cursor: 'help' }} />
                  </Tooltip>
                </Space>
                <div>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    Require authentication for REST API access
                  </Text>
                </div>
              </div>
              <Switch
                checked={!(securitySettings?.rest_api_public ?? true)}
                loading={updatingSetting === 'rest_api_public'}
                onChange={(checked) => handleToggleSetting('rest_api_public', !checked)}
              />
            </div>

            {/* Block File Editing */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '16px 0',
              borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            }}>
              <div style={{ flex: 1 }}>
                <Space>
                  <Text strong>Block File Editing</Text>
                  <Tooltip title="Blocking the built-in editor prevents attackers from injecting malicious code even if they gain admin access." color="#1e293b">
                    <InfoCircleOutlined style={{ color: '#94a3b8', cursor: 'help' }} />
                  </Tooltip>
                </Space>
                <div>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    Disable plugin/theme editor in dashboard
                  </Text>
                </div>
              </div>
              <Switch
                checked={securitySettings?.file_editing_disabled ?? false}
                loading={updatingSetting === 'file_editing_disabled'}
                onChange={(checked) => handleToggleSetting('file_editing_disabled', checked)}
              />
            </div>

            {/* Debug Logging */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '16px 0',
            }}>
              <div style={{ flex: 1 }}>
                <Space>
                  <Text strong>Debug Logging</Text>
                  <Tooltip title="Debug mode logs PHP errors to a file. Useful for troubleshooting but should be disabled in production for security." color="#1e293b">
                    <InfoCircleOutlined style={{ color: '#94a3b8', cursor: 'help' }} />
                  </Tooltip>
                </Space>
                <div>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    Enable WP_DEBUG for error logging (temporary use only)
                  </Text>
                </div>
              </div>
              <Switch
                checked={securitySettings?.debug_enabled ?? false}
                loading={updatingSetting === 'debug_enabled'}
                onChange={(checked) => handleToggleSetting('debug_enabled', checked)}
              />
            </div>

            {/* Enable Security Headers */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '16px 0',
              borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
            }}>
              <div style={{ flex: 1 }}>
                <Space>
                  <Text strong>Enable Security Headers</Text>
                  <Tooltip title="Automatically adds X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy, and HSTS headers. One-click security hardening." color="#1e293b">
                    <InfoCircleOutlined style={{ color: '#94a3b8', cursor: 'help' }} />
                  </Tooltip>
                </Space>
                <div>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    Inject all recommended HTTP security headers via PHP
                  </Text>
                </div>
              </div>
              <Switch
                checked={securitySettings?.security_headers_enabled ?? false}
                loading={updatingSetting === 'security_headers_enabled'}
                onChange={(checked) => handleToggleSetting('security_headers_enabled', checked)}
              />
            </div>
          </div>
        )}
      </Card>

      {/* Security Headers */}
      <Card
        title={
          <Space>
            <SafetyOutlined style={{ color: '#3b82f6' }} />
            <span>HTTP Security Headers</span>
            {securityHeaders && (
              <Tag color={securityHeaders.score >= 70 ? 'success' : securityHeaders.score >= 40 ? 'warning' : 'error'}>
                {securityHeaders.present_count}/{securityHeaders.total_count} ({securityHeaders.score}%)
              </Tag>
            )}
            <Tooltip title="HTTP security headers protect your site from common attacks like clickjacking, XSS, and data injection. They're set at the server level or via plugins." color="#1e293b">
              <InfoCircleOutlined style={{ color: '#94a3b8', cursor: 'help' }} />
            </Tooltip>
          </Space>
        }
        style={{
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        }}
      >
        {isLoadingHeaders ? (
          <Spin />
        ) : !securityHeaders?.headers ? (
          <Empty description="Unable to fetch security headers" />
        ) : (
          <List
            size="small"
            dataSource={Object.entries(securityHeaders.headers)}
            renderItem={([key, header]) => {
              // Detailed explanations for each header
              const headerDetails: Record<string, string> = {
                'x-frame-options': 'Prevents attackers from embedding your site in an iframe on a malicious page. Without this, users could be tricked into clicking hidden buttons overlaid on your site (clickjacking).',
                'x-content-type-options': 'Stops browsers from guessing the MIME type of files. Without this, attackers could upload malicious files disguised as images that execute as scripts.',
                'x-xss-protection': 'Legacy browser-based XSS filter. While modern browsers use CSP instead, this header still helps protect users on older browsers.',
                'strict-transport-security': 'Forces browsers to always use HTTPS for your site. Prevents protocol downgrade attacks where attackers intercept unencrypted HTTP requests.',
                'referrer-policy': 'Controls how much URL information is sent to other sites when users click links. Prevents leaking sensitive URL parameters to third parties.',
                'permissions-policy': 'Restricts which browser features (camera, microphone, geolocation) your site and embedded content can access.'
              };
              
              return (
                <List.Item key={key}>
                  <List.Item.Meta
                    avatar={
                      header.present
                        ? <CheckCircleOutlined style={{ fontSize: 18, color: '#22c55e' }} />
                        : <CloseCircleOutlined style={{ fontSize: 18, color: '#ef4444' }} />
                    }
                    title={
                      <Space>
                        <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{header.name}</span>
                        <Tag color={header.present ? 'success' : 'error'} style={{ fontSize: 11 }}>
                          {header.present ? 'PRESENT' : 'MISSING'}
                        </Tag>
                        <Tooltip title={headerDetails[key] || header.description} color="#1e293b">
                          <InfoCircleOutlined style={{ color: '#94a3b8', cursor: 'help' }} />
                        </Tooltip>
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size={2} style={{ width: '100%' }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>{header.description}</Text>
                        {header.present && header.value && (
                          <Text code style={{ fontSize: 11, wordBreak: 'break-all' }}>
                            {header.value.length > 100 ? header.value.substring(0, 100) + '...' : header.value}
                          </Text>
                        )}
                        {!header.present && (
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            ⚡ Recommended: <code>{header.recommendation}</code>
                          </Text>
                        )}
                      </Space>
                    }
                  />
                </List.Item>
              );
            }}
          />
        )}
        <Divider style={{ margin: '12px 0' }} />
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            💡 Add these headers via .htaccess (Apache), nginx config, or a security plugin like Wordfence/Sucuri.
          </Text>
          <Button 
            icon={<CodeOutlined />} 
            type="primary"
            ghost
            onClick={() => setSnippetModalOpen(true)}
          >
            Generate Config Snippets
          </Button>
        </Space>
      </Card>

      {/* Security Header Snippets Modal */}
      <Modal
        title={
          <Space>
            <CodeOutlined />
            <span>Security Header Configuration</span>
          </Space>
        }
        open={snippetModalOpen}
        onCancel={() => setSnippetModalOpen(false)}
        footer={null}
        width={800}
        styles={{ body: { maxHeight: '60vh', overflow: 'auto' } }}
      >
        {isLoadingSnippets ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">Generating configuration snippets...</Text>
            </div>
          </div>
        ) : (
          <Tabs
            items={[
              {
                key: 'apache',
                label: '🪶 Apache (.htaccess)',
                children: (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text type="secondary">Add this to your .htaccess file</Text>
                      <Button 
                        size="small" 
                        icon={<CopyOutlined />}
                        onClick={() => {
                          navigator.clipboard.writeText(headerSnippets?.apache || '');
                          message.success('Copied Apache config to clipboard!');
                        }}
                      >
                        Copy
                      </Button>
                    </div>
                    <pre style={{ 
                      background: isDark ? '#0f172a' : '#f1f5f9', 
                      padding: 16, 
                      borderRadius: 8,
                      overflow: 'auto',
                      fontSize: 12,
                      lineHeight: 1.5,
                      maxHeight: '40vh'
                    }}>
                      {headerSnippets?.apache || 'Loading...'}
                    </pre>
                  </div>
                ),
              },
              {
                key: 'nginx',
                label: '🟢 Nginx',
                children: (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text type="secondary">Add this to your nginx server block</Text>
                      <Button 
                        size="small" 
                        icon={<CopyOutlined />}
                        onClick={() => {
                          navigator.clipboard.writeText(headerSnippets?.nginx || '');
                          message.success('Copied Nginx config to clipboard!');
                        }}
                      >
                        Copy
                      </Button>
                    </div>
                    <pre style={{ 
                      background: isDark ? '#0f172a' : '#f1f5f9', 
                      padding: 16, 
                      borderRadius: 8,
                      overflow: 'auto',
                      fontSize: 12,
                      lineHeight: 1.5,
                      maxHeight: '40vh'
                    }}>
                      {headerSnippets?.nginx || 'Loading...'}
                    </pre>
                  </div>
                ),
              },
              {
                key: 'php',
                label: '🐘 PHP (functions.php)',
                children: (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text type="secondary">Add this to your theme's functions.php or a custom plugin</Text>
                      <Button 
                        size="small" 
                        icon={<CopyOutlined />}
                        onClick={() => {
                          navigator.clipboard.writeText(headerSnippets?.php || '');
                          message.success('Copied PHP code to clipboard!');
                        }}
                      >
                        Copy
                      </Button>
                    </div>
                    <pre style={{ 
                      background: isDark ? '#0f172a' : '#f1f5f9', 
                      padding: 16, 
                      borderRadius: 8,
                      overflow: 'auto',
                      fontSize: 12,
                      lineHeight: 1.5,
                      maxHeight: '40vh'
                    }}>
                      {headerSnippets?.php || 'Loading...'}
                    </pre>
                  </div>
                ),
              },
            ]}
          />
        )}
      </Modal>

      {/* Outdated Plugins */}
      {plugins?.outdated && plugins.outdated.length > 0 && (
        <Card
          title={
            <Space>
              <BugOutlined style={{ color: '#f59e0b' }} />
              <span>Outdated Plugins</span>
              <Tag color="warning">{plugins.outdated.length}</Tag>
            </Space>
          }
          style={{
            marginTop: 16,
            borderRadius: 12,
            background: isDark ? '#1e293b' : '#fff',
          }}
        >
          <List
            dataSource={plugins.outdated}
            renderItem={(plugin: any) => (
              <List.Item>
                <Text>{plugin.name}</Text>
                <Text type="secondary" style={{ marginLeft: 8 }}>
                  {plugin.current} → {plugin.new}
                </Text>
              </List.Item>
            )}
          />
        </Card>
      )}
    </div>
  );
}
