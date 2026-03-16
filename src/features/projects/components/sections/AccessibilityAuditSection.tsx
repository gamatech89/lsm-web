/**
 * Accessibility Audit Section — WCAG 2.1 Level AA
 *
 * Uses axe-core via Puppeteer to scan websites for accessibility violations.
 * Supports AI-enhanced analysis via screenshot + summary.
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
  App,
  Statistic,
  Spin,
  Result,
  Progress,
  Tooltip,
  Collapse,
  Descriptions,
} from 'antd';

const { Text, Title } = Typography;
import {
  EyeOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  GlobalOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  FileSearchOutlined,
  ExperimentOutlined,
  DownloadOutlined,
  SaveOutlined,
  BgColorsOutlined,
  FontSizeOutlined,
  AimOutlined,
  AudioOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useThemeStore } from '@/stores/theme';
import { useTranslation } from 'react-i18next';

interface AccessibilityAuditSectionProps {
  project: any;
}

export default function AccessibilityAuditSection({ project }: AccessibilityAuditSectionProps) {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';
  const { t, i18n } = useTranslation();

  const cardStyle = {
    borderRadius: 12,
    background: isDark ? '#1e293b' : '#fff',
    border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
  };

  const { data: latestReport, isLoading: loadingReport } = useQuery({
    queryKey: ['accessibility-audit', project.id],
    queryFn: () => apiClient.get(`/projects/${project.id}/accessibility-audit`).then((r) => r.data?.data),
    enabled: !!project.id,
    staleTime: 1000 * 60 * 5,
  });

  const runAuditMutation = useMutation({
    mutationFn: () => apiClient.post(`/projects/${project.id}/accessibility-audit`, { locale: i18n.language?.startsWith('de') ? 'de' : 'en' }),
    onSuccess: () => {
      message.success(t('accessibility.auditComplete', 'Accessibility audit completed!'));
      queryClient.invalidateQueries({ queryKey: ['accessibility-audit', project.id] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || t('accessibility.auditFailed', 'Failed to run accessibility audit'));
    },
  });

  const saveToReportsMutation = useMutation({
    mutationFn: () => apiClient.post(`/projects/${project.id}/accessibility-audit/${latestReport?.id}/save-report`),
    onSuccess: () => {
      message.success(t('accessibility.reportSaved', 'Report saved'));
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || t('accessibility.reportSaveError', 'Failed to save report'));
    },
  });

  const handleDownloadPdf = async () => {
    if (!latestReport?.id) return;
    try {
      const response = await apiClient.get(
        `/projects/${project.id}/accessibility-audit/${latestReport.id}/pdf`,
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `accessibility-audit-${project.name || project.id}-${new Date().toISOString().slice(0, 10)}.pdf`);
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
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>{t('accessibility.noUrl', 'No website URL configured')}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>{t('accessibility.noUrlHint', 'Add a URL to enable accessibility auditing')}</Text>
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
    if (s >= 80) return t('accessibility.score.accessible', 'Accessible');
    if (s >= 50) return t('accessibility.score.needsWork', 'Needs Improvement');
    return t('accessibility.score.criticalIssues', 'Critical Issues');
  };
  const getImpactIcon = (impact: string) => {
    if (impact === 'critical') return <CloseCircleOutlined style={{ color: '#ef4444', fontSize: 18 }} />;
    if (impact === 'serious') return <WarningOutlined style={{ color: '#f97316', fontSize: 18 }} />;
    if (impact === 'moderate') return <WarningOutlined style={{ color: '#f59e0b', fontSize: 18 }} />;
    return <InfoCircleOutlined style={{ color: '#94a3b8', fontSize: 18 }} />;
  };
  const getImpactColor = (impact: string) => {
    if (impact === 'critical') return 'red';
    if (impact === 'serious') return 'volcano';
    if (impact === 'moderate') return 'orange';
    return 'default';
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Color & Contrast': return <BgColorsOutlined />;
      case 'Images': return <EyeOutlined />;
      case 'Forms': return <FileSearchOutlined />;
      case 'Structure & Semantics': return <FontSizeOutlined />;
      case 'Navigation': return <AimOutlined />;
      case 'Media': return <AudioOutlined />;
      default: return <InfoCircleOutlined />;
    }
  };

  return (
    <div style={{ padding: '24px 0' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle" gutter={[16, 12]}>
          <Col>
            <Space direction="vertical" size={4}>
              <Title level={5} style={{ margin: 0 }}>
                <EyeOutlined style={{ marginRight: 8, color: '#0891b2' }} />
                {t('accessibility.title', 'Accessibility Audit')}
              </Title>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {t('accessibility.subtitle', 'WCAG 2.1 Level AA compliance check')}
              </Text>
            </Space>
          </Col>
          <Col>
            <Space size={12}>
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                loading={runAuditMutation.isPending}
                onClick={() => runAuditMutation.mutate()}
                style={{ background: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)', border: 'none' }}
              >
                {auditData
                  ? t('accessibility.rerunAudit', 'Re-run Audit')
                  : t('accessibility.runAudit', 'Run Audit')}
              </Button>
              {auditData && latestReport?.id && (
                <>
                  <Button icon={<DownloadOutlined />} onClick={handleDownloadPdf}>
                    {t('accessibility.pdf', 'PDF')}
                  </Button>
                  <Button
                    icon={<SaveOutlined />}
                    loading={saveToReportsMutation.isPending}
                    onClick={() => saveToReportsMutation.mutate()}
                  >
                    {t('accessibility.saveToReports', 'Save to Reports')}
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
              {t('accessibility.running.title', 'Running Accessibility Audit...')}
            </Text>
          </div>
          <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
            {t('accessibility.running.subtitle', 'Scanning for WCAG 2.1 violations — this may take 15-20 seconds')}
          </Text>
        </Card>
      )}

      {/* No audit yet */}
      {!auditData && !runAuditMutation.isPending && (
        <Result
          icon={<EyeOutlined style={{ color: '#0891b2' }} />}
          title={t('accessibility.noAudit.title', 'No accessibility audit yet')}
          subTitle={t('accessibility.noAudit.description', 'Run an audit to check this website for WCAG 2.1 Level AA accessibility violations')}
          extra={
            <Button
              type="primary"
              size="large"
              icon={<EyeOutlined />}
              onClick={() => runAuditMutation.mutate()}
              style={{ background: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)', border: 'none' }}
            >
              {t('accessibility.runAudit', 'Run Audit')} (~15-20s)
            </Button>
          }
        />
      )}

      {/* ─── Results ─────────────────────────────────────────── */}
      {auditData && !runAuditMutation.isPending && (
        <>
          {/* Badges */}
          <div style={{ marginBottom: 16 }}>
            <Space>
              <Tag color="cyan" style={{ fontSize: 12, padding: '2px 8px' }}>
                ♿ WCAG 2.1 {auditData.wcagLevel || 'AA'}
              </Tag>
              {auditData.aiEnhanced ? (
                <Tag color="geekblue" style={{ fontSize: 12, padding: '2px 8px' }}>🤖 {t('accessibility.badges.aiEnhanced', 'AI-Enhanced')}</Tag>
              ) : (
                <Tag style={{ fontSize: 12, padding: '2px 8px' }}>⚙️ {t('accessibility.badges.automatedScan', 'Automated Scan')}</Tag>
              )}
            </Space>
          </div>

          {/* ═══ 1. SCORE HERO ═══ */}
          <Card
            style={{
              ...cardStyle,
              marginBottom: 24,
              background: isDark
                ? 'linear-gradient(135deg, rgba(8, 145, 178, 0.12) 0%, rgba(6, 182, 212, 0.08) 100%)'
                : 'linear-gradient(135deg, rgba(8, 145, 178, 0.06) 0%, rgba(6, 182, 212, 0.04) 100%)',
              borderColor: isDark ? '#0e747044' : '#cffafe',
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
                  <Col xs={12} sm={6}>
                    <div
                      style={{
                        ...cardStyle,
                        borderTop: `3px solid ${(auditData.summary?.totalViolations || 0) > 0 ? '#ef4444' : '#22c55e'}`,
                        textAlign: 'center',
                        padding: '16px 12px',
                      }}
                    >
                      <CloseCircleOutlined style={{ fontSize: 24, color: (auditData.summary?.totalViolations || 0) > 0 ? '#ef4444' : '#22c55e', marginBottom: 4 }} />
                      <Statistic value={auditData.summary?.totalViolations || 0} valueStyle={{ fontSize: 24, fontWeight: 700 }} />
                      <Text type="secondary" style={{ fontSize: 11 }}>{t('accessibility.stats.violations', 'Violations')}</Text>
                    </div>
                  </Col>

                  <Col xs={12} sm={6}>
                    <div
                      style={{
                        ...cardStyle,
                        borderTop: `3px solid ${(auditData.summary?.impactCounts?.critical || 0) > 0 ? '#ef4444' : '#22c55e'}`,
                        textAlign: 'center',
                        padding: '16px 12px',
                      }}
                    >
                      <ExclamationCircleOutlined style={{ fontSize: 24, color: (auditData.summary?.impactCounts?.critical || 0) > 0 ? '#ef4444' : '#22c55e', marginBottom: 4 }} />
                      <Statistic value={auditData.summary?.impactCounts?.critical || 0} valueStyle={{ fontSize: 24, fontWeight: 700 }} />
                      <Text type="secondary" style={{ fontSize: 11 }}>{t('accessibility.stats.critical', 'Critical')}</Text>
                    </div>
                  </Col>

                  <Col xs={12} sm={6}>
                    <div
                      style={{
                        ...cardStyle,
                        borderTop: `3px solid ${(auditData.summary?.impactCounts?.serious || 0) > 0 ? '#f97316' : '#22c55e'}`,
                        textAlign: 'center',
                        padding: '16px 12px',
                      }}
                    >
                      <WarningOutlined style={{ fontSize: 24, color: (auditData.summary?.impactCounts?.serious || 0) > 0 ? '#f97316' : '#22c55e', marginBottom: 4 }} />
                      <Statistic value={auditData.summary?.impactCounts?.serious || 0} valueStyle={{ fontSize: 24, fontWeight: 700 }} />
                      <Text type="secondary" style={{ fontSize: 11 }}>{t('accessibility.stats.serious', 'Serious')}</Text>
                    </div>
                  </Col>

                  <Col xs={12} sm={6}>
                    <div
                      style={{
                        ...cardStyle,
                        borderTop: '3px solid #22c55e',
                        textAlign: 'center',
                        padding: '16px 12px',
                      }}
                    >
                      <CheckCircleOutlined style={{ fontSize: 24, color: '#22c55e', marginBottom: 4 }} />
                      <Statistic value={auditData.summary?.totalPasses || 0} valueStyle={{ fontSize: 24, fontWeight: 700 }} />
                      <Text type="secondary" style={{ fontSize: 11 }}>{t('accessibility.stats.passed', 'Passed')}</Text>
                    </div>
                  </Col>
                </Row>
              </Col>
            </Row>
          </Card>

          {/* Issues Alert */}
          {auditData.issues && auditData.issues.length > 0 && (
            <div
              style={{
                marginBottom: 16,
                borderRadius: 8,
                padding: '12px 16px',
                background: isDark
                  ? (score >= 80 ? 'rgba(8, 145, 178, 0.1)' : score >= 50 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)')
                  : (score >= 80 ? '#ecfeff' : score >= 50 ? '#fffbe6' : '#fff2f0'),
                border: `1px solid ${score >= 80 ? (isDark ? 'rgba(8, 145, 178, 0.3)' : '#a5f3fc') : score >= 50 ? (isDark ? 'rgba(245, 158, 11, 0.25)' : '#ffe58f') : (isDark ? 'rgba(239, 68, 68, 0.25)' : '#ffccc7')}`,
              }}
            >
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <ExclamationCircleOutlined style={{ color: score >= 80 ? '#0891b2' : score >= 50 ? '#f59e0b' : '#ef4444', marginTop: 3 }} />
                <div>
                  <Text strong>{auditData.issues.length} issue(s) detected</Text>
                  <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
                    {auditData.issues.map((issue: string, i: number) => (
                      <li key={i} style={{ marginBottom: 4 }}>{issue}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* ═══ 2. AI ANALYSIS ═══ */}
          {auditData.aiSummary && (
            <Card
              title={
                <Space>
                  <ExperimentOutlined style={{ color: '#0891b2' }} />
                  <span>{t('accessibility.ai.title', 'AI Accessibility Analysis')}</span>
                  <Tag color={
                    auditData.aiSummary.verdict === 'Accessible' ? 'success' :
                    auditData.aiSummary.verdict === 'Partially Accessible' ? 'warning' :
                    'error'
                  }>
                    {auditData.aiSummary.verdict}
                  </Tag>
                </Space>
              }
              style={{ ...cardStyle, marginBottom: 24 }}
            >
              {/* Summary text */}
              <div
                style={{
                  marginBottom: 16,
                  borderRadius: 8,
                  padding: '12px 16px',
                  display: 'flex',
                  gap: 8,
                  alignItems: 'flex-start',
                  background: isDark
                    ? ((auditData.aiSummary.score ?? 0) >= 80 ? 'rgba(34, 197, 94, 0.1)' : (auditData.aiSummary.score ?? 0) >= 50 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)')
                    : ((auditData.aiSummary.score ?? 0) >= 80 ? '#f6ffed' : (auditData.aiSummary.score ?? 0) >= 50 ? '#fffbe6' : '#fff2f0'),
                  border: `1px solid ${(auditData.aiSummary.score ?? 0) >= 80 ? (isDark ? 'rgba(34, 197, 94, 0.25)' : '#b7eb8f') : (auditData.aiSummary.score ?? 0) >= 50 ? (isDark ? 'rgba(245, 158, 11, 0.25)' : '#ffe58f') : (isDark ? 'rgba(239, 68, 68, 0.25)' : '#ffccc7')}`,
                }}
              >
                {(auditData.aiSummary.score ?? 0) >= 80
                  ? <CheckCircleOutlined style={{ color: '#22c55e', marginTop: 3, flexShrink: 0 }} />
                  : (auditData.aiSummary.score ?? 0) >= 50
                    ? <WarningOutlined style={{ color: '#f59e0b', marginTop: 3, flexShrink: 0 }} />
                    : <CloseCircleOutlined style={{ color: '#ef4444', marginTop: 3, flexShrink: 0 }} />}
                <Text>{auditData.aiSummary.summary}</Text>
              </div>

              {/* Violations */}
              {auditData.aiSummary.violations?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>
                    <WarningOutlined style={{ color: '#ef4444', marginRight: 6 }} />
                    {t('accessibility.ai.violations', 'Violations')} ({auditData.aiSummary.violations.length})
                  </Text>
                  <Table
                    dataSource={auditData.aiSummary.violations.map((v: any, i: number) => ({ ...v, key: i }))}
                    columns={[
                      {
                        title: t('accessibility.ai.impact', 'Impact'),
                        dataIndex: 'severity',
                        key: 'severity',
                        width: 100,
                        render: (s: string) => (
                          <Tag color={s === 'critical' ? 'red' : s === 'serious' ? 'volcano' : s === 'moderate' ? 'orange' : 'default'}>
                            {s}
                          </Tag>
                        ),
                      },
                      { title: t('accessibility.ai.issue', 'Issue'), dataIndex: 'title', key: 'title', width: 200 },
                      { title: t('accessibility.ai.details', 'Details'), dataIndex: 'description', key: 'description' },
                      {
                        title: t('accessibility.ai.wcag', 'WCAG'),
                        dataIndex: 'wcagRef',
                        key: 'wcagRef',
                        width: 180,
                        render: (ref: string) => <Text code style={{ fontSize: 11 }}>{ref}</Text>,
                      },
                      { title: t('accessibility.ai.fix', 'Fix'), dataIndex: 'recommendation', key: 'recommendation', width: 250 },
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
                    {t('accessibility.ai.whatsRight', "What's Done Right")}
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
                    <InfoCircleOutlined style={{ color: '#0891b2', marginRight: 6 }} />
                    {t('accessibility.ai.recommendations', 'Recommendations')}
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

          {/* ═══ 3. TECHNICAL DETAILS ═══ */}
          <Collapse
            defaultActiveKey={['violations']}
            style={{ marginBottom: 24, borderRadius: 12, overflow: 'hidden' }}
            items={[
              // Violations by Category
              ...(auditData.violationsByCategory && Object.keys(auditData.violationsByCategory).length > 0 ? [{
                key: 'violations',
                label: (
                  <Space>
                    <CloseCircleOutlined style={{ color: '#ef4444' }} />
                    <span>{t('accessibility.sections.violationsByCategory', 'Violations by Category')}</span>
                    <Tag color="error">{auditData.summary?.totalViolations || 0}</Tag>
                  </Space>
                ),
                children: (
                  <div>
                    {Object.entries(auditData.violationsByCategory).map(([category, violations]: [string, any]) => (
                      <div key={category} style={{ marginBottom: 16 }}>
                        <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>
                          {getCategoryIcon(category)} <span style={{ marginLeft: 6 }}>{category}</span>
                          <Tag style={{ marginLeft: 8 }}>{violations.length}</Tag>
                        </Text>
                        <Table
                          dataSource={violations.map((v: any, i: number) => ({ ...v, key: `${category}-${i}` }))}
                          columns={[
                            {
                              title: t('accessibility.ai.impact', 'Impact'), dataIndex: 'impact', key: 'impact', width: 90, align: 'center' as const,
                              render: (impact: string) => getImpactIcon(impact),
                            },
                            {
                              title: t('accessibility.table.rule', 'Rule'), dataIndex: 'help', key: 'help',
                              render: (help: string, record: any) => (
                                <div>
                                  <Text strong>{help}</Text>
                                  {record.wcag?.length > 0 && (
                                    <div style={{ marginTop: 4 }}>
                                      {record.wcag.map((w: string, wi: number) => (
                                        <Tag key={wi} color="cyan" style={{ fontSize: 10, marginBottom: 2 }}>
                                          WCAG {w}
                                        </Tag>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ),
                            },
                            {
                              title: t('accessibility.table.elements', 'Elements'), dataIndex: 'nodeCount', key: 'nodeCount', width: 80, align: 'center' as const,
                              render: (count: number) => <Tag>{count}</Tag>,
                            },
                            {
                              title: t('accessibility.table.example', 'Example'), key: 'example', width: 250,
                              render: (_: any, record: any) => record.nodes?.[0]?.html ? (
                                <Tooltip title={record.nodes[0].html}>
                                  <Text code style={{ fontSize: 10, wordBreak: 'break-all' }}>
                                    {record.nodes[0].html.length > 80 ? record.nodes[0].html.substring(0, 80) + '…' : record.nodes[0].html}
                                  </Text>
                                </Tooltip>
                              ) : null,
                            },
                          ]}
                          pagination={false}
                          size="small"
                        />
                      </div>
                    ))}
                  </div>
                ),
              }] : []),

              // Custom Checks
              ...(auditData.customChecks?.length > 0 ? [{
                key: 'custom',
                label: (
                  <Space>
                    <FileSearchOutlined />
                    <span>{t('accessibility.sections.customChecks', 'Additional Checks')}</span>
                  </Space>
                ),
                children: (
                  <Table
                    dataSource={auditData.customChecks.map((c: any, i: number) => ({ ...c, key: i }))}
                    columns={[
                      {
                        title: '', dataIndex: 'status', key: 'status', width: 50, align: 'center' as const,
                        render: (s: string) => {
                          if (s === 'pass') return <CheckCircleOutlined style={{ color: '#22c55e', fontSize: 18 }} />;
                          if (s === 'warning') return <WarningOutlined style={{ color: '#f59e0b', fontSize: 18 }} />;
                          return <CloseCircleOutlined style={{ color: '#ef4444', fontSize: 18 }} />;
                        },
                      },
                      { title: t('accessibility.table.check', 'Check'), dataIndex: 'name', key: 'name', width: 180, render: (name: string) => <Text strong>{name}</Text> },
                      { title: t('accessibility.table.details', 'Details'), dataIndex: 'description', key: 'description' },
                      {
                        title: 'WCAG', dataIndex: 'wcag', key: 'wcag', width: 80,
                        render: (wcag: string) => wcag ? <Tag color="cyan" style={{ fontSize: 10 }}>WCAG {wcag}</Tag> : null,
                      },
                    ]}
                    pagination={false}
                    size="small"
                  />
                ),
              }] : []),

              // Passes
              ...(auditData.passes?.length > 0 ? [{
                key: 'passes',
                label: (
                  <Space>
                    <CheckCircleOutlined style={{ color: '#22c55e' }} />
                    <span>{t('accessibility.sections.passed', 'Passed Checks')}</span>
                    <Tag color="success">{auditData.passes.length}</Tag>
                  </Space>
                ),
                children: (
                  <Table
                    dataSource={auditData.passes.map((p: any, i: number) => ({ ...p, key: i }))}
                    columns={[
                      {
                        title: '', key: 'icon', width: 40, align: 'center' as const,
                        render: () => <CheckCircleOutlined style={{ color: '#22c55e', fontSize: 16 }} />,
                      },
                      { title: t('accessibility.table.rule', 'Rule'), dataIndex: 'help', key: 'help', render: (help: string) => <Text>{help}</Text> },
                      { title: t('accessibility.table.category', 'Category'), dataIndex: 'category', key: 'category', width: 150 },
                      {
                        title: t('accessibility.table.elements', 'Elements'), dataIndex: 'nodeCount', key: 'nodeCount', width: 80, align: 'center' as const,
                        render: (count: number) => <Tag color="success">{count}</Tag>,
                      },
                    ]}
                    pagination={false}
                    size="small"
                  />
                ),
              }] : []),

              // Incomplete (needs manual review)
              ...(auditData.incomplete?.length > 0 ? [{
                key: 'incomplete',
                label: (
                  <Space>
                    <InfoCircleOutlined style={{ color: '#f59e0b' }} />
                    <span>{t('accessibility.sections.needsReview', 'Needs Manual Review')}</span>
                    <Tag color="warning">{auditData.incomplete.length}</Tag>
                  </Space>
                ),
                children: (
                  <Table
                    dataSource={auditData.incomplete.map((inc: any, i: number) => ({ ...inc, key: i }))}
                    columns={[
                      {
                        title: t('accessibility.ai.impact', 'Impact'), dataIndex: 'impact', key: 'impact', width: 90,
                        render: (impact: string) => <Tag color={getImpactColor(impact)}>{impact}</Tag>,
                      },
                      { title: t('accessibility.table.rule', 'Rule'), dataIndex: 'help', key: 'help' },
                      { title: t('accessibility.table.category', 'Category'), dataIndex: 'category', key: 'category', width: 150 },
                      {
                        title: t('accessibility.table.elements', 'Elements'), dataIndex: 'nodeCount', key: 'nodeCount', width: 80, align: 'center' as const,
                        render: (count: number) => <Tag color="warning">{count}</Tag>,
                      },
                    ]}
                    pagination={false}
                    size="small"
                  />
                ),
              }] : []),
            ]}
          />

          {/* Audit timestamp */}
          {auditData.timestamp && (
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t('accessibility.lastAudit', 'Last audited')}: {new Date(auditData.timestamp).toLocaleString()}
              </Text>
            </div>
          )}
        </>
      )}
    </div>
  );
}
