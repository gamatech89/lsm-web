/**
 * Invoices Page
 *
 * Financial view to manage invoices created from approved timesheets.
 * Shows invoice list with status management (pending, approved, paid).
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Table,
  Button,
  Space,
  Typography,
  Tag,
  Modal,
  App,
  Empty,
  Avatar,
  Select,
  Statistic,
  Row,
  Col,
  Alert,
  Spin,
  DatePicker,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  EyeOutlined,
  FileTextOutlined,
  UserOutlined,
  FileExcelOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs, { Dayjs } from 'dayjs';
import { api } from '@/lib/api';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Invoice = any;

const statusColors: Record<string, string> = {
  draft: 'default',
  pending: 'processing',
  approved: 'success',
  declined: 'error',
  paid: 'purple',
};

// Helper to format duration
const formatDuration = (minutes: number | null | undefined): string => {
  if (!minutes) return '-';
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}:${String(mins).padStart(2, '0')}`;
};

export function InvoicesPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // State
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [developerFilter, setDeveloperFilter] = useState<number | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Check if invoices API is available - but DON'T use early return (violates hooks rules)
  const invoicesApi = api?.invoices;
  const apiAvailable = !!invoicesApi;

  // Build filters object
  const filters: Record<string, string | number | undefined> = {};
  if (statusFilter) filters.status = statusFilter;
  if (dateRange) {
    filters.date_from = dateRange[0].format('YYYY-MM-DD');
    filters.date_to = dateRange[1].format('YYYY-MM-DD');
  }
  if (developerFilter) filters.user_id = developerFilter;

  // Fetch invoices - disabled if API unavailable
  const { data: invoicesData, isLoading, error } = useQuery({
    queryKey: ['invoices', statusFilter, dateRange?.[0]?.valueOf(), dateRange?.[1]?.valueOf(), developerFilter],
    queryFn: async () => {
      const res = await invoicesApi!.list(Object.keys(filters).length > 0 ? filters : undefined);
      return res.data.data?.data || [];
    },
    enabled: apiAvailable,
  });

  // Get unique developers from invoices for filter dropdown
  const developers = invoicesData
    ? Array.from(new Map((invoicesData as Invoice[]).filter((inv: Invoice) => inv?.user).map((inv: Invoice) => [inv.user.id, inv.user])).values())
    : [];

  // Export to CSV function
  const handleExportCSV = () => {
    const invoices = invoicesData || [];
    if (invoices.length === 0) {
      message.warning(t('invoices.messages.noExport'));
      return;
    }

    const headers = ['Invoice #', 'Developer', 'Period Start', 'Period End', 'Hours', 'Amount', 'Status', 'Created'];
    const rows = invoices.map((inv: Invoice) => [
      inv.invoice_number || '',
      inv.user?.name || '',
      inv.period_start ? dayjs(inv.period_start).format('YYYY-MM-DD') : '',
      inv.period_end ? dayjs(inv.period_end).format('YYYY-MM-DD') : '',
      inv.total_hours || 0,
      inv.total_amount || 0,
      inv.status || '',
      inv.created_at ? dayjs(inv.created_at).format('YYYY-MM-DD') : '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row: (string | number)[]) => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `invoices-${dayjs().format('YYYY-MM-DD')}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);

    message.success(t('invoices.messages.exported'));
  };

  // Fetch invoice details
  const { data: invoiceDetails, isFetching: fetchingDetails } = useQuery({
    queryKey: ['invoices', 'detail', selectedInvoice?.id],
    queryFn: async () => {
      const res = await invoicesApi!.get(selectedInvoice!.id);
      return res.data.data;
    },
    enabled: apiAvailable && !!selectedInvoice && detailsOpen,
  });

  // Mutations - wrapped with null checks
  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      if (!invoicesApi) throw new Error('API unavailable');
      const r = await invoicesApi.approve(id);
      return r.data;
    },
    onSuccess: () => {
      message.success(t('invoices.messages.approved'));
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setDetailsOpen(false);
    },
    onError: (err: { response?: { data?: { message?: string } }; message?: string }) => {
      message.error(err.response?.data?.message || err.message || t('invoices.messages.approveError'));
    },
  });

  const declineMutation = useMutation({
    mutationFn: async (id: number) => {
      if (!invoicesApi) throw new Error('API unavailable');
      const r = await invoicesApi.decline(id);
      return r.data;
    },
    onSuccess: () => {
      message.success(t('invoices.messages.declined'));
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setDetailsOpen(false);
    },
    onError: (err: { response?: { data?: { message?: string } }; message?: string }) => {
      message.error(err.response?.data?.message || err.message || t('invoices.messages.declineError'));
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async (id: number) => {
      if (!invoicesApi) throw new Error('API unavailable');
      const r = await invoicesApi.markAsPaid(id);
      return r.data;
    },
    onSuccess: () => {
      message.success(t('invoices.messages.paid'));
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setDetailsOpen(false);
    },
    onError: (err: { response?: { data?: { message?: string } }; message?: string }) => {
      message.error(err.response?.data?.message || err.message || t('invoices.messages.paidError'));
    },
  });

  // Calculate summary - with defensive null checks
  const invoices = invoicesData || [];
  const summary = invoices.reduce(
    (acc: { total: number; pending: number; paid: number }, inv: Invoice) => {
      const amount = Number(inv?.total_amount) || 0;
      acc.total += amount;
      if (inv?.status === 'pending') acc.pending += amount;
      if (inv?.status === 'paid') acc.paid += amount;
      return acc;
    },
    { total: 0, pending: 0, paid: 0 }
  );

  // Table columns - with defensive null checks
  const columns = [
    {
      title: t('invoices.table.invoiceNumber'),
      dataIndex: 'invoice_number',
      key: 'invoice_number',
      render: (num: string | null | undefined) => (
        <Space>
          <FileTextOutlined style={{ color: '#6366f1' }} />
          <Text strong>{num || '-'}</Text>
        </Space>
      ),
    },
    {
      title: t('invoices.table.developer'),
      key: 'user',
      render: (_: unknown, record: Invoice) => (
        <Space>
          <Avatar size="small" style={{ backgroundColor: '#6366f1' }} icon={<UserOutlined />}>
            {record?.user?.name?.charAt?.(0) || '?'}
          </Avatar>
          <Text>{record?.user?.name || 'Unknown'}</Text>
        </Space>
      ),
    },
    {
      title: t('invoices.table.period'),
      key: 'period',
      render: (_: unknown, record: Invoice) => {
        if (!record?.period_start || !record?.period_end) return '-';
        return (
          <Text>
            {dayjs(record.period_start).format('MMM D')} - {dayjs(record.period_end).format('MMM D, YYYY')}
          </Text>
        );
      },
    },
    {
      title: t('invoices.table.hours'),
      dataIndex: 'total_hours',
      key: 'hours',
      render: (hours: number | null | undefined) => <Text>{hours ? formatDuration(hours * 60) : '-'}</Text>,
    },
    {
      title: t('invoices.table.amount'),
      dataIndex: 'total_amount',
      key: 'amount',
      render: (amount: number | null | undefined) => (
        <Text strong style={{ color: '#6366f1' }}>${(Number(amount) || 0).toFixed(2)}</Text>
      ),
    },
    {
      title: t('invoices.table.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string | null | undefined) => {
        if (!status || typeof status !== 'string') return <Tag>-</Tag>;
        const translatedStatus = t(`invoices.status.${status}`, status);
        return <Tag color={statusColors[status] || 'default'}>{translatedStatus.toUpperCase()}</Tag>;
      },
    },
    {
      title: t('invoices.table.actions'),
      key: 'actions',
      width: 200,
      render: (_: unknown, record: Invoice) => (
        <Space>
          <Button
            type="default"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedInvoice(record);
              setDetailsOpen(true);
            }}
          >
            {t('invoices.table.view')}
          </Button>
          {record?.status === 'approved' && (
            <Button
              type="primary"
              size="small"
              icon={<DollarOutlined />}
              onClick={() => markPaidMutation.mutate(record.id)}
              loading={markPaidMutation.isPending}
            >
              {t('invoices.table.pay')}
            </Button>
          )}
        </Space>
      ),
    },
  ];

  // Show error if API unavailable
  if (!apiAvailable) {
    return (
      <div className="page-container">
        <Title level={2}>{t('invoices.title')}</Title>
        <Alert
          type="error"
          message={t('invoices.apiError')}
          description={t('invoices.apiErrorDesc')}
          showIcon
        />
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Error display */}
      {error && (
        <Card style={{ marginBottom: 24, background: '#fff2f0', border: '1px solid #ffccc7' }}>
          <Space>
            <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
            <Text type="danger">{(error as Error).message || 'Failed to load invoices.'}</Text>
          </Space>
        </Card>
      )}

      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <Space>
          <DollarOutlined style={{ fontSize: 24, color: '#6366f1' }} />
          <div>
            <Title level={3} style={{ margin: 0 }}>{t('invoices.title')}</Title>
            <Text type="secondary">{t('invoices.subtitle')}</Text>
          </div>
        </Space>
        <Space wrap>
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs] | null)}
            placeholder={[t('invoices.filters.from'), t('invoices.filters.to')]}
            presets={[
              { label: t('invoices.filters.thisMonth'), value: [dayjs().startOf('month'), dayjs().endOf('month')] },
              { label: t('invoices.filters.lastMonth'), value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
              { label: t('invoices.filters.thisYear'), value: [dayjs().startOf('year'), dayjs().endOf('year')] },
            ]}
          />
          <Select
            placeholder={t('invoices.filters.allDevelopers')}
            allowClear
            style={{ width: 160 }}
            value={developerFilter}
            onChange={setDeveloperFilter}
            options={developers.map((dev: { id: number; name: string }) => ({ label: dev.name, value: dev.id }))}
          />
          <Select
            placeholder={t('invoices.filters.allStatus')}
            allowClear
            style={{ width: 130 }}
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { label: t('invoices.status.pending'), value: 'pending' },
              { label: t('invoices.status.approved'), value: 'approved' },
              { label: t('invoices.status.paid'), value: 'paid' },
              { label: t('invoices.status.declined'), value: 'declined' },
            ]}
          />
          <Button
            icon={<FileExcelOutlined />}
            onClick={handleExportCSV}
            disabled={!invoices.length}
          >
            {t('invoices.actions.exportCsv')}
          </Button>
        </Space>
      </div>

      {/* Summary Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title={t('invoices.stats.totalInvoiced')}
              value={summary.total}
              prefix="$"
              precision={2}
              valueStyle={{ color: '#6366f1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title={t('invoices.stats.pendingPayment')}
              value={summary.pending}
              prefix="$"
              precision={2}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title={t('invoices.stats.paid')}
              value={summary.paid}
              prefix="$"
              precision={2}
              valueStyle={{ color: '#22c55e' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Invoices Table */}
      <Card>
        <Spin spinning={isLoading}>
          <Table
            scroll={{ x: 900 }}
            columns={columns}
            dataSource={invoices}
            rowKey="id"
            loading={isLoading}
            pagination={{ pageSize: 10 }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={t('invoices.noInvoices')}
                />
              ),
            }}
          />
        </Spin>
      </Card>

      {/* Invoice Details Modal */}
      <Modal
        title={
          <Space>
            <FileTextOutlined style={{ color: '#6366f1' }} />
            <span>{invoiceDetails?.invoice_number || t('invoices.details.title')}</span>
            {invoiceDetails?.status && typeof invoiceDetails.status === 'string' && (
              <Tag color={statusColors[invoiceDetails.status]}>{t(`invoices.status.${invoiceDetails.status}`, invoiceDetails.status).toUpperCase()}</Tag>
            )}
          </Space>
        }
        open={detailsOpen}
        onCancel={() => {
          setDetailsOpen(false);
          setSelectedInvoice(null);
        }}
        width={700}
        footer={
          invoiceDetails && (
            <Space style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <Text type="secondary">
                {t('invoices.details.total')}: <Text strong style={{ color: '#6366f1', fontSize: 18 }}>${(Number(invoiceDetails.total_amount) || 0).toFixed(2)}</Text>
              </Text>
              <Space>
                <Button onClick={() => setDetailsOpen(false)}>{t('invoices.details.close')}</Button>
                {invoiceDetails.status === 'pending' && (
                  <>
                    <Button
                      danger
                      icon={<CloseCircleOutlined />}
                      onClick={() => declineMutation.mutate(invoiceDetails.id)}
                      loading={declineMutation.isPending}
                    >
                      {t('invoices.actions.decline')}
                    </Button>
                    <Button
                      type="primary"
                      icon={<CheckCircleOutlined />}
                      onClick={() => approveMutation.mutate(invoiceDetails.id)}
                      loading={approveMutation.isPending}
                    >
                      {t('invoices.actions.approve')}
                    </Button>
                  </>
                )}
                {invoiceDetails.status === 'approved' && (
                  <Button
                    type="primary"
                    icon={<DollarOutlined />}
                    onClick={() => markPaidMutation.mutate(invoiceDetails.id)}
                    loading={markPaidMutation.isPending}
                  >
                    {t('invoices.actions.markPaid')}
                  </Button>
                )}
              </Space>
            </Space>
          )
        }
      >
        {fetchingDetails ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
        ) : invoiceDetails ? (
          <>
            {/* Invoice Info */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              <Col xs={24} sm={8}>
                <Card size="small">
                  <Statistic title={t('invoices.details.developer')} value={invoiceDetails.user?.name || 'Unknown'} valueStyle={{ fontSize: 16 }} />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card size="small">
                  <Statistic
                    title={t('invoices.details.period')}
                    value={invoiceDetails.period_start && invoiceDetails.period_end
                      ? `${dayjs(invoiceDetails.period_start).format('MMM D')} - ${dayjs(invoiceDetails.period_end).format('MMM D')}`
                      : '-'}
                    valueStyle={{ fontSize: 14 }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card size="small">
                  <Statistic
                    title={t('invoices.details.totalHours')}
                    value={formatDuration(invoiceDetails.total_hours ? invoiceDetails.total_hours * 60 : null)}
                    valueStyle={{ fontSize: 16 }}
                  />
                </Card>
              </Col>
            </Row>

            {/* Entries List */}
            <Card size="small" title={t('invoices.details.timeEntries')}>
              {invoiceDetails.entries?.length ? (
                <Table
                  scroll={{ x: 500 }}
                  size="small"
                  dataSource={invoiceDetails.entries}
                  rowKey="id"
                  pagination={false}
                  columns={[
                    {
                      title: t('invoices.details.project'),
                      key: 'project',
                      render: (_: unknown, record: { project?: { name: string } }) => (
                        <Tag color="purple">{record?.project?.name || t('invoices.details.noProject')}</Tag>
                      ),
                    },
                    {
                      title: t('invoices.details.description'),
                      dataIndex: 'description',
                      key: 'description',
                      render: (d: string | null) => d || '-',
                    },
                    {
                      title: t('invoices.details.duration'),
                      dataIndex: 'duration_minutes',
                      key: 'duration',
                      render: (mins: number | null) => formatDuration(mins),
                    },
                  ]}
                />
              ) : (
                <Empty description={t('invoices.details.noEntries')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </Card>
          </>
        ) : null}
      </Modal>
    </div>
  );
}
