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
  DatabaseOutlined,
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

interface GdprAuditSectionProps {
  project: any;
}

export default function GdprAuditSection({ project }: GdprAuditSectionProps) {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [auditMode, setAuditMode] = useState<'quick' | 'full'>('quick');


  const { data: latestReport, isLoading: loadingReport } = useQuery({
    queryKey: ['gdpr-audit', project.id],
    queryFn: () => apiClient.get(`/projects/${project.id}/gdpr-audit`).then((r) => r.data?.data),
    enabled: !!project.id,
    staleTime: 1000 * 60 * 5,
  });

  const runAuditMutation = useMutation({
    mutationFn: (mode: string) => apiClient.post(`/projects/${project.id}/gdpr-audit`, { mode }),
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
      message.success('GDPR audit saved to project reports!');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to save report');
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

  const getScoreColor = (s: number) => s >= 80 ? '#22c55e' : s >= 50 ? '#f59e0b' : '#ef4444';
  const getScoreLabel = (s: number) => s >= 80 ? 'Good' : s >= 50 ? 'Needs Improvement' : 'Critical Issues';
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
                GDPR Audit
              </Title>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Headless browser scan for cookies, trackers & consent compliance
              </Text>
            </Space>
          </Col>
          <Col>
            <Space size={12}>
              <Segmented
                value={auditMode}
                onChange={(v) => setAuditMode(v as 'quick' | 'full')}
                options={[
                  { label: <span><ThunderboltOutlined /> Quick</span>, value: 'quick' },
                  { label: <span><ExperimentOutlined /> Full</span>, value: 'full' },
                ]}
              />
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                loading={runAuditMutation.isPending}
                onClick={() => runAuditMutation.mutate(auditMode)}
                style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', border: 'none' }}
              >
                {auditData ? 'Re-run' : 'Run'} {auditMode === 'full' ? 'Full' : 'Quick'} Audit
              </Button>
              {auditData && latestReport?.id && (
                <>
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={handleDownloadPdf}
                  >
                    PDF
                  </Button>
                  <Button
                    icon={<SaveOutlined />}
                    loading={saveToReportsMutation.isPending}
                    onClick={() => saveToReportsMutation.mutate()}
                  >
                    Save to Reports
                  </Button>
                </>
              )}
            </Space>
          </Col>
        </Row>
        {auditMode === 'full' && (
          <Alert
            type="info"
            showIcon
            icon={<InfoCircleOutlined />}
            message="Full mode runs 4 scenarios in isolated browser contexts: pre-consent, banner UI analysis, accept-all flow, and reject flow (~45s)"
            style={{ marginTop: 12, borderRadius: 8 }}
          />
        )}
      </div>

      {/* Running */}
      {runAuditMutation.isPending && (
        <Card style={{ borderRadius: 12, textAlign: 'center', padding: 40, marginBottom: 16 }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text strong style={{ fontSize: 16 }}>
              Running {auditMode === 'full' ? 'Full' : 'Quick'} Audit on {project.url}...
            </Text>
          </div>
          <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
            {auditMode === 'full'
              ? 'Running 4 browser scenarios: pre-consent, banner UI, accept-all, reject. This takes ~45 seconds.'
              : 'Checking pre-consent tracking. This takes ~15 seconds.'}
          </Text>
        </Card>
      )}

      {/* No audit yet */}
      {!auditData && !runAuditMutation.isPending && (
        <Result
          icon={<FileSearchOutlined style={{ color: '#6366f1' }} />}
          title="No GDPR audit yet"
          subTitle="Run a quick or full audit to check your website's GDPR compliance."
          extra={
            <Space direction="vertical" size={12} align="center">
              <Space size={12}>
                <Button
                  type="primary"
                  size="large"
                  icon={<ThunderboltOutlined />}
                  onClick={() => runAuditMutation.mutate('quick')}
                  style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', border: 'none' }}
                >
                  Quick Audit (~15s)
                </Button>
                <Button
                  size="large"
                  icon={<ExperimentOutlined />}
                  onClick={() => runAuditMutation.mutate('full')}
                >
                  Full Audit (~45s)
                </Button>
              </Space>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Quick checks pre-consent tracking only. Full adds accept/reject flow testing & banner UI analysis.
              </Text>
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
                {auditData.mode === 'full' ? '🔬 Full Audit' : '⚡ Quick Audit'}
              </Tag>
              {auditData.aiEnhanced ? (
                <Tag color="geekblue" style={{ fontSize: 12, padding: '2px 8px' }}>🤖 AI-Enhanced</Tag>
              ) : (
                <Tag style={{ fontSize: 12, padding: '2px 8px' }}>⚙️ Basic Scan</Tag>
              )}
            </Space>
          </div>

          {/* ─── AI Summary ─────────────────────────────────── */}
          {auditData.aiSummary && (
            <Card
              title={
                <Space>
                  <ExperimentOutlined style={{ color: '#6366f1' }} />
                  <span>AI Compliance Analysis</span>
                  <Tag color={
                    auditData.aiSummary.verdict === 'Compliant' ? 'success' :
                    auditData.aiSummary.verdict === 'Partially Compliant' ? 'warning' :
                    'error'
                  }>
                    {auditData.aiSummary.verdict}
                  </Tag>
                </Space>
              }
              style={{ borderRadius: 12, marginBottom: 16 }}
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
                    Violations ({auditData.aiSummary.violations.length})
                  </Text>
                  <Table
                    dataSource={auditData.aiSummary.violations.map((v: any, i: number) => ({ ...v, key: i }))}
                    columns={[
                      {
                        title: 'Severity',
                        dataIndex: 'severity',
                        key: 'severity',
                        width: 100,
                        render: (s: string) => (
                          <Tag color={s === 'critical' ? 'red' : s === 'high' ? 'volcano' : s === 'medium' ? 'orange' : 'default'}>
                            {s}
                          </Tag>
                        ),
                      },
                      { title: 'Issue', dataIndex: 'title', key: 'title', width: 200 },
                      { title: 'Details', dataIndex: 'description', key: 'description' },
                      {
                        title: 'Legal Ref',
                        dataIndex: 'legalRef',
                        key: 'legalRef',
                        width: 180,
                        render: (ref: string) => <Text code style={{ fontSize: 11 }}>{ref}</Text>,
                      },
                      { title: 'Fix', dataIndex: 'recommendation', key: 'recommendation', width: 250 },
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
                    What's Done Right
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
                    Recommendations
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

          {/* Score + Summary */}
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={8} md={6}>
              <Card style={{ borderRadius: 12, textAlign: 'center', height: '100%' }}>
                <Progress
                  type="circle"
                  percent={auditData.aiSummary?.score ?? auditData.score ?? 0}
                  size={80}
                  strokeColor={getScoreColor(auditData.aiSummary?.score ?? auditData.score ?? 0)}
                  format={(p) => `${p}`}
                />
                <div style={{ marginTop: 10 }}>
                  <Tag
                    color={(auditData.aiSummary?.score ?? auditData.score ?? 0) >= 80 ? 'success' : (auditData.aiSummary?.score ?? auditData.score ?? 0) >= 50 ? 'warning' : 'error'}
                    style={{ fontSize: 12, padding: '2px 8px' }}
                  >
                    {getScoreLabel(auditData.aiSummary?.score ?? auditData.score ?? 0)}
                  </Tag>
                </div>
              </Card>
            </Col>

            <Col xs={12} sm={4} md={4}>
              <Card style={{ borderRadius: 12, textAlign: 'center', height: '100%' }}>
                <BugOutlined style={{ fontSize: 28, color: (auditData.summary?.trackingRequests || 0) > 0 ? '#ef4444' : '#22c55e', marginBottom: 6 }} />
                <Statistic value={auditData.summary?.trackingRequests || 0} valueStyle={{ fontSize: 22, fontWeight: 700 }} />
                <Text type="secondary" style={{ fontSize: 11 }}>Trackers</Text>
              </Card>
            </Col>

            <Col xs={12} sm={4} md={4}>
              <Card style={{ borderRadius: 12, textAlign: 'center', height: '100%' }}>
                <LockOutlined style={{ fontSize: 28, color: (auditData.summary?.trackingCookies || 0) > 0 ? '#ef4444' : '#22c55e', marginBottom: 6 }} />
                <Statistic value={auditData.summary?.trackingCookies || 0} valueStyle={{ fontSize: 22, fontWeight: 700 }} />
                <Text type="secondary" style={{ fontSize: 11 }}>Tracking Cookies</Text>
              </Card>
            </Col>

            <Col xs={12} sm={4} md={5}>
              <Card style={{ borderRadius: 12, textAlign: 'center', height: '100%' }}>
                {auditData.summary?.cookieBannerDetected ? (
                  <CheckCircleOutlined style={{ fontSize: 28, color: '#22c55e', marginBottom: 6 }} />
                ) : (
                  <CloseCircleOutlined style={{ fontSize: 28, color: '#ef4444', marginBottom: 6 }} />
                )}
                <div><Text strong style={{ fontSize: 13 }}>{auditData.summary?.cookieBannerDetected ? 'Detected' : 'Not Found'}</Text></div>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Banner {auditData.summary?.cookieBannerSolution?.length > 0 && `(${auditData.summary.cookieBannerSolution.join(', ')})`}
                </Text>
              </Card>
            </Col>

            {/* Accept/Reject flow cards (full mode) */}
            {auditData.summary?.acceptFlowWorks !== null && auditData.summary?.acceptFlowWorks !== undefined && (
              <Col xs={12} sm={4} md={5}>
                <Card style={{ borderRadius: 12, textAlign: 'center', height: '100%' }}>
                  <Space direction="vertical" size={4}>
                    <div>
                      {auditData.summary.acceptFlowWorks
                        ? <CheckOutlined style={{ fontSize: 22, color: '#22c55e' }} />
                        : <WarningOutlined style={{ fontSize: 22, color: '#f59e0b' }} />}
                    </div>
                    <Text strong style={{ fontSize: 12 }}>Accept Flow</Text>
                    <Tag color={auditData.summary.acceptFlowWorks ? 'success' : 'warning'} style={{ fontSize: 11 }}>
                      {auditData.summary.acceptFlowWorks ? 'Working' : 'No activity'}
                    </Tag>
                    {auditData.summary.rejectFlowClean !== null && (
                      <>
                        <div style={{ marginTop: 4 }}>
                          {auditData.summary.rejectFlowClean
                            ? <CheckOutlined style={{ fontSize: 22, color: '#22c55e' }} />
                            : <StopOutlined style={{ fontSize: 22, color: '#ef4444' }} />}
                        </div>
                        <Text strong style={{ fontSize: 12 }}>Reject Flow</Text>
                        <Tag color={auditData.summary.rejectFlowClean ? 'success' : 'error'} style={{ fontSize: 11 }}>
                          {auditData.summary.rejectFlowClean ? 'Clean' : 'Leaking!'}
                        </Tag>
                      </>
                    )}
                  </Space>
                </Card>
              </Col>
            )}
          </Row>

          {/* Issues */}
          {auditData.issues && auditData.issues.length > 0 && (
            <Alert
              type={(auditData.score ?? 0) >= 80 ? 'info' : (auditData.score ?? 0) >= 50 ? 'warning' : 'error'}
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

          {/* Audit Checks Table */}
          {auditData.checks && auditData.checks.length > 0 && (
            <Card
              title={<Space><EyeOutlined /><span>Audit Checks</span></Space>}
              style={{ borderRadius: 12, marginBottom: 16 }}
            >
              <Table
                dataSource={auditData.checks.map((c: any, i: number) => ({ ...c, key: i }))}
                columns={[
                  { title: 'Check', dataIndex: 'name', key: 'name', width: 220, render: (name: string) => <Text strong>{name}</Text> },
                  { title: 'Status', dataIndex: 'status', key: 'status', width: 80, align: 'center' as const, render: (s: string) => getCheckIcon(s) },
                  {
                    title: 'Details', dataIndex: 'details', key: 'details',
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
            </Card>
          )}

          {/* Banner Analysis (full mode) */}
          {auditData.cookieBanner && (
            <Card
              title={<Space><GlobalOutlined /><span>Cookie Banner Analysis</span></Space>}
              style={{ borderRadius: 12, marginBottom: 16 }}
            >
              <Descriptions bordered size="small" column={1}>
                <Descriptions.Item label="Detected">
                  {auditData.cookieBanner.detected
                    ? <Tag color="success">Yes</Tag>
                    : <Tag color="error">No</Tag>}
                </Descriptions.Item>
                {auditData.cookieBanner.solution && (
                  <Descriptions.Item label="Solution">
                    <Tag color="blue">{auditData.cookieBanner.solution}</Tag>
                  </Descriptions.Item>
                )}
              </Descriptions>

              {/* Banner buttons */}
              {auditData.cookieBanner.buttons && auditData.cookieBanner.buttons.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>Consent Buttons</Text>
                  <Table
                    dataSource={auditData.cookieBanner.buttons.map((b: any, i: number) => ({ ...b, key: i }))}
                    columns={[
                      { title: 'Text', dataIndex: 'text', key: 'text', render: (t: string) => <Text strong>{t}</Text> },
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
                    showHeader={true}
                  />
                </div>
              )}

              {/* Checkboxes */}
              {auditData.cookieBanner.checkboxes && auditData.cookieBanner.checkboxes.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>Consent Checkboxes</Text>
                  <Table
                    dataSource={auditData.cookieBanner.checkboxes.map((cb: any, i: number) => ({ ...cb, key: i }))}
                    columns={[
                      { title: 'Label', dataIndex: 'label', key: 'label' },
                      {
                        title: 'Pre-checked', dataIndex: 'checked', key: 'checked', width: 100, align: 'center' as const,
                        render: (v: boolean) => v ? <Tag color="blue">Yes</Tag> : <Tag>No</Tag>,
                      },
                      {
                        title: 'Disabled', dataIndex: 'disabled', key: 'disabled', width: 90, align: 'center' as const,
                        render: (v: boolean) => v ? <Tag>Yes</Tag> : <Tag>No</Tag>,
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
            </Card>
          )}

          {/* Tracking Services */}
          {auditData.trackingByService && Object.keys(auditData.trackingByService).length > 0 && (
            <Card
              title={<Space><BugOutlined /><span>Tracking Services (pre-consent)</span><Tag color="error">{Object.keys(auditData.trackingByService).length}</Tag></Space>}
              style={{ borderRadius: 12, marginBottom: 16 }}
            >
              <Table
                dataSource={Object.entries(auditData.trackingByService).map(([service, info]: [string, any]) => ({ key: service, service, ...info }))}
                columns={[
                  { title: 'Service', dataIndex: 'service', key: 'service', render: (n: string) => <Text strong>{n}</Text> },
                  {
                    title: 'Severity', dataIndex: 'severity', key: 'severity', width: 100, align: 'center' as const,
                    render: (s: string) => <Tag color={s === 'critical' ? 'error' : 'warning'}>{s === 'critical' ? 'Critical' : 'Warning'}</Tag>,
                  },
                  { title: 'Requests', dataIndex: 'count', key: 'count', width: 90, align: 'center' as const },
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
            </Card>
          )}

          {/* Cookies */}
          {(auditData.cookies || []).length > 0 && (
            <Card
              title={<Space><LockOutlined /><span>All Cookies</span><Tag>{auditData.cookies.length}</Tag></Space>}
              style={{ borderRadius: 12, marginBottom: 16 }}
            >
              <Table
                dataSource={auditData.cookies.map((c: any, i: number) => ({ ...c, key: `${c.name}-${i}` }))}
                columns={[
                  { title: 'Name', dataIndex: 'name', key: 'name', render: (n: string) => <Text strong code>{n}</Text> },
                  {
                    title: 'Type', key: 'type', width: 130,
                    render: (_: any, record: any) => {
                      const cls = record.classification;
                      if (cls?.type === 'tracking') return <Tag color="error">{cls.service}</Tag>;
                      return <Tag>Other</Tag>;
                    },
                  },
                  { title: 'Domain', dataIndex: 'domain', key: 'domain', render: (d: string) => <Text type="secondary" style={{ fontSize: 12 }}>{d}</Text> },
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
            </Card>
          )}

          {/* Accept/Reject scenario details (full mode) */}
          {auditData.scenarios?.acceptAll && (
            <Card
              title={<Space><CheckOutlined style={{ color: '#22c55e' }} /><span>Accept-All Flow</span></Space>}
              style={{ borderRadius: 12, marginBottom: 16 }}
            >
              {auditData.scenarios.acceptAll.clicked ? (
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
              )}
            </Card>
          )}

          {auditData.scenarios?.reject && (
            <Card
              title={<Space><StopOutlined style={{ color: auditData.summary?.rejectFlowClean ? '#22c55e' : '#ef4444' }} /><span>Reject Flow</span></Space>}
              style={{ borderRadius: 12, marginBottom: 16 }}
            >
              {auditData.scenarios.reject.clicked ? (
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
              )}
            </Card>
          )}

          {/* Metadata */}
          <Card style={{ borderRadius: 12 }}>
            <Space split={<Divider type="vertical" />}>
              <Space>
                <ClockCircleOutlined style={{ color: '#64748b' }} />
                <Text type="secondary">Audited: {new Date(latestReport.created_at).toLocaleString()}</Text>
              </Space>
              <Text type="secondary" style={{ fontSize: 12 }}>URL: {auditData.url}</Text>
              <Tag color={auditData.mode === 'full' ? 'purple' : 'blue'}>
                {auditData.mode === 'full' ? 'Full' : 'Quick'} Mode
              </Tag>
            </Space>
          </Card>
        </>
      )}
    </div>
  );
}
