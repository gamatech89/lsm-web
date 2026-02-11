/**
 * Uptime Section - Website Monitoring
 * 
 * Features:
 * - Live uptime status from project data
 * - Real uptime percentage from historical data
 * - Response time display
 * - Last check time
 * - Check now button (triggers full health check)
 */

import { Card, Typography, Button, Space, Progress, Row, Col, Statistic, Tag, Empty, Alert, App, Switch, Tooltip } from 'antd';

const { Text, Title } = Typography;
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  DesktopOutlined,
  ThunderboltOutlined,
  WarningOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useThemeStore } from '@/stores/theme';
import { api, apiClient } from '@/lib/api';

interface UptimeSectionProps {
  project: any;
}

export default function UptimeSection({ project }: UptimeSectionProps) {
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  // Fetch real uptime stats from historical data
  const { data: uptimeData, refetch: refetchUptime } = useQuery({
    queryKey: ['uptime-stats', project.id],
    queryFn: () => apiClient.get(`/projects/${project.id}/uptime-stats?days=30`).then(r => r.data?.data),
    enabled: !!project.health_check_secret,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });

  // Fetch global monitoring settings to show schedule info
  const { data: globalSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => apiClient.get('/settings').then(r => r.data?.data || r.data),
    staleTime: 1000 * 60 * 10, // 10 minutes
    retry: false, // Don't retry if user is not admin
  });

  // Check now mutation - this triggers a real health check and stores results
  const checkNowMutation = useMutation({
    mutationFn: () => api.projects.checkHealth(project.id),
    onSuccess: (response: any) => {
      const healthData = response.data?.data?.health_data || response.data?.health_data;
      if (healthData) {
        message.success('Health check completed - Site is online!');
      } else {
        message.success('Health check completed');
      }
      // Refresh project data and uptime stats using correct keys
      // Use string to match how projectId is used in ProjectDetailPageV2
      queryClient.invalidateQueries({ queryKey: ['projects', project.id] });
      queryClient.invalidateQueries({ queryKey: ['projects', Number(project.id)] });
      queryClient.invalidateQueries({ queryKey: ['projects'] }); // Also invalidate list
      queryClient.invalidateQueries({ queryKey: ['uptime-stats', project.id] });
      refetchUptime();
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.message || 'Health check failed';
      message.error(errorMsg);
      // Still refresh uptime stats as the failure is logged
      queryClient.invalidateQueries({ queryKey: ['uptime-stats', project.id] });
      refetchUptime();
    },
  });

  // Not connected state - no health_check_secret means plugin not connected
  if (!project.health_check_secret) {
    return (
      <div style={{ padding: '48px 0', textAlign: 'center' }}>
        <Empty
          image={<DesktopOutlined style={{ fontSize: 48, color: '#94a3b8' }} />}
          description={
            <div>
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                Connect WordPress to enable uptime monitoring
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Install and configure the LSM plugin on your WordPress site
              </Text>
            </div>
          }
        />
      </div>
    );
  }

  // Parse health status from project data
  // DB enum values: 'online', 'down_error', 'updating'
  const healthStatus = project.health_status || 'unknown';
  const responseTime = project.response_time_ms;
  const lastCheckedAt = project.last_health_check_at;
  const healthDetails = project.last_health_details;

  // Determine status - check for 'online' (DB value) and 'healthy'/'ok' (API values)
  const isOnline = healthStatus === 'online' || healthStatus === 'healthy' || healthStatus === 'ok';
  const isWarning = healthStatus === 'warning' || healthStatus === 'updating';
  const isDown = healthStatus === 'down_error' || healthStatus === 'down';
  const hasNeverChecked = !lastCheckedAt;

  // Use real uptime percentage from stats
  const uptimePercentage = uptimeData?.uptime_percentage ?? (hasNeverChecked ? 0 : (isOnline ? 99.9 : 0));
  const avgResponseTime = uptimeData?.avg_response_time || responseTime;
  const totalChecks = uptimeData?.total_checks || 0;
  const redirectCount = uptimeData?.redirect_count || 0;

  // Format last checked time
  const formatLastChecked = () => {
    if (!lastCheckedAt) return 'Never';
    
    const date = new Date(lastCheckedAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  };

  // Get status display
  const getStatusDisplay = () => {
    if (hasNeverChecked) {
      return { icon: ClockCircleOutlined, color: '#94a3b8', label: 'Not Checked', tagColor: 'default' };
    }
    if (isOnline && !isWarning) {
      return { icon: CheckCircleOutlined, color: '#22c55e', label: 'Online', tagColor: 'success' };
    }
    if (isWarning) {
      return { icon: WarningOutlined, color: '#f59e0b', label: 'Warning', tagColor: 'warning' };
    }
    if (isDown) {
      return { icon: CloseCircleOutlined, color: '#ef4444', label: 'Offline', tagColor: 'error' };
    }
    // Has been checked but status is unknown
    if (healthDetails?.error) {
      return { icon: CloseCircleOutlined, color: '#ef4444', label: 'Error', tagColor: 'error' };
    }
    return { icon: CheckCircleOutlined, color: '#22c55e', label: 'Online', tagColor: 'success' };
  };

  const status = getStatusDisplay();
  const StatusIcon = status.icon;

  return (
    <div style={{ padding: '24px 0' }}>
      {/* Section Header */}
      <div style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space direction="vertical" size={4}>
              <Title level={5} style={{ margin: 0 }}>
                <ThunderboltOutlined style={{ marginRight: 8, color: '#f59e0b' }} />
                Uptime Monitoring
              </Title>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {globalSettings?.uptime?.enabled !== false ? (
                  <>
                    <CheckCircleOutlined style={{ color: '#22c55e', marginRight: 6 }} />
                    Auto-checked every {globalSettings?.uptime?.interval || 5} minutes
                  </>
                ) : (
                  <>
                    <ClockCircleOutlined style={{ color: '#94a3b8', marginRight: 6 }} />
                    Automatic monitoring disabled
                  </>
                )}
              </Text>
            </Space>
          </Col>
        </Row>
      </div>

      {/* Status Cards */}
      <Row gutter={[16, 16]}>
        {/* Online Status */}
        <Col xs={24} sm={12} md={8}>
          <Card
            style={{
              borderRadius: 12,
              background: isDark ? '#1e293b' : '#fff',
              textAlign: 'center',
            }}
          >
            <StatusIcon style={{ fontSize: 48, color: status.color, marginBottom: 12 }} />
            <div>
              <Tag color={status.tagColor} style={{ fontSize: 14, padding: '4px 12px' }}>
                {status.label}
              </Tag>
            </div>
            <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
              Current Status
            </Text>
          </Card>
        </Col>

        {/* Response Time */}
        <Col xs={24} sm={12} md={8}>
          <Card
            style={{
              borderRadius: 12,
              background: isDark ? '#1e293b' : '#fff',
              textAlign: 'center',
            }}
          >
            <ThunderboltOutlined style={{ fontSize: 48, color: '#f59e0b', marginBottom: 12 }} />
            <Statistic
              value={avgResponseTime || 'N/A'}
              suffix={avgResponseTime ? 'ms' : ''}
              valueStyle={{ fontSize: 24, fontWeight: 600 }}
            />
            <Text type="secondary">
              {totalChecks > 1 ? 'Avg Response Time' : 'Response Time'}
            </Text>
          </Card>
        </Col>

        {/* Uptime Percentage */}
        <Col xs={24} sm={12} md={8}>
          <Card
            style={{
              borderRadius: 12,
              background: isDark ? '#1e293b' : '#fff',
              textAlign: 'center',
            }}
          >
            <Progress
              type="circle"
              percent={uptimePercentage}
              size={80}
              strokeColor={uptimePercentage >= 99 ? '#22c55e' : uptimePercentage >= 95 ? '#f59e0b' : '#ef4444'}
              format={(percent) => `${percent}%`}
            />
            <div style={{ marginTop: 12 }}>
              <Text type="secondary">
                Uptime (30 days)
                {totalChecks > 0 && (
                  <span style={{ display: 'block', fontSize: 11 }}>
                    Based on {totalChecks} check{totalChecks === 1 ? '' : 's'}
                  </span>
                )}
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Redirect Warning */}
      {redirectCount > 0 && (
        <Alert
          type="warning"
          style={{ marginTop: 16, borderRadius: 8 }}
          message={`${redirectCount} redirect${redirectCount === 1 ? '' : 's'} detected`}
          description="Your site is redirecting requests. This may indicate a configuration issue or forced HTTPS/WWW redirect."
          showIcon
          icon={<SwapOutlined />}
        />
      )}

      {/* Last Check Info & Actions */}
      <Card
        style={{
          marginTop: 16,
          borderRadius: 12,
          background: isDark ? '#1e293b' : '#fff',
        }}
      >
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col xs={24} sm={12}>
            <Space>
              <ClockCircleOutlined style={{ color: '#64748b' }} />
              <Text type="secondary">
                Last checked: {formatLastChecked()}
              </Text>
            </Space>
          </Col>
          <Col xs={24} sm={12} style={{ textAlign: 'right' }}>
            <Space>
              <Tooltip title="When enabled, this project is included in automatic uptime checks. Disable to skip this project in scheduled monitoring.">
                <Space>
                  <Text type="secondary" style={{ fontSize: 12 }}>Auto Monitoring</Text>
                  <Switch
                    size="small"
                    checked={project.uptime_monitoring_enabled !== false}
                    onChange={(checked: boolean) => {
                      apiClient.patch(`/projects/${project.id}`, { uptime_monitoring_enabled: checked })
                        .then(() => {
                          message.success(checked ? 'Automatic monitoring enabled' : 'Automatic monitoring disabled');
                          queryClient.invalidateQueries({ queryKey: ['projects', project.id] });
                          queryClient.invalidateQueries({ queryKey: ['projects', Number(project.id)] });
                        })
                        .catch(() => message.error('Failed to update monitoring setting'));
                    }}
                  />
                </Space>
              </Tooltip>
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                loading={checkNowMutation.isPending}
                onClick={() => checkNowMutation.mutate()}
              >
                Check Now
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Health Details - Show if we have details from last check */}
      {healthDetails && !healthDetails.error && (
        <Card
          title="Health Details"
          style={{
            marginTop: 16,
            borderRadius: 12,
            background: isDark ? '#1e293b' : '#fff',
          }}
        >
          <Row gutter={[16, 16]}>
            <Col xs={12} md={6}>
              <Statistic
                title="SSL Status"
                value={healthDetails.ssl?.enabled ? 'Valid' : 'Not Enabled'}
                valueStyle={{ color: healthDetails.ssl?.enabled ? '#22c55e' : '#ef4444', fontSize: 16 }}
              />
            </Col>
            <Col xs={12} md={6}>
              <Statistic
                title="PHP Version"
                value={healthDetails.php?.version || project.php_version || 'Unknown'}
                valueStyle={{ fontSize: 16 }}
              />
            </Col>
            <Col xs={12} md={6}>
              <Statistic
                title="WordPress"
                value={healthDetails.wordpress?.version || project.wp_version || 'Unknown'}
                valueStyle={{ fontSize: 16 }}
              />
            </Col>
            <Col xs={12} md={6}>
              <Statistic
                title="Debug Mode"
                value={healthDetails.security?.debug_mode ? 'Enabled' : 'Disabled'}
                valueStyle={{ color: healthDetails.security?.debug_mode ? '#f59e0b' : '#22c55e', fontSize: 16 }}
              />
            </Col>
          </Row>
        </Card>
      )}

      {/* Show error if last check failed */}
      {healthDetails?.error && (
        <Alert
          type="error"
          style={{ marginTop: 16, borderRadius: 8 }}
          message="Last health check failed"
          description={healthDetails.error_message || 'Unable to connect to WordPress site'}
          showIcon
        />
      )}

      {/* Hint for first check */}
      {hasNeverChecked && (
        <Alert
          type="info"
          style={{ marginTop: 16, borderRadius: 8 }}
          message="No health check yet"
          description="Click 'Check Now' to run your first health check and verify the site is responding correctly."
          showIcon
        />
      )}
    </div>
  );
}
