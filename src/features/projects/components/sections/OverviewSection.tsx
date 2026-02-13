/**
 * Project Overview Section
 * 
 * Main overview/dashboard for a project showing health status, SSL, domain expiry, etc.
 * Similar to WP Umbrella's Uptime & Domain Monitoring view.
 */

import { useState } from 'react';
import { Row, Col, Card, Typography, Tag, Space, Statistic, Progress, Divider, Button, Tooltip, Select, App } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  GlobalOutlined,
  SafetyCertificateOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  TeamOutlined,
  LoginOutlined,
  ApiOutlined,
  RocketOutlined,
  PlusOutlined,
  CloseOutlined,
  UserOutlined,
  EditOutlined,
  FileTextOutlined,
  PictureOutlined,
  CommentOutlined,
  CloudOutlined,
  HddOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useThemeStore } from '@/stores/theme';
import { formatDate, formatRelativeTime, getHealthStatusConfig, getSecurityStatusConfig } from '@lsm/utils';
import { api, apiClient } from '@/lib/api';
import type { Project } from '@lsm/types';

const { Text, Title } = Typography;

interface OverviewSectionProps {
  project: Project;
  lsmStatus?: { connected: boolean };
  recoveryStatus?: { maintenance_mode: boolean };
  onSsoLogin: () => void;
  ssoLoading: boolean;
}

