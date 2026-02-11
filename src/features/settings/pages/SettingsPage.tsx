/**
 * Admin Settings Page
 * 
 * Admin-only page for configuring global application settings.
 * Includes uptime monitoring configuration, backup storage & schedule settings.
 */

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Typography, Switch, Select, InputNumber, Form, Button, Row, Col, Space, Divider, App, Spin, Alert, Tag } from 'antd';
import {
  SettingOutlined,
  ThunderboltOutlined,
  CloudOutlined,
  SaveOutlined,
  ReloadOutlined,
  HddOutlined,
  CloudUploadOutlined,
  GoogleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useThemeStore } from '@/stores/theme';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

const { Title, Text } = Typography;

interface BackupConfig {
  driver: string;
  available_drivers: string[];
  retention: {
    max_backups: number;
    max_age_days: number;
    min_backups: number;
  };
  schedule: {
    enabled: boolean;
    frequency: string;
    time: string;
    day_of_week: number;
  };
  defaults: {
    includes_database: boolean;
    includes_files: boolean;
    includes_uploads: boolean;
  };
}

const driverIcons: Record<string, React.ReactNode> = {
  local: <HddOutlined />,
  s3: <CloudUploadOutlined />,
  gcs: <CloudUploadOutlined />,
  gdrive: <GoogleOutlined />,
};

