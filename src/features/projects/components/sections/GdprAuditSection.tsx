/**
 * GDPR Audit Section — Dual Mode (Quick + Full)
 *
 * Quick mode: Pre-consent check only (~15s)
 * Full mode:  4 scenarios — pre-consent, banner UI, accept-all, reject (~45s)
 */

import { useState } from 'react';
import {
  Card,
  Typography,
  Button,
  Space,
  Row,
  Col,
  Table,
  Tag,
  Empty,
  Alert,
  App,
  Statistic,
  Divider,
  Spin,
  Result,
  Progress,
  Tooltip,
  Segmented,
  Descriptions,
  Collapse,
} from 'antd';

const { Text, Title } = Typography;
import {
  SafetyOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  GlobalOutlined,
  LockOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  FileSearchOutlined,
  EyeOutlined,
  BugOutlined,
  ThunderboltOutlined,
  ExperimentOutlined,
  CheckOutlined,
  StopOutlined,
  DownloadOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useThemeStore } from '@/stores/theme';
import { useTranslation } from 'react-i18next';

interface GdprAuditSectionProps {
  project: any;
}

export default function GdprAuditSection({ project }: GdprAuditSectionProps) {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [auditMode, setAuditMode] = useState<'quick' | 'full'>('quick');
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';
  const { t, i18n } = useTranslation();

  const cardStyle = {
    borderRadius: 12,
    background: isDark ? '#1e293b' : '#fff',
    border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
  };

  const { data: latestReport, isLoading: loadingReport } = useQuery({
    queryKey: ['gdpr-audit', project.id],
    queryFn: () => apiClient.get(`/projects/${project.id}/gdpr-audit`).then((r) => r.data?.data),
    enabled: !!project.id,
    staleTime: 1000 * 60 * 5,
  });

  const runAuditMutation = useMutation({
    mutationFn: (mode: string) => apiClient.post(`/projects/${project.id}/gdpr-audit`, { mode, locale: i18n.language?.startsWith('de') ? 'de' : 'en' }),
    onSuccess: () => {
      message.success('GDPR audit completed!');
      queryClient.invalidateQueries({ queryKey: ['gdpr-audit', project.id] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to run GDPR audit');
    },
  });

  const saveToReportsMutation = useMutation({
    mutationFn: () => apiClient.post(`/projects/${project.id}/gdpr-audit/${latestReport?.id}/save-report`),
    onSuccess: () => {
      message.success(t('gdpr.reportSaved'));
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || t('gdpr.reportSaveError'));
    },
  });

  const handleDownloadPdf = async () => {
    if (!latestReport?.id) return;
    try {
      const response = await apiClient.get(
        `/projects/${project.id}/gdpr-audit/${latestReport.id}/pdf`,
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `gdpr-audit-${project.name || project.id}-${new Date().toISOString().slice(0, 10)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      message.error('Failed to download PDF');
    }
  };

  const auditData = latestReport?.audit_data;

  // ─── No URL ──────────────────────────────────────────────────────
  if (!project.url) {
    return (
      <div style={{ padding: '48px 0', textAlign: 'center' }}>
        <Empty
          image={<GlobalOutlined style={{ fontSize: 48, color: '#94a3b8' }} />}
          description={
            <div>
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>No website URL configured</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>Add a URL to enable GDPR auditing</Text>
            </div>
          }
        />
      </div>
    );
  }

  if (loadingReport) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin size="large" /></div>;
  }

  const score = auditData?.aiSummary?.score ?? auditData?.score ?? 0;
  const getScoreColor = (s: number) => s >= 80 ? '#22c55e' : s >= 50 ? '#f59e0b' : '#ef4444';
  const getScoreLabel = (s: number) => {
    if (s >= 80) return t('gdpr.score.excellent');
    if (s >= 50) return t('gdpr.score.needsWork');
    return t('gdpr.score.criticalIssues');
  };
  const getCheckIcon = (status: string) => {
    if (status === 'pass') return <CheckCircleOutlined style={{ color: '#22c55e', fontSize: 18 }} />;
    if (status === 'warning') return <WarningOutlined style={{ color: '#f59e0b', fontSize: 18 }} />;
    return <CloseCircleOutlined style={{ color: '#ef4444', fontSize: 18 }} />;
  };

  return (
    <div style={{ padding: '24px 0' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle" gutter={[16, 12]}>
          <Col>
            <Space direction="vertical" size={4}>
              <Title level={5} style={{ margin: 0 }}>
                <SafetyOutlined style={{ marginRight: 8, color: '#6366f1' }} />
                {t('gdpr.title')}
              </Title>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {t('gdpr.subtitle')}
              </Text>
            </Space>
          </Col>
          <Col>
            <Space size={12}>
              <Segmented
                value={auditMode}
                onChange={(v) => setAuditMode(v as 'quick' | 'full')}
                options={[
                  { label: <span><ThunderboltOutlined /> {t('gdpr.quick')}</span>, value: 'quick' },
                  { label: <span><ExperimentOutlined /> {t('gdpr.full')}</span>, value: 'full' },
                ]}
              />
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                loading={runAuditMutation.isPending}
                onClick={() => runAuditMutation.mutate(auditMode)}
                style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', border: 'none' }}
              >
                {auditData
                  ? (auditMode === 'full' ? t('gdpr.rerunFull') : t('gdpr.rerunQuick'))
                  : (auditMode === 'full' ? t('gdpr.runFullAudit') : t('gdpr.runQuickAudit'))}
              </Button>
              {auditData && latestReport?.id && (
                <>
                  <Button icon={<DownloadOutlined />} onClick={handleDownloadPdf}>
                    {t('gdpr.pdf')}
                  </Button>
                  <Button
                    icon={<SaveOutlined />}
                    loading={saveToReportsMutation.isPending}
                    onClick={() => saveToReportsMutation.mutate()}
                  >
                    {t('gdpr.saveToReports')}
                  </Button>
                </>
              )}
            </Space>
          </Col>
        </Row>
      </div>

      {/* Running */}
      {runAuditMutation.isPending && (
        <Card style={{ ...cardStyle, textAlign: 'center', padding: 40, marginBottom: 16 }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text strong style={{ fontSize: 16 }}>
              {t('gdpr.running.title', { mode: auditMode === 'full' ? t('gdpr.full') : t('gdpr.quick') })}
            </Text>
          </div>
          <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
            {t('gdpr.running.subtitle')}
          </Text>
        </Card>
      )}

      {/* No audit yet */}
      {!auditData && !runAuditMutation.isPending && (
        <Result
          icon={<FileSearchOutlined style={{ color: '#6366f1' }} />}
          title={t('gdpr.noAudit.title')}
          subTitle={t('gdpr.noAudit.description')}
          extra={
            <Space size={12}>
              <Button
                type="primary"
                size="large"
                icon={<ThunderboltOutlined />}
                onClick={() => runAuditMutation.mutate('quick')}
                style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', border: 'none' }}
              >
                {t('gdpr.runQuickAudit')} (~15s)
              </Button>
              <Button
                size="large"
                icon={<ExperimentOutlined />}
                onClick={() => runAuditMutation.mutate('full')}
              >
                {t('gdpr.runFullAudit')} (~45s)
              </Button>
            </Space>
          }
        />
      )}

      {/* ─── Results ─────────────────────────────────────────── */}
      {auditData && !runAuditMutation.isPending && (
        <>
          {/* Mode + AI badge */}
          <div style={{ marginBottom: 16 }}>
            <Space>
              <Tag color={auditData.mode === 'full' ? 'purple' : 'blue'} style={{ fontSize: 12, padding: '2px 8px' }}>
                {auditData.mode === 'full' ? `🔬 ${t('gdpr.badges.fullAudit')}` : `⚡ ${t('gdpr.badges.quickScan')}`}
              </Tag>
              {auditData.aiEnhanced ? (
                <Tag color="geekblue" style={{ fontSize: 12, padding: '2px 8px' }}>🤖 {t('gdpr.badges.aiEnhanced')}</Tag>
              ) : (
                <Tag style={{ fontSize: 12, padding: '2px 8px' }}>⚙️ {t('gdpr.badges.basicScan')}</Tag>
              )}
            </Space>
          </div>

          {/* ═══════════════════════════════════════════════════════════
              1. SCORE HERO — Score + Key Metrics
             ═══════════════════════════════════════════════════════════ */}
          <Card
            style={{
              ...cardStyle,
              marginBottom: 24,
              background: isDark
                ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(139, 92, 246, 0.08) 100%)'
                : 'linear-gradient(135deg, rgba(99, 102, 241, 0.06) 0%, rgba(139, 92, 246, 0.04) 100%)',
              borderColor: isDark ? '#4338ca44' : '#e0e7ff',
            }}
          >
            <Row gutter={[24, 16]} align="middle">
              {/* Score circle */}
              <Col xs={24} sm={8} md={6} style={{ textAlign: 'center' }}>
                <Progress
                  type="circle"
                  percent={score}
                  size={120}
                  strokeColor={{
                    '0%': getScoreColor(score),
                    '100%': score >= 80 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626',
                  }}
                  strokeWidth={8}
                  format={(p) => (
                    <div>
                      <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1 }}>{p}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>/ 100</div>
                    </div>
                  )}
                />
                <div style={{ marginTop: 12 }}>
                  <Tag
                    color={score >= 80 ? 'success' : score >= 50 ? 'warning' : 'error'}
                    style={{ fontSize: 13, padding: '4px 12px', fontWeight: 600 }}
                  >
                    {getScoreLabel(score)}
                  </Tag>
                </div>
                {auditData.aiSummary?.verdict && (
                  <div style={{ marginTop: 6 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>{auditData.aiSummary.verdict}</Text>
                  </div>
                )}
              </Col>

              {/* Key metrics */}
              <Col xs={24} sm={16} md={18}>
                <Row gutter={[16, 16]}>
                  {/* Trackers */}
                  <Col xs={12} sm={6}>
                    <Card
                      size="small"
                      style={{
                        ...cardStyle,
                        borderTop: `3px solid ${(auditData.summary?.trackingRequests || 0) > 0 ? '#ef4444' : '#22c55e'}`,
                        textAlign: 'center',
                      }}
                    >
                      <BugOutlined style={{ fontSize: 24, color: (auditData.summary?.trackingRequests || 0) > 0 ? '#ef4444' : '#22c55e', marginBottom: 4 }} />
                      <Statistic value={auditData.summary?.trackingRequests || 0} valueStyle={{ fontSize: 24, fontWeight: 700 }} />
                      <Text type="secondary" style={{ fontSize: 11 }}>{t('gdpr.stats.trackers')}</Text>
                    </Card>
                  </Col>

                  {/* Tracking Cookies */}
                  <Col xs={12} sm={6}>
                    <Card
                      size="small"
                      style={{
                        ...cardStyle,
                        borderTop: `3px solid ${(auditData.summary?.trackingCookies || 0) > 0 ? '#ef4444' : '#22c55e'}`,
                        textAlign: 'center',
                      }}
                    >
                      <LockOutlined style={{ fontSize: 24, color: (auditData.summary?.trackingCookies || 0) > 0 ? '#ef4444' : '#22c55e', marginBottom: 4 }} />
                      <Statistic value={auditData.summary?.trackingCookies || 0} valueStyle={{ fontSize: 24, fontWeight: 700 }} />
                      <Text type="secondary" style={{ fontSize: 11 }}>{t('gdpr.stats.trackingCookies')}</Text>
                    </Card>
                  </Col>

                  {/* Banner */}
                  <Col xs={12} sm={6}>
                    <Card
                      size="small"
                      style={{
                        ...cardStyle,
                        borderTop: `3px solid ${auditData.summary?.cookieBannerDetected ? '#22c55e' : '#ef4444'}`,
                        textAlign: 'center',
                      }}
                    >
                      {auditData.summary?.cookieBannerDetected
                        ? <CheckCircleOutlined style={{ fontSize: 24, color: '#22c55e', marginBottom: 4 }} />
                        : <CloseCircleOutlined style={{ fontSize: 24, color: '#ef4444', marginBottom: 4 }} />}
                      <div><Text strong style={{ fontSize: 13 }}>{auditData.summary?.cookieBannerDetected ? t('gdpr.stats.detected') : t('gdpr.stats.notFound')}</Text></div>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {t('gdpr.stats.banner')} {auditData.summary?.cookieBannerSolution?.length > 0 && `(${auditData.summary.cookieBannerSolution.join(', ')})`}
                      </Text>
                    </Card>
                  </Col>

                  {/* Accept/Reject Flow */}
                  {auditData.summary?.acceptFlowWorks !== null && auditData.summary?.acceptFlowWorks !== undefined && (
                    <Col xs={12} sm={6}>
                      <Card
                        size="small"
                        style={{
                          ...cardStyle,
                          borderTop: `3px solid ${auditData.summary.acceptFlowWorks && auditData.summary.rejectFlowClean ? '#22c55e' : '#ef4444'}`,
                          textAlign: 'center',
                        }}
                      >
                        <Space direction="vertical" size={2}>
                          <div>
                            {auditData.summary.acceptFlowWorks
                              ? <CheckOutlined style={{ fontSize: 18, color: '#22c55e' }} />
                              : <WarningOutlined style={{ fontSize: 18, color: '#f59e0b' }} />}
                          </div>
                          <Text strong style={{ fontSize: 11 }}>{t('gdpr.stats.acceptFlow')}</Text>
                          <Tag color={auditData.summary.acceptFlowWorks ? 'success' : 'warning'} style={{ fontSize: 10 }}>
                            {auditData.summary.acceptFlowWorks ? t('gdpr.stats.working') : t('gdpr.stats.noActivity')}
                          </Tag>
                          {auditData.summary.rejectFlowClean !== null && (
                            <>
                              <div style={{ marginTop: 2 }}>
                                {auditData.summary.rejectFlowClean
                                  ? <CheckOutlined style={{ fontSize: 18, color: '#22c55e' }} />
                                  : <StopOutlined style={{ fontSize: 18, color: '#ef4444' }} />}
                              </div>
                              <Text strong style={{ fontSize: 11 }}>{t('gdpr.stats.rejectFlow')}</Text>
                              <Tag color={auditData.summary.rejectFlowClean ? 'success' : 'error'} style={{ fontSize: 10 }}>
                                {auditData.summary.rejectFlowClean ? t('gdpr.stats.clean') : t('gdpr.stats.leaking')}
                              </Tag>
                            </>
                          )}
                        </Space>
                      </Card>
                    </Col>
                  )}
                </Row>
              </Col>
            </Row>
          </Card>

          {/* Issues Alert */}
          {auditData.issues && auditData.issues.length > 0 && (
            <Alert
              type={score >= 80 ? 'info' : score >= 50 ? 'warning' : 'error'}
              showIcon
              icon={<ExclamationCircleOutlined />}
              message={`${auditData.issues.length} issue(s) detected`}
              description={
                <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
                  {auditData.issues.map((issue: string, i: number) => (
                    <li key={i} style={{ marginBottom: 4 }}>{issue}</li>
                  ))}
                </ul>
              }
              style={{ marginBottom: 16, borderRadius: 8 }}
            />
          )}

          {/* ═══════════════════════════════════════════════════════════
              2. AI COMPLIANCE ANALYSIS
             ═══════════════════════════════════════════════════════════ */}
          {auditData.aiSummary && (
            <Card
              title={
                <Space>
                  <ExperimentOutlined style={{ color: '#6366f1' }} />
                  <span>{t('gdpr.ai.title')}</span>
                  <Tag color={
                    auditData.aiSummary.verdict === 'Compliant' ? 'success' :
                    auditData.aiSummary.verdict === 'Partially Compliant' ? 'warning' :
                    'error'
                  }>
                    {auditData.aiSummary.verdict}
                  </Tag>
                </Space>
              }
              style={{ ...cardStyle, marginBottom: 24 }}
            >
              {/* Summary text */}
              <Alert
                type={
                  (auditData.aiSummary.score ?? 0) >= 80 ? 'success' :
                  (auditData.aiSummary.score ?? 0) >= 50 ? 'warning' : 'error'
                }
                message={auditData.aiSummary.summary}
                showIcon
                style={{ marginBottom: 16, borderRadius: 8 }}
              />

              {/* Violations */}
              {auditData.aiSummary.violations?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>
                    <WarningOutlined style={{ color: '#ef4444', marginRight: 6 }} />
                    {t('gdpr.ai.violations')} ({auditData.aiSummary.violations.length})
                  </Text>
                  <Table
                    dataSource={auditData.aiSummary.violations.map((v: any, i: number) => ({ ...v, key: i }))}
                    columns={[
                      {
                        title: t('gdpr.ai.severity'),
                        dataIndex: 'severity',
                        key: 'severity',
                        width: 100,
                        render: (s: string) => (
                          <Tag color={s === 'critical' ? 'red' : s === 'high' ? 'volcano' : s === 'medium' ? 'orange' : 'default'}>
                            {s}
                          </Tag>
                        ),
                      },
                      { title: t('gdpr.ai.issue'), dataIndex: 'title', key: 'title', width: 200 },
                      { title: t('gdpr.ai.details'), dataIndex: 'description', key: 'description' },
                      {
                        title: t('gdpr.ai.legalRef'),
                        dataIndex: 'legalRef',
                        key: 'legalRef',
                        width: 180,
                        render: (ref: string) => <Text code style={{ fontSize: 11 }}>{ref}</Text>,
                      },
                      { title: t('gdpr.ai.fix'), dataIndex: 'recommendation', key: 'recommendation', width: 250 },
                    ]}
                    size="small"
                    pagination={false}
                    scroll={{ x: 800 }}
                  />
                </div>
              )}

              {/* Positives */}
              {auditData.aiSummary.positives?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>
                    <CheckCircleOutlined style={{ color: '#22c55e', marginRight: 6 }} />
                    {t('gdpr.ai.whatsRight')}
                  </Text>
                  <Space direction="vertical" size={4}>
                    {auditData.aiSummary.positives.map((p: string, i: number) => (
                      <Text key={i} style={{ fontSize: 13 }}>
                        <CheckCircleOutlined style={{ color: '#22c55e', marginRight: 6 }} /> {p}
                      </Text>
                    ))}
                  </Space>
                </div>
              )}

              {/* Recommendations */}
              {auditData.aiSummary.recommendations?.length > 0 && (
                <div>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>
                    <InfoCircleOutlined style={{ color: '#6366f1', marginRight: 6 }} />
                    {t('gdpr.ai.recommendations')}
                  </Text>
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    {auditData.aiSummary.recommendations.map((r: any, i: number) => (
                      <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <Tag color={r.priority === 'high' ? 'red' : r.priority === 'medium' ? 'orange' : 'blue'} style={{ flexShrink: 0 }}>
                          {r.priority}
                        </Tag>
                        <Text style={{ fontSize: 13 }}>{r.action}</Text>
                      </div>
                    ))}
                  </Space>
                </div>
              )}
            </Card>
          )}

          {/* ═══════════════════════════════════════════════════════════
              3. TECHNICAL DETAILS (Collapsible)
             ═══════════════════════════════════════════════════════════ */}
          <Collapse
            defaultActiveKey={['checks']}
            style={{ marginBottom: 24, borderRadius: 12, overflow: 'hidden' }}
            items={[
              // Audit Checks
              ...(auditData.checks?.length > 0 ? [{
                key: 'checks',
                label: <Space><EyeOutlined /><span>{t('gdpr.sections.auditChecks')}</span></Space>,
                children: (
                  <Table
                    dataSource={auditData.checks.map((c: any, i: number) => ({ ...c, key: i }))}
                    columns={[
                      { title: t('gdpr.table.check'), dataIndex: 'name', key: 'name', width: 220, render: (name: string) => <Text strong>{name}</Text> },
                      { title: t('gdpr.table.status'), dataIndex: 'status', key: 'status', width: 80, align: 'center' as const, render: (s: string) => getCheckIcon(s) },
                      {
                        title: t('gdpr.table.details'), dataIndex: 'details', key: 'details',
                        render: (details: string, record: any) => (
                          <div>
                            <Text>{details}</Text>
                            {record.services && Object.keys(record.services).length > 0 && (
                              <div style={{ marginTop: 6 }}>
                                {Object.entries(record.services).map(([svc, info]: [string, any]) => (
                                  <Tag key={svc} color={info.severity === 'critical' ? 'error' : 'warning'} style={{ marginBottom: 4 }}>
                                    {svc} (×{info.count})
                                  </Tag>
                                ))}
                              </div>
                            )}
                            {record.cookies && Object.keys(record.cookies).length > 0 && (
                              <div style={{ marginTop: 6 }}>
                                {Object.entries(record.cookies).map(([svc, names]: [string, any]) => (
                                  <div key={svc} style={{ marginBottom: 2 }}>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                      {svc}: <Text code style={{ fontSize: 11 }}>{names.join(', ')}</Text>
                                    </Text>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ),
                      },
                    ]}
                    pagination={false}
                    size="small"
                  />
                ),
              }] : []),

              // Cookie Banner Analysis
              ...(auditData.cookieBanner ? [{
                key: 'banner',
                label: <Space><GlobalOutlined /><span>{t('gdpr.sections.cookieBanner')}</span></Space>,
                children: (
                  <div>
                    <Descriptions bordered size="small" column={1}>
                      <Descriptions.Item label={t('gdpr.bannerLabels.detected')}>
                        {auditData.cookieBanner.detected
                          ? <Tag color="success">{t('common.yes')}</Tag>
                          : <Tag color="error">{t('common.no')}</Tag>}
                      </Descriptions.Item>
                      {auditData.cookieBanner.solution && (
                        <Descriptions.Item label={t('gdpr.bannerLabels.solution')}>
                          <Tag color="blue">{auditData.cookieBanner.solution}</Tag>
                        </Descriptions.Item>
                      )}
                    </Descriptions>
                    {auditData.cookieBanner.buttons?.length > 0 && (
                      <div style={{ marginTop: 16 }}>
                        <Text strong style={{ display: 'block', marginBottom: 8 }}>Consent Buttons</Text>
                        <Table
                          dataSource={auditData.cookieBanner.buttons.map((b: any, i: number) => ({ ...b, key: i }))}
                          columns={[
                            { title: 'Text', dataIndex: 'text', key: 'text', render: (txt: string) => <Text strong>{txt}</Text> },
                            {
                              title: 'Style', key: 'style',
                              render: (_: any, record: any) => (
                                <Space>
                                  <div style={{ width: 16, height: 16, borderRadius: 4, background: record.bg, border: '1px solid #e5e7eb' }} />
                                  <Text type="secondary" style={{ fontSize: 11 }}>bg: {record.bg}</Text>
                                  <Text type="secondary" style={{ fontSize: 11 }}>size: {record.fontSize}</Text>
                                </Space>
                              ),
                            },
                          ]}
                          pagination={false}
                          size="small"
                        />
                      </div>
                    )}
                    {auditData.cookieBanner.checkboxes?.length > 0 && (
                      <div style={{ marginTop: 16 }}>
                        <Text strong style={{ display: 'block', marginBottom: 8 }}>{t('gdpr.bannerLabels.preTickedCheckboxes')}</Text>
                        <Table
                          dataSource={auditData.cookieBanner.checkboxes.map((cb: any, i: number) => ({ ...cb, key: i }))}
                          columns={[
                            { title: 'Label', dataIndex: 'label', key: 'label' },
                            {
                              title: 'Pre-checked', dataIndex: 'checked', key: 'checked', width: 100, align: 'center' as const,
                              render: (v: boolean) => v ? <Tag color="blue">{t('common.yes')}</Tag> : <Tag>{t('common.no')}</Tag>,
                            },
                            {
                              title: 'Issue', key: 'issue', width: 120, align: 'center' as const,
                              render: (_: any, record: any) => record.preTicked
                                ? <Tag color="error">Dark Pattern!</Tag>
                                : <Tag color="success">OK</Tag>,
                            },
                          ]}
                          pagination={false}
                          size="small"
                        />
                      </div>
                    )}
                  </div>
                ),
              }] : []),

              // Tracking Services
              ...(auditData.trackingByService && Object.keys(auditData.trackingByService).length > 0 ? [{
                key: 'tracking',
                label: (
                  <Space>
                    <BugOutlined />
                    <span>{t('gdpr.sections.trackingServices')}</span>
                    <Tag color="error">{Object.keys(auditData.trackingByService).length}</Tag>
                  </Space>
                ),
                children: (
                  <Table
                    dataSource={Object.entries(auditData.trackingByService).map(([service, info]: [string, any]) => ({ key: service, service, ...info }))}
                    columns={[
                      { title: t('gdpr.table.service'), dataIndex: 'service', key: 'service', render: (n: string) => <Text strong>{n}</Text> },
                      {
                        title: t('gdpr.ai.severity'), dataIndex: 'severity', key: 'severity', width: 100, align: 'center' as const,
                        render: (s: string) => <Tag color={s === 'critical' ? 'error' : 'warning'}>{s === 'critical' ? 'Critical' : 'Warning'}</Tag>,
                      },
                      { title: t('gdpr.table.requests'), dataIndex: 'count', key: 'count', width: 90, align: 'center' as const },
                      {
                        title: 'Example', dataIndex: 'urls', key: 'urls',
                        render: (urls: string[]) => urls?.[0] ? (
                          <Tooltip title={urls[0]}>
                            <Text type="secondary" style={{ fontSize: 11, wordBreak: 'break-all' }}>{urls[0].length > 80 ? urls[0].substring(0, 80) + '…' : urls[0]}</Text>
                          </Tooltip>
                        ) : null,
                      },
                    ]}
                    pagination={false}
                    size="small"
                  />
                ),
              }] : []),

              // All Cookies
              ...((auditData.cookies || []).length > 0 ? [{
                key: 'cookies',
                label: <Space><LockOutlined /><span>{t('gdpr.sections.allCookies')}</span><Tag>{auditData.cookies.length}</Tag></Space>,
                children: (
                  <Table
                    dataSource={auditData.cookies.map((c: any, i: number) => ({ ...c, key: `${c.name}-${i}` }))}
                    columns={[
                      { title: t('gdpr.table.name'), dataIndex: 'name', key: 'name', render: (n: string) => <Text strong code>{n}</Text> },
                      {
                        title: t('gdpr.table.tracking'), key: 'type', width: 130,
                        render: (_: any, record: any) => {
                          const cls = record.classification;
                          if (cls?.type === 'tracking') return <Tag color="error">{cls.service}</Tag>;
                          return <Tag>Other</Tag>;
                        },
                      },
                      { title: t('gdpr.table.domain'), dataIndex: 'domain', key: 'domain', render: (d: string) => <Text type="secondary" style={{ fontSize: 12 }}>{d}</Text> },
                      {
                        title: 'Secure', dataIndex: 'secure', key: 'secure', width: 70, align: 'center' as const,
                        render: (v: boolean) => v ? <CheckCircleOutlined style={{ color: '#22c55e' }} /> : <CloseCircleOutlined style={{ color: '#ef4444' }} />,
                      },
                      {
                        title: 'HttpOnly', dataIndex: 'httpOnly', key: 'httpOnly', width: 80, align: 'center' as const,
                        render: (v: boolean) => v ? <CheckCircleOutlined style={{ color: '#22c55e' }} /> : <CloseCircleOutlined style={{ color: '#ef4444' }} />,
                      },
                    ]}
                    pagination={false}
                    size="small"
                  />
                ),
              }] : []),

              // Accept-All Flow
              ...(auditData.scenarios?.acceptAll ? [{
                key: 'accept-flow',
                label: <Space><CheckOutlined style={{ color: '#22c55e' }} /><span>{t('gdpr.sections.acceptAllFlow')}</span></Space>,
                children: auditData.scenarios.acceptAll.clicked ? (
                  <div>
                    <Text type="secondary">Clicked: <Text strong>"{auditData.scenarios.acceptAll.clicked}"</Text></Text>
                    <div style={{ marginTop: 12 }}>
                      <Text strong>Post-accept tracking: </Text>
                      {(auditData.scenarios.acceptAll.postTracking || []).length === 0
                        ? <Tag color="warning">None detected — CMP may not be working</Tag>
                        : <Tag color="success">{auditData.scenarios.acceptAll.postTracking.length} request(s)</Tag>}
                    </div>
                    {(auditData.scenarios.acceptAll.newCookies || []).length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <Text strong>New cookies after accept: </Text>
                        {auditData.scenarios.acceptAll.newCookies.map((c: any, i: number) => (
                          <Tag key={i} color={c.classification?.type === 'tracking' ? 'error' : 'default'} style={{ marginBottom: 4 }}>
                            {c.name} ({c.domain})
                          </Tag>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Text type="secondary">Could not find "Accept All" button</Text>
                ),
              }] : []),

              // Reject Flow
              ...(auditData.scenarios?.reject ? [{
                key: 'reject-flow',
                label: (
                  <Space>
                    <StopOutlined style={{ color: auditData.summary?.rejectFlowClean ? '#22c55e' : '#ef4444' }} />
                    <span>{t('gdpr.sections.rejectFlow')}</span>
                  </Space>
                ),
                children: auditData.scenarios.reject.clicked ? (
                  <div>
                    <Text type="secondary">Clicked: <Text strong>"{auditData.scenarios.reject.clicked}"</Text></Text>
                    <div style={{ marginTop: 12 }}>
                      <Text strong>Post-reject tracking: </Text>
                      {(auditData.scenarios.reject.postTracking || []).length === 0
                        ? <Tag color="success">Clean — no tracking after rejection ✓</Tag>
                        : (
                          <div>
                            <Tag color="error">{auditData.scenarios.reject.postTracking.length} tracking request(s) AFTER rejection!</Tag>
                            <div style={{ marginTop: 8 }}>
                              {auditData.scenarios.reject.postTracking.map((r: any, i: number) => (
                                <div key={i} style={{ marginBottom: 2 }}>
                                  <Tag color="error">{r.labels.join(', ')}</Tag>
                                  <Text type="secondary" style={{ fontSize: 11 }}>{r.url?.substring(0, 80)}</Text>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                ) : (
                  <Text type="secondary">Could not find "Reject" button</Text>
                ),
              }] : []),
            ]}
          />

          {/* ═══════════════════════════════════════════════════════════
              4. METADATA
             ═══════════════════════════════════════════════════════════ */}
          <Card style={cardStyle} styles={{ body: { padding: '12px 24px' } }}>
            <Space split={<Divider type="vertical" />} wrap>
              <Space>
                <ClockCircleOutlined style={{ color: '#64748b' }} />
                <Text type="secondary">{t('gdpr.metadata.scannedAt')}: {new Date(latestReport.created_at).toLocaleString()}</Text>
              </Space>
              <Text type="secondary" style={{ fontSize: 12 }}>URL: {auditData.url}</Text>
              <Tag color={auditData.mode === 'full' ? 'purple' : 'blue'}>
                {auditData.mode === 'full' ? t('gdpr.full') : t('gdpr.quick')} {t('gdpr.metadata.mode')}
              </Tag>
              {auditData.duration && (
                <Text type="secondary" style={{ fontSize: 12 }}>{t('gdpr.metadata.duration')}: {t('gdpr.metadata.seconds', { count: Math.round(auditData.duration / 1000) })}</Text>
              )}
            </Space>
          </Card>
        </>
      )}
    </div>
  );
}