export function OverviewSection({
  project,
  lsmStatus,
  onSsoLogin,
  ssoLoading,
}: OverviewSectionProps) {
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';

  const healthConfig = getHealthStatusConfig(project.health_status);
  const securityConfig = getSecurityStatusConfig(project.security_status);

  const cardStyle = {
    borderRadius: 12,
    background: isDark ? '#1e293b' : '#fff',
    border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
  };

  // Real SSL data from project fields
  const sslStatus = project.ssl_status; // 'valid', 'none', 'expired', 'expiring_soon'
  const healthDetails = project.last_health_details;
  const sslData = project.ssl_expires_at ? {
    expiresAt: project.ssl_expires_at,
    daysRemaining: Math.ceil((new Date(project.ssl_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  } : null;

  // Domain expiry - populated by WHOIS lookup (projects:check-domains command)
  const domainData = project.domain_expires_at ? {
    expiresAt: project.domain_expires_at,
    daysRemaining: Math.ceil((new Date(project.domain_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    registrar: (project as any).domain_registrar || null,
  } : null as { daysRemaining: number; expiresAt: string; registrar: string | null } | null;

  const getExpiryColor = (days: number) => {
    if (days <= 7) return '#ef4444';
    if (days <= 30) return '#f59e0b';
    if (days <= 90) return '#3b82f6';
    return '#22c55e';
  };

  // SSL display logic
  const getSslDisplay = () => {
    if (sslData) {
      return {
        label: `in ${sslData.daysRemaining} days`,
        sublabel: formatDate(sslData.expiresAt),
        color: getExpiryColor(sslData.daysRemaining),
        iconBg: `${getExpiryColor(sslData.daysRemaining)}15`,
      };
    }
    if (sslStatus === 'valid') {
      return { label: 'Valid', sublabel: 'Enabled', color: '#22c55e', iconBg: 'rgba(34, 197, 94, 0.1)' };
    }
    if (sslStatus === 'none') {
      return { label: 'Not Enabled', sublabel: 'No HTTPS', color: '#ef4444', iconBg: 'rgba(239, 68, 68, 0.1)' };
    }
    if (sslStatus === 'expired') {
      return { label: 'Expired', sublabel: 'Renew immediately', color: '#ef4444', iconBg: 'rgba(239, 68, 68, 0.1)' };
    }
    if (sslStatus === 'expiring_soon') {
      return { label: 'Expiring Soon', sublabel: 'Renew soon', color: '#f59e0b', iconBg: 'rgba(245, 158, 11, 0.1)' };
    }
    // Check health details as fallback
    if ((healthDetails as any)?.ssl) {
      const sslEnabled = (healthDetails as any).ssl.enabled;
      return {
        label: sslEnabled ? 'Valid' : 'Not Enabled',
        sublabel: sslEnabled ? 'Enabled' : 'No HTTPS',
        color: sslEnabled ? '#22c55e' : '#ef4444',
        iconBg: sslEnabled ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
      };
    }
    return { label: 'Not checked', sublabel: 'Run health check', color: '#94a3b8', iconBg: 'rgba(148, 163, 184, 0.1)' };
  };

  const sslDisplay = getSslDisplay();

  // Check if plugin is connected
  const isPluginConnected = !!project.health_check_secret;

  // Fetch real uptime stats from historical data
  const { data: uptimeStats } = useQuery({
    queryKey: ['uptime-stats', project.id],
    queryFn: () => apiClient.get(`/projects/${project.id}/uptime-stats?days=30`).then(r => r.data?.data),
    enabled: isPluginConnected,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });

  // Fetch site info (content stats)
  const { data: siteInfo, isLoading: isLoadingSiteInfo } = useQuery({
    queryKey: ['lsm-site-info', project.id],
    queryFn: () => api.lsm.getSiteInfo(project.id).then(r => r.data?.data || r.data),
    enabled: isPluginConnected,
    staleTime: 60000, // 1 minute
  });

  return (
    <div style={{ padding: '24px 0' }}>
      {/* Connection Banner - Show when plugin not connected */}
      {!isPluginConnected && (
        <Card 
          style={{ 
            ...cardStyle, 
            marginBottom: 24,
            background: isDark 
              ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)'
              : 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
            borderColor: '#667eea',
          }} 
          styles={{ body: { padding: 20 } }}
        >
          <Row align="middle" gutter={16}>
            <Col>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <ApiOutlined style={{ fontSize: 24, color: '#fff' }} />
              </div>
            </Col>
            <Col flex={1}>
              <Text strong style={{ fontSize: 15, display: 'block' }}>Connect WordPress Plugin</Text>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Install our plugin to unlock remote management, SSO login, updates, and more
              </Text>
            </Col>
            <Col>
              <Space>
                <Button 
                  type="primary" 
                  icon={<RocketOutlined />}
                  onClick={() => {
                    // Navigate to maintenance section which has the connection UI
                    window.location.href = `/projects/${project.id}?section=maintenance`;
                  }}
                >
                  Connect Now
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>
      )}

      {/* Header Quick Actions */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col>
          <Space>
            {project.url && (
              <Button icon={<GlobalOutlined />} href={project.url} target="_blank">
                Visit Site
              </Button>
            )}
            {lsmStatus?.connected && (
              <Button 
                type="primary" 
                icon={<LoginOutlined />} 
                onClick={onSsoLogin}
                loading={ssoLoading}
              >
                WP Admin Login
              </Button>
            )}
            <Button icon={<SyncOutlined />}>
              Re-sync
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Team Section - first because it's the most actionable */}
      <TeamSection project={project} cardStyle={cardStyle} />

      {/* Overview Stats */}
      <Title level={5} style={{ marginBottom: 16 }}>Uptime & Domain Monitoring</Title>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* Uptime Status */}
        <Col xs={24} sm={12} lg={6} style={{ display: 'flex' }}>
          <Card style={{ ...cardStyle, width: '100%' }} styles={{ body: { padding: 20 } }}>
            <Space align="start">
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                background: project.health_status === 'online' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {project.health_status === 'online' ? (
                  <CheckCircleOutlined style={{ fontSize: 20, color: '#22c55e' }} />
                ) : (
                  <CloseCircleOutlined style={{ fontSize: 20, color: '#ef4444' }} />
                )}
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>Status</Text>
                <div>
                  <Text strong style={{ color: healthConfig.color }}>{healthConfig.label}</Text>
                </div>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Last check: {project.last_health_check_at ? formatRelativeTime(project.last_health_check_at) : 'Never'}
                </Text>
              </div>
            </Space>
          </Card>
        </Col>

        {/* Domain Expiry */}
        <Col xs={24} sm={12} lg={6} style={{ display: 'flex' }}>
          <Card style={{ ...cardStyle, width: '100%' }} styles={{ body: { padding: 20 } }}>
            <Space align="start">
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                background: domainData ? `${getExpiryColor(domainData.daysRemaining)}15` : 'rgba(148, 163, 184, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <GlobalOutlined style={{ 
                  fontSize: 20, 
                  color: domainData ? getExpiryColor(domainData.daysRemaining) : '#94a3b8' 
                }} />
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>Domain Expires</Text>
                <div>
                  {domainData ? (
                    <>
                      <Text strong>in {domainData.daysRemaining} days</Text>
                      <div>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          ({formatDate(domainData.expiresAt)})
                        </Text>
                      </div>
                    </>
                  ) : (
                    <Text type="secondary">Not tracked</Text>
                  )}
                </div>
              </div>
            </Space>
          </Card>
        </Col>

        {/* SSL Certificate */}
        <Col xs={24} sm={12} lg={6} style={{ display: 'flex' }}>
          <Card style={{ ...cardStyle, width: '100%' }} styles={{ body: { padding: 20 } }}>
            <Space align="start">
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                background: sslDisplay.iconBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <SafetyCertificateOutlined style={{ 
                  fontSize: 20, 
                  color: sslDisplay.color,
                }} />
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>SSL Certificate</Text>
                <div>
                  <Text strong style={{ color: sslDisplay.color }}>{sslDisplay.label}</Text>
                </div>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {sslDisplay.sublabel}
                </Text>
              </div>
            </Space>
          </Card>
        </Col>

        {/* Last Check */}
        <Col xs={24} sm={12} lg={6} style={{ display: 'flex' }}>
          <Card style={{ ...cardStyle, width: '100%' }} styles={{ body: { padding: 20 } }}>
            <Space align="start">
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                background: 'rgba(59, 130, 246, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <ClockCircleOutlined style={{ fontSize: 20, color: '#3b82f6' }} />
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>Response Time</Text>
                <div>
                  {(uptimeStats?.avg_response_time || project.response_time_ms) ? (
                    <Text strong>{uptimeStats?.avg_response_time || project.response_time_ms}ms</Text>
                  ) : (
                    <Text type="secondary">Not available</Text>
                  )}
                </div>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>


      {/* WordPress Info */}
      {project.wp_version && (
        <>
          <Title level={5} style={{ marginBottom: 16 }}>WordPress Info</Title>
          <Card style={cardStyle} styles={{ body: { padding: 24 } }}>
            <Row gutter={[24, 16]}>
              <Col xs={12} sm={6}>
                <Statistic 
                  title="WP Version" 
                  value={project.wp_version}
                  valueStyle={{ fontSize: 18 }}
                />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic 
                  title="PHP Version" 
                  value={project.php_version || 'Unknown'}
                  valueStyle={{ fontSize: 18 }}
                />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic 
                  title="Active Plugins" 
                  value={project.active_plugins || 0}
                  valueStyle={{ fontSize: 18 }}
                />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic 
                  title="Active Theme" 
                  value={project.active_theme || 'Unknown'}
                  valueStyle={{ fontSize: 18 }}
                />
              </Col>
            </Row>
          </Card>
        </>
      )}

      {/* Site Content Stats */}
      {isPluginConnected && (
        <>
          <Title level={5} style={{ marginBottom: 16 }}>Site Content</Title>
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            {/* Posts */}
            <Col xs={12} sm={6}>
              <Card style={cardStyle} styles={{ body: { padding: 20 } }}>
                <Space align="start">
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    background: 'rgba(59, 130, 246, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <FileTextOutlined style={{ fontSize: 20, color: '#3b82f6' }} />
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>Posts</Text>
                    <div>
                      {isLoadingSiteInfo ? (
                        <Text type="secondary">Loading...</Text>
                      ) : (
                        <>
                          <Text strong style={{ fontSize: 18 }}>
                            {siteInfo?.content?.posts?.published ?? '—'}
                          </Text>
                          {(siteInfo?.content?.posts?.draft ?? 0) > 0 && (
                            <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>
                              (+{siteInfo?.content?.posts?.draft} drafts)
                            </Text>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </Space>
              </Card>
            </Col>

            {/* Pages */}
            <Col xs={12} sm={6}>
              <Card style={cardStyle} styles={{ body: { padding: 20 } }}>
                <Space align="start">
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    background: 'rgba(139, 92, 246, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <FileTextOutlined style={{ fontSize: 20, color: '#8b5cf6' }} />
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>Pages</Text>
                    <div>
                      {isLoadingSiteInfo ? (
                        <Text type="secondary">Loading...</Text>
                      ) : (
                        <Text strong style={{ fontSize: 18 }}>
                          {siteInfo?.content?.pages?.published ?? '—'}
                        </Text>
                      )}
                    </div>
                  </div>
                </Space>
              </Card>
            </Col>

            {/* Media */}
            <Col xs={12} sm={6}>
              <Card style={cardStyle} styles={{ body: { padding: 20 } }}>
                <Space align="start">
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    background: 'rgba(236, 72, 153, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <PictureOutlined style={{ fontSize: 20, color: '#ec4899' }} />
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>Media</Text>
                    <div>
                      {isLoadingSiteInfo ? (
                        <Text type="secondary">Loading...</Text>
                      ) : (
                        <Text strong style={{ fontSize: 18 }}>
                          {siteInfo?.content?.media ?? '—'}
                        </Text>
                      )}
                    </div>
                  </div>
                </Space>
              </Card>
            </Col>

            {/* Users + Comments */}
            <Col xs={12} sm={6}>
              <Card style={cardStyle} styles={{ body: { padding: 20 } }}>
                <Space align="start">
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    background: 'rgba(34, 197, 94, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <TeamOutlined style={{ fontSize: 20, color: '#22c55e' }} />
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>Users</Text>
                    <div>
                      {isLoadingSiteInfo ? (
                        <Text type="secondary">Loading...</Text>
                      ) : (
                        <Text strong style={{ fontSize: 18 }}>
                          {siteInfo?.users?.total ?? '—'}
                        </Text>
                      )}
                    </div>
                  </div>
                </Space>
              </Card>
            </Col>
          </Row>


        </>
      )}

      {/* Backup Info */}
      <BackupInfoCard cardStyle={cardStyle} />


    </div>
  );
}

/**
 * Backup Info Card - Lightweight informational display
 */
function BackupInfoCard({ cardStyle }: { cardStyle: React.CSSProperties }) {
  const { data: backupConfig, isLoading } = useQuery<{
    driver: string;
    schedule: { enabled: boolean; frequency: string; time: string };
  }>({
    queryKey: ['backup-settings'],
    queryFn: () => apiClient.get('/backups/settings').then(r => r.data?.data || r.data),
    staleTime: 5 * 60 * 1000,
  });

  const driverLabels: Record<string, string> = {
    local: 'Local Storage',
    s3: 'Amazon S3',
    gcs: 'Google Cloud',
    gdrive: 'Google Drive',
  };

  if (isLoading || !backupConfig) return null;

  return (
    <>
      <Divider />
      <Title level={5} style={{ marginBottom: 16 }}>
        <CloudOutlined /> Backup Info
      </Title>
      <Card style={cardStyle} styles={{ body: { padding: 20 } }}>
        <Row gutter={24} align="middle">
          <Col>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              background: 'rgba(59, 130, 246, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <HddOutlined style={{ fontSize: 20, color: '#3b82f6' }} />
            </div>
          </Col>
          <Col flex={1}>
            <Row gutter={32}>
              <Col>
                <Text type="secondary" style={{ fontSize: 12 }}>Storage</Text>
                <div><Text strong>{driverLabels[backupConfig.driver] || backupConfig.driver}</Text></div>
              </Col>
              <Col>
                <Text type="secondary" style={{ fontSize: 12 }}>Schedule</Text>
                <div>
                  <Tag color={backupConfig.schedule.enabled ? 'green' : 'default'} style={{ marginRight: 4 }}>
                    {backupConfig.schedule.enabled ? 'Enabled' : 'Disabled'}
                  </Tag>
                  <Text type="secondary" style={{ fontSize: 12, textTransform: 'capitalize' }}>
                    {backupConfig.schedule.frequency} at {backupConfig.schedule.time}
                  </Text>
                </div>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>
    </>
  );
}

/**
 * Team Section Component - Allows managing project team members
 */
function TeamSection({ project, cardStyle }: { project: Project; cardStyle: React.CSSProperties }) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [isAddingDeveloper, setIsAddingDeveloper] = useState(false);
  const [isAddingPM, setIsAddingPM] = useState(false);

  // Fetch available developers and managers
  const { data: filterOptions } = useQuery({
    queryKey: ['project-filter-options'],
    queryFn: () => api.projects.getFilterOptions().then(r => r.data.data),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update project developers mutation
  const updateDevelopersMutation = useMutation({
    mutationFn: (developerIds: number[]) => 
      api.projects.update(project.id, { developer_ids: developerIds } as any),
    onSuccess: () => {
      message.success('Team updated successfully');
      queryClient.invalidateQueries({ queryKey: ['projects', project.id] });
      setIsAddingDeveloper(false);
    },
    onError: () => {
      message.error('Failed to update team');
    },
  });

  // Update project managers mutation
  const updateManagersMutation = useMutation({
    mutationFn: (managerIds: number[]) => 
      api.projects.update(project.id, { manager_ids: managerIds } as any),
    onSuccess: () => {
      message.success('Managers updated successfully');
      queryClient.invalidateQueries({ queryKey: ['projects', project.id] });
      setIsAddingPM(false);
    },
    onError: () => {
      message.error('Failed to update managers');
    },
  });

  const currentDeveloperIds = project.developers?.map((d: any) => d.id) || [];
  const currentManagerIds = project.managers?.map((m: any) => m.id) || [];
  const availableDevelopers = filterOptions?.developers || [];
  const availableManagers = filterOptions?.managers || [];
  
  // Filter out already assigned developers and managers
  const unassignedDevelopers = availableDevelopers.filter(
    (dev: any) => !currentDeveloperIds.includes(dev.id)
  );
  const unassignedManagers = availableManagers.filter(
    (m: any) => !currentManagerIds.includes(m.id)
  );

  const handleAddDeveloper = (developerId: number) => {
    const newDeveloperIds = [...currentDeveloperIds, developerId];
    updateDevelopersMutation.mutate(newDeveloperIds);
  };

  const handleRemoveDeveloper = (developerId: number) => {
    const newDeveloperIds = currentDeveloperIds.filter((id: number) => id !== developerId);
    updateDevelopersMutation.mutate(newDeveloperIds);
  };

  const handleAddManager = (managerId: number) => {
    const newManagerIds = [...currentManagerIds, managerId];
    updateManagersMutation.mutate(newManagerIds);
  };

  const handleRemoveManager = (managerId: number) => {
    const newManagerIds = currentManagerIds.filter((id: number) => id !== managerId);
    updateManagersMutation.mutate(newManagerIds);
  };

  return (
    <>
      <Divider />
      <Title level={5} style={{ marginBottom: 16 }}>
        <TeamOutlined /> Team
      </Title>
      <Card style={cardStyle} styles={{ body: { padding: 24 } }}>
        <Row gutter={[24, 16]}>
          <Col xs={24} sm={12}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                <UserOutlined /> Project Managers
              </Text>
              {!isAddingPM && (
                <Button 
                  type="text" 
                  size="small" 
                  icon={<PlusOutlined />}
                  onClick={() => setIsAddingPM(true)}
                  disabled={unassignedManagers.length === 0}
                >
                  Add
                </Button>
              )}
            </div>
            
            {isAddingPM && (
              <div style={{ marginBottom: 12 }}>
                <Select
                  placeholder="Select manager to add"
                  style={{ width: '100%' }}
                  onChange={handleAddManager}
                  loading={updateManagersMutation.isPending}
                  options={unassignedManagers.map((m: any) => ({
                    label: m.name,
                    value: m.id,
                  }))}
                  autoFocus
                  onBlur={() => setIsAddingPM(false)}
                />
              </div>
            )}
            
            {project.managers && project.managers.length > 0 ? (
              <Space wrap>
                {project.managers.map((m: any) => (
                  <Tag 
                    key={m.id} 
                    color="purple"
                    closable
                    onClose={(e) => {
                      e.preventDefault();
                      handleRemoveManager(m.id);
                    }}
                    style={{ fontSize: 13, padding: '4px 12px' }}
                  >
                    {m.name}
                  </Tag>
                ))}
              </Space>
            ) : (
              <Text type="secondary">No managers assigned</Text>
            )}
          </Col>
          <Col xs={24} sm={12}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                <TeamOutlined /> Developers
              </Text>
              {!isAddingDeveloper && (
                <Button 
                  type="text" 
                  size="small" 
                  icon={<PlusOutlined />}
                  onClick={() => setIsAddingDeveloper(true)}
                  disabled={unassignedDevelopers.length === 0}
                >
                  Add
                </Button>
              )}
            </div>
            
            {isAddingDeveloper && (
              <div style={{ marginBottom: 12 }}>
                <Select
                  placeholder="Select developer to add"
                  style={{ width: '100%' }}
                  onChange={handleAddDeveloper}
                  loading={updateDevelopersMutation.isPending}
                  options={unassignedDevelopers.map((dev: any) => ({
                    label: dev.name,
                    value: dev.id,
                  }))}
                  autoFocus
                  onBlur={() => setIsAddingDeveloper(false)}
                />
              </div>
            )}
            
            {project.developers && project.developers.length > 0 ? (
              <Space wrap>
                {project.developers.map((dev: any) => (
                  <Tag 
                    key={dev.id} 
                    color="cyan"
                    closable
                    onClose={(e) => {
                      e.preventDefault();
                      handleRemoveDeveloper(dev.id);
                    }}
                    style={{ fontSize: 13, padding: '4px 12px' }}
                  >
                    {dev.name}
                  </Tag>
                ))}
              </Space>
            ) : (
              <Text type="secondary">No developers assigned</Text>
            )}
          </Col>
        </Row>
      </Card>
    </>
  );
}
