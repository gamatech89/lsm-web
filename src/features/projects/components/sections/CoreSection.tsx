/**
 * Core Section - WordPress Core Management
 * 
 * Features:
 * - Current WP version display
 * - Core update notification
 * - One-click update button
 * - PHP version info
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
  Statistic,
  Alert,
  Progress,
  App,
} from 'antd';
import {
  CodeOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  SafetyOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useThemeStore } from '@/stores/theme';

const { Title, Text, Paragraph } = Typography;

interface CoreSectionProps {
  project: any;
}

export default function CoreSection({ project }: CoreSectionProps) {
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const hasLsmConnection = !!project.health_check_secret;

  // Fetch health data
  const { data: healthData, isLoading: isLoadingHealth, refetch: refetchHealth } = useQuery({
    queryKey: ['lsm-health', project.id],
    queryFn: () => api.lsm.getHealth(project.id).then(r => (r.data as any)?.data || r.data),
    enabled: hasLsmConnection,
    staleTime: 30000,
  });

  // Fetch updates to check for core updates
  const { data: updatesData, isLoading: isLoadingUpdates, refetch: refetchUpdates } = useQuery({
    queryKey: ['lsm-updates', project.id],
    queryFn: () => api.lsm.getUpdates(project.id).then(r => (r.data as any)?.data || r.data),
    enabled: hasLsmConnection,
    staleTime: 30000,
  });

  // Update core mutation
  const updateCoreMutation = useMutation({
    mutationFn: () => api.lsm.updateCore(project.id),
    onSuccess: () => {
      message.success('WordPress core updated successfully');
      refetchHealth();
      refetchUpdates();
      queryClient.invalidateQueries({ queryKey: ['projects', project.id] });
    },
    onError: () => message.error('Failed to update WordPress core'),
  });

  const refetch = () => {
    refetchHealth();
    refetchUpdates();
  };

  // Show empty state if not connected
  if (!hasLsmConnection) {
    return (
      <Empty
        image={<CodeOutlined style={{ fontSize: 48, color: '#94a3b8' }} />}
        description={<Text type="secondary">Connect WordPress to manage core updates</Text>}
      />
    );
  }

  // Loading state
  if (isLoadingHealth || isLoadingUpdates) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">Loading WordPress information...</Text>
        </div>
      </div>
    );
  }

  const wordpress = healthData?.wordpress;
  const php = healthData?.php;
  const ssl = healthData?.ssl;
  const security = healthData?.security;
  const coreUpdate = updatesData?.core;
  const hasUpdate = !!coreUpdate?.new_version;

  return (
    <div style={{ padding: '24px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={5} style={{ margin: 0 }}>WordPress Core</Title>
        <Button icon={<ReloadOutlined />} onClick={refetch}>
          Refresh
        </Button>
      </div>

      {/* Update Alert */}
      {hasUpdate && (
        <Alert
          type="warning"
          message={`WordPress ${coreUpdate.new_version} is available`}
          description={`Your site is running WordPress ${coreUpdate.current_version}. We recommend updating to the latest version for security and performance improvements.`}
          action={
            <Button 
              type="primary" 
              icon={<SyncOutlined />} 
              onClick={() => updateCoreMutation.mutate()}
              loading={updateCoreMutation.isPending}
            >
              Update Now
            </Button>
          }
          style={{ marginBottom: 16 }}
          showIcon
          icon={<ExclamationCircleOutlined />}
        />
      )}

      {/* Version Info Cards */}
      <Row gutter={[16, 16]}>
        {/* WordPress Version */}
        <Col xs={24} sm={12} md={8}>
          <Card
            style={{
              borderRadius: 12,
              background: isDark ? '#1e293b' : '#fff',
              textAlign: 'center',
              height: '100%',
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: hasUpdate ? '#fef3c7' : '#dcfce7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <GlobalOutlined style={{ fontSize: 28, color: hasUpdate ? '#f59e0b' : '#22c55e' }} />
            </div>
            <Statistic
              title="WordPress Version"
              value={wordpress?.version || 'Unknown'}
              valueStyle={{ fontSize: 24, fontWeight: 600 }}
            />
            {hasUpdate ? (
              <Tag color="orange" icon={<ExclamationCircleOutlined />} style={{ marginTop: 8 }}>
                Update to {coreUpdate.new_version}
              </Tag>
            ) : (
              <Tag color="success" icon={<CheckCircleOutlined />} style={{ marginTop: 8 }}>
                Up to date
              </Tag>
            )}
          </Card>
        </Col>

        {/* PHP Version */}
        <Col xs={24} sm={12} md={8}>
          <Card
            style={{
              borderRadius: 12,
              background: isDark ? '#1e293b' : '#fff',
              textAlign: 'center',
              height: '100%',
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: '#e0e7ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <CodeOutlined style={{ fontSize: 28, color: '#6366f1' }} />
            </div>
            <Statistic
              title="PHP Version"
              value={php?.version || 'Unknown'}
              valueStyle={{ fontSize: 24, fontWeight: 600 }}
            />
            {php?.version && parseFloat(php.version) >= 8.0 ? (
              <Tag color="success" style={{ marginTop: 8 }}>Recommended</Tag>
            ) : (
              <Tag color="orange" style={{ marginTop: 8 }}>Consider upgrading</Tag>
            )}
          </Card>
        </Col>

        {/* SSL Status */}
        <Col xs={24} sm={12} md={8}>
          <Card
            style={{
              borderRadius: 12,
              background: isDark ? '#1e293b' : '#fff',
              textAlign: 'center',
              height: '100%',
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: ssl?.enabled ? '#dcfce7' : '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <SafetyOutlined style={{ fontSize: 28, color: ssl?.enabled ? '#22c55e' : '#ef4444' }} />
            </div>
            <Statistic
              title="SSL Certificate"
              value={ssl?.enabled ? 'Active' : 'Not Active'}
              valueStyle={{ fontSize: 24, fontWeight: 600, color: ssl?.enabled ? '#22c55e' : '#ef4444' }}
            />
            {ssl?.expires_at && (
              <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
                Expires: {new Date(ssl.expires_at).toLocaleDateString()}
              </Text>
            )}
          </Card>
        </Col>
      </Row>

      {/* Security Settings */}
      <Card
        title="Security Settings"
        style={{
          marginTop: 16,
          borderRadius: 12,
          background: isDark ? '#1e293b' : '#fff',
        }}
      >
        <Row gutter={[16, 16]}>
          <Col xs={12} md={6}>
            <div style={{ textAlign: 'center' }}>
              {security?.debug_mode ? (
                <ExclamationCircleOutlined style={{ fontSize: 24, color: '#f59e0b' }} />
              ) : (
                <CheckCircleOutlined style={{ fontSize: 24, color: '#22c55e' }} />
              )}
              <div style={{ marginTop: 8 }}>
                <Text strong>Debug Mode</Text>
              </div>
              <Tag color={security?.debug_mode ? 'warning' : 'success'}>
                {security?.debug_mode ? 'Enabled' : 'Disabled'}
              </Tag>
            </div>
          </Col>
          <Col xs={12} md={6}>
            <div style={{ textAlign: 'center' }}>
              {security?.file_editing ? (
                <ExclamationCircleOutlined style={{ fontSize: 24, color: '#f59e0b' }} />
              ) : (
                <CheckCircleOutlined style={{ fontSize: 24, color: '#22c55e' }} />
              )}
              <div style={{ marginTop: 8 }}>
                <Text strong>File Editing</Text>
              </div>
              <Tag color={security?.file_editing ? 'warning' : 'success'}>
                {security?.file_editing ? 'Enabled' : 'Disabled'}
              </Tag>
            </div>
          </Col>
          <Col xs={12} md={6}>
            <div style={{ textAlign: 'center' }}>
              {wordpress?.is_multisite ? (
                <GlobalOutlined style={{ fontSize: 24, color: '#6366f1' }} />
              ) : (
                <GlobalOutlined style={{ fontSize: 24, color: '#64748b' }} />
              )}
              <div style={{ marginTop: 8 }}>
                <Text strong>Multisite</Text>
              </div>
              <Tag color={wordpress?.is_multisite ? 'purple' : 'default'}>
                {wordpress?.is_multisite ? 'Yes' : 'No'}
              </Tag>
            </div>
          </Col>
          <Col xs={12} md={6}>
            <div style={{ textAlign: 'center' }}>
              {security?.wordfence_active ? (
                <SafetyOutlined style={{ fontSize: 24, color: '#22c55e' }} />
              ) : (
                <SafetyOutlined style={{ fontSize: 24, color: '#64748b' }} />
              )}
              <div style={{ marginTop: 8 }}>
                <Text strong>Wordfence</Text>
              </div>
              <Tag color={security?.wordfence_active ? 'success' : 'default'}>
                {security?.wordfence_active ? 'Active' : 'Not Installed'}
              </Tag>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Site Info */}
      <Card
        title="Site Information"
        style={{
          marginTop: 16,
          borderRadius: 12,
          background: isDark ? '#1e293b' : '#fff',
        }}
      >
        <Row gutter={[16, 8]}>
          <Col xs={24} md={12}>
            <Text type="secondary">Site URL:</Text>
            <div><Text strong>{healthData?.site_url || project.url || 'N/A'}</Text></div>
          </Col>
          <Col xs={24} md={12}>
            <Text type="secondary">Locale:</Text>
            <div><Text strong>{wordpress?.locale || 'en_US'}</Text></div>
          </Col>
          <Col xs={24} md={12}>
            <Text type="secondary">Timezone:</Text>
            <div><Text strong>{wordpress?.timezone || 'UTC'}</Text></div>
          </Col>
          <Col xs={24} md={12}>
            <Text type="secondary">Last Health Check:</Text>
            <div><Text strong>{healthData?.timestamp ? new Date(healthData.timestamp).toLocaleString() : 'N/A'}</Text></div>
          </Col>
        </Row>
      </Card>
    </div>
  );
}