export function SettingsPage() {
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const user = useAuthStore((state) => state.user);
  const { t } = useTranslation();

  // Check if user is admin
  const isAdmin = user?.role === 'admin';

  // Redirect non-admins
  useEffect(() => {
    if (user && !isAdmin) {
      navigate('/dashboard');
    }
  }, [user, isAdmin, navigate]);

  // Fetch current settings
  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['settings'],
    queryFn: () => apiClient.get('/settings').then(r => r.data?.data || r.data),
    enabled: isAdmin,
  });

  // Fetch backup config
  const { data: backupConfig, isLoading: loadingBackupConfig } = useQuery<BackupConfig>({
    queryKey: ['backup-settings'],
    queryFn: () => apiClient.get('/backups/settings').then(r => r.data?.data || r.data),
    enabled: isAdmin,
  });

  // Update form when settings load
  useEffect(() => {
    if (settings) {
      form.setFieldsValue({
        'uptime.enabled': settings.uptime?.enabled ?? true,
        'uptime.interval': settings.uptime?.interval ?? 5,
        'uptime.concurrency': settings.uptime?.concurrency ?? 10,
        'uptime.timeout': settings.uptime?.timeout ?? 15,
        'backup.default_frequency': settings.backup?.default_frequency ?? 'daily',
        'backup.retention_days': settings.backup?.retention_days ?? 30,
      });
    }
  }, [settings, form]);

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: (values: any) => {
      const payload = {
        uptime: {
          enabled: values['uptime.enabled'],
          interval: values['uptime.interval'],
          concurrency: values['uptime.concurrency'],
          timeout: values['uptime.timeout'],
        },
        backup: {
          default_frequency: values['backup.default_frequency'],
          retention_days: values['backup.retention_days'],
        },
      };
      return apiClient.put('/settings', payload);
    },
    onSuccess: () => {
      message.success(t('settings.saveSuccess'));
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || t('settings.saveError'));
    },
  });

  const handleSave = (values: any) => {
    saveMutation.mutate(values);
  };

  if (!isAdmin) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Alert
          type="error"
          message={t('settings.accessDenied')}
          description={t('settings.noPermission')}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Alert
          type="error"
          message={t('settings.loadError')}
          description={t('settings.loadErrorHint')}
        />
      </div>
    );
  }

  const cardStyle = {
    borderRadius: 12,
    background: isDark ? '#1e293b' : '#fff',
  };

  const inputHeight = 40;

  return (
    <div className="page-container">
      {/* Page Header — consistent with other pages */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Space>
            <SettingOutlined style={{ fontSize: 24, color: '#6366f1' }} />
            <div>
              <Title level={3} style={{ margin: 0 }}>{t('settings.title')}</Title>
              <Text type="secondary">{t('settings.subtitle')}</Text>
            </div>
          </Space>
        </Col>
      </Row>

      {/* Settings Form — two column grid */}
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSave}
        initialValues={{
          'uptime.enabled': true,
          'uptime.interval': 5,
          'uptime.concurrency': 10,
          'uptime.timeout': 15,
          'backup.default_frequency': 'daily',
          'backup.retention_days': 30,
        }}
      >
        <Row gutter={24}>
          {/* Left Column — Uptime Monitoring */}
          <Col xs={24} lg={12}>
            <Card
              title={
                <Space>
                  <ThunderboltOutlined style={{ color: '#f59e0b' }} />
                  <span>{t('settings.uptime.title')}</span>
                </Space>
              }
              style={{ ...cardStyle, marginBottom: 24 }}
            >
              <Form.Item
                name="uptime.enabled"
                label={t('settings.uptime.enabled')}
                valuePropName="checked"
                tooltip={{ title: t('settings.uptime.enabledTooltip'), color: isDark ? '#334155' : undefined }}
              >
                <Switch
                  checkedChildren={t('settings.uptime.enabledOn')}
                  unCheckedChildren={t('settings.uptime.enabledOff')}
                />
              </Form.Item>

              <Form.Item
                name="uptime.interval"
                label={t('settings.uptime.interval')}
                tooltip={{ title: t('settings.uptime.intervalTooltip'), color: isDark ? '#334155' : undefined }}
              >
                <Select
                  style={{ height: inputHeight }}
                  options={[
                    { value: 1, label: t('settings.uptime.intervalOptions.min1') },
                    { value: 2, label: t('settings.uptime.intervalOptions.min2') },
                    { value: 3, label: t('settings.uptime.intervalOptions.min3') },
                    { value: 5, label: t('settings.uptime.intervalOptions.min5') },
                    { value: 10, label: t('settings.uptime.intervalOptions.min10') },
                    { value: 15, label: t('settings.uptime.intervalOptions.min15') },
                    { value: 30, label: t('settings.uptime.intervalOptions.min30') },
                  ]}
                />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="uptime.concurrency"
                    label={t('settings.uptime.concurrency')}
                    tooltip={{ title: t('settings.uptime.concurrencyTooltip'), color: isDark ? '#334155' : undefined }}
                  >
                    <InputNumber
                      min={1}
                      max={50}
                      style={{ width: '100%', height: inputHeight }}
                      addonAfter={t('settings.uptime.concurrencyUnit')}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="uptime.timeout"
                    label={t('settings.uptime.timeout')}
                    tooltip={{ title: t('settings.uptime.timeoutTooltip'), color: isDark ? '#334155' : undefined }}
                  >
                    <InputNumber
                      min={5}
                      max={60}
                      style={{ width: '100%', height: inputHeight }}
                      addonAfter={t('settings.uptime.timeoutUnit')}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Text type="secondary" style={{ fontSize: 12 }}>
                {t('settings.uptime.tip')}
              </Text>
            </Card>
          </Col>

          {/* Right Column — Backup Settings */}
          <Col xs={24} lg={12}>
            <Card
              title={
                <Space>
                  <CloudOutlined style={{ color: '#3b82f6' }} />
                  <span>{t('settings.backup.title')}</span>
                </Space>
              }
              style={{ ...cardStyle, marginBottom: 24 }}
              loading={loadingBackupConfig}
            >
              {/* Storage Location (read-only) */}
              {backupConfig && (
                <>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>{t('settings.backup.storageLocation')}</Text>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                    {backupConfig.available_drivers.map((driver) => (
                      <Card
                        key={driver}
                        size="small"
                        style={{
                          flex: '1 1 0',
                          minWidth: 110,
                          cursor: 'default',
                          borderColor: backupConfig.driver === driver ? '#1890ff' : undefined,
                          background: backupConfig.driver === driver ? (isDark ? '#1e3a5f' : '#e6f7ff') : undefined,
                        }}
                        styles={{ body: { padding: '8px 10px' } }}
                      >
                        <Space size={6}>
                          {driverIcons[driver]}
                          <div>
                            <Text strong style={{ display: 'block', fontSize: 12 }}>{t(`settings.drivers.${driver}`, { defaultValue: driver })}</Text>
                            {backupConfig.driver === driver && (
                              <Tag color="blue" style={{ margin: 0, fontSize: 10 }}>{t('settings.backup.active')}</Tag>
                            )}
                          </div>
                        </Space>
                      </Card>
                    ))}
                  </div>
                  <Alert
                    type="info"
                    message={t('settings.backup.storageDriverInfo')}
                    style={{ marginBottom: 16, borderRadius: 8, fontSize: 12 }}
                    showIcon
                  />
                  <Divider style={{ margin: '12px 0' }} />
                </>
              )}

              {/* Editable settings */}
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="backup.default_frequency"
                    label={t('settings.backup.defaultFrequency')}
                    tooltip={{ title: t('settings.backup.frequencyTooltip'), color: isDark ? '#334155' : undefined }}
                  >
                    <Select
                      style={{ height: inputHeight }}
                      options={[
                        { value: 'daily', label: t('settings.backup.daily') },
                        { value: 'weekly', label: t('settings.backup.weekly') },
                        { value: 'monthly', label: t('settings.backup.monthly') },
                      ]}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="backup.retention_days"
                    label={t('settings.backup.retentionPeriod')}
                    tooltip={{ title: t('settings.backup.retentionTooltip'), color: isDark ? '#334155' : undefined }}
                  >
                    <InputNumber
                      min={1}
                      max={365}
                      style={{ width: '100%', height: inputHeight }}
                      addonAfter={t('settings.backup.retentionUnit')}
                    />
                  </Form.Item>
                </Col>
              </Row>

              {/* Read-only config summary */}
              {backupConfig && (
                <>
                  <Divider style={{ margin: '12px 0' }} />
                  {/* Schedule Status */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Text strong>{t('settings.backup.scheduledBackups')}</Text>
                      <Tag color={backupConfig.schedule.enabled ? 'green' : 'default'}>
                        {backupConfig.schedule.enabled ? t('settings.uptime.enabledOn') : t('settings.uptime.enabledOff')}
                      </Tag>
                    </div>
                    <Space size={24}>
                      <div>
                        <Text type="secondary" style={{ fontSize: 11 }}>{t('settings.backup.frequency')}</Text>
                        <div style={{ textTransform: 'capitalize' }}>
                          <Text strong>{backupConfig.schedule.frequency}</Text>
                        </div>
                      </div>
                      <div>
                        <Text type="secondary" style={{ fontSize: 11 }}>{t('settings.backup.time')}</Text>
                        <div>
                          <Text strong>{backupConfig.schedule.time}</Text>
                        </div>
                      </div>
                    </Space>
                  </div>

                  {/* Retention Policy */}
                  <div style={{ marginBottom: 16 }}>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>{t('settings.backup.retentionPolicy')}</Text>
                    <Space size={20}>
                      <div>
                        <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{t('settings.backup.maxBackups')}</Text>
                        <Text strong style={{ fontSize: 16 }}>{backupConfig.retention.max_backups}</Text>
                      </div>
                      <div>
                        <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{t('settings.backup.maxAge')}</Text>
                        <Text strong style={{ fontSize: 16 }}>{backupConfig.retention.max_age_days || '∞'} {t('settings.backup.retentionUnit')}</Text>
                      </div>
                      <div>
                        <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{t('settings.backup.minKeep')}</Text>
                        <Text strong style={{ fontSize: 16 }}>{backupConfig.retention.min_backups}</Text>
                      </div>
                    </Space>
                  </div>

                  {/* Default Contents */}
                  <div>
                    <Text strong style={{ display: 'block', marginBottom: 6 }}>{t('settings.backup.defaultContents')}</Text>
                    <Space size={4}>
                      <Tag color={backupConfig.defaults.includes_database ? 'green' : 'default'}>
                        {t('settings.backup.database')} {backupConfig.defaults.includes_database ? '✓' : '✗'}
                      </Tag>
                      <Tag color={backupConfig.defaults.includes_files ? 'green' : 'default'}>
                        {t('settings.backup.files')} {backupConfig.defaults.includes_files ? '✓' : '✗'}
                      </Tag>
                      <Tag color={backupConfig.defaults.includes_uploads ? 'green' : 'default'}>
                        {t('settings.backup.uploads')} {backupConfig.defaults.includes_uploads ? '✓' : '✗'}
                      </Tag>
                    </Space>
                  </div>
                </>
              )}
            </Card>
          </Col>
        </Row>

        {/* Save Button */}
        <Row justify="end">
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                form.resetFields();
                queryClient.invalidateQueries({ queryKey: ['settings'] });
              }}
            >
              {t('settings.reset')}
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={saveMutation.isPending}
            >
              {t('settings.saveSettings')}
            </Button>
          </Space>
        </Row>
      </Form>
    </div>
  );
}

export default SettingsPage;
