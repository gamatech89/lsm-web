/**
 * Financial Reports Page
 *
 * Financial role view for approved time entries:
 * - View approved entries ready for payment
 * - Export to CSV
 * - Mark entries as paid
 * - Summary statistics
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
  DatePicker,
  Statistic,
  Row,
  Col,
  Select,
  App,
  Modal,
  Checkbox,
  Divider,
  Empty,
} from 'antd';
import {
  CheckCircleOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  FileExcelOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs, { Dayjs } from 'dayjs';
import { api } from '@/lib/api';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const BRAND = {
  deepPurple: '#440C71',
  vibrantPurple: '#6B21A8',
  teal: '#3AA68D',
};

interface TimeEntry {
  id: number;
  user_id: number;
  project_id: number;
  description: string | null;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number;
  formatted_duration: string;
  is_billable: boolean;
  status: 'approved' | 'paid';
  user?: { id: number; name: string; hourly_rate?: number };
  project?: { id: number; name: string };
  approved_at: string | null;
}

interface FinancialSummary {
  total_entries: number;
  total_minutes: number;
  total_billable_minutes: number;
  formatted_total: string;
  formatted_billable: string;
  estimated_cost: number;
  developers_count: number;
  projects_count: number;
}

interface Project {
  id: number;
  name: string;
}

interface User {
  id: number;
  name: string;
}

export function FinancialReportsPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // State
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [markPaidModalOpen, setMarkPaidModalOpen] = useState(false);

  // Build filters
  const filters = {
    status: 'approved',
    date_from: dateRange?.[0]?.format('YYYY-MM-DD'),
    date_to: dateRange?.[1]?.format('YYYY-MM-DD'),
    project_id: selectedProject || undefined,
    user_id: selectedUser || undefined,
  };

  // Fetch approved entries
  const { data: entriesData, isLoading } = useQuery({
    queryKey: ['financial', 'approved', filters],
    queryFn: async () => {
      const response = await api.timeEntries.list(filters);
      return (response.data.data || []) as TimeEntry[];
    },
  });

  // Fetch summary
  const { data: summary } = useQuery({
    queryKey: ['financial', 'summary', filters],
    queryFn: async () => {
      const entries = entriesData || [];
      const totalMinutes = entries.reduce((acc: number, e: TimeEntry) => acc + (e.duration_minutes || 0), 0);
      const billableMinutes = entries.filter((e: TimeEntry) => e.is_billable).reduce((acc: number, e: TimeEntry) => acc + (e.duration_minutes || 0), 0);
      const uniqueUsers = new Set(entries.map((e: TimeEntry) => e.user_id));
      const uniqueProjects = new Set(entries.map((e: TimeEntry) => e.project_id));
      
      return {
        total_entries: entries.length,
        total_minutes: totalMinutes,
        total_billable_minutes: billableMinutes,
        formatted_total: `${Math.floor(totalMinutes / 60)}:${String(totalMinutes % 60).padStart(2, '0')}`,
        formatted_billable: `${Math.floor(billableMinutes / 60)}:${String(billableMinutes % 60).padStart(2, '0')}`,
        estimated_cost: (billableMinutes / 60) * 75, // Default rate $75/hr
        developers_count: uniqueUsers.size,
        projects_count: uniqueProjects.size,
      } as FinancialSummary;
    },
    enabled: !!entriesData,
  });

  // Fetch projects for filter
  const { data: projects } = useQuery({
    queryKey: ['timer', 'projects'],
    queryFn: () => api.timer.getProjects().then((r: { data: { success: boolean; data: Project[] } }) => r.data.data),
  });

  // Users list is derived from entries for now
  const users = entriesData
    ? Array.from(new Map(entriesData.filter(e => e.user).map(e => [e.user!.id, e.user!])).values())
    : [];

  // Mark as paid mutation
  const markPaidMutation = useMutation({
    mutationFn: (ids: number[]) =>
      Promise.all(ids.map(id => 
        api.timeEntries.update(id, { status: 'paid' } as unknown as { is_billable?: boolean })
      )),
    onSuccess: () => {
      message.success(`${selectedIds.length} entries marked as paid!`);
      setSelectedIds([]);
      setMarkPaidModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['financial'] });
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
    },
    onError: () => {
      message.error('Failed to mark entries as paid');
    },
  });

  // Export to CSV
  const handleExportCSV = () => {
    if (!entriesData || entriesData.length === 0) {
      message.warning('No entries to export');
      return;
    }

    const headers = ['Date', 'Developer', 'Project', 'Description', 'Duration', 'Billable', 'Status'];
    const rows = entriesData.map((entry: TimeEntry) => [
      dayjs(entry.started_at).format('YYYY-MM-DD'),
      entry.user?.name || '',
      entry.project?.name || '',
      entry.description || '',
      entry.formatted_duration,
      entry.is_billable ? 'Yes' : 'No',
      entry.status,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `time-report-${dayjs().format('YYYY-MM-DD')}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);

    message.success('Report exported to CSV');
  };

  // Table columns
  const columns = [
    {
      title: () => (
        <Checkbox
          checked={entriesData && entriesData.length > 0 && selectedIds.length === entriesData.length}
          indeterminate={selectedIds.length > 0 && selectedIds.length < (entriesData?.length || 0)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedIds(entriesData?.map((e: TimeEntry) => e.id) || []);
            } else {
              setSelectedIds([]);
            }
          }}
        />
      ),
      key: 'select',
      width: 50,
      render: (_: unknown, record: TimeEntry) => (
        <Checkbox
          checked={selectedIds.includes(record.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedIds([...selectedIds, record.id]);
            } else {
              setSelectedIds(selectedIds.filter(id => id !== record.id));
            }
          }}
        />
      ),
    },
    {
      title: 'Date',
      dataIndex: 'started_at',
      key: 'date',
      render: (date: string) => dayjs(date).format('MMM D, YYYY'),
      sorter: (a: TimeEntry, b: TimeEntry) => dayjs(a.started_at).unix() - dayjs(b.started_at).unix(),
    },
    {
      title: 'Developer',
      key: 'user',
      render: (_: unknown, record: TimeEntry) => (
        <Text>{record.user?.name}</Text>
      ),
    },
    {
      title: 'Project',
      key: 'project',
      render: (_: unknown, record: TimeEntry) => (
        <Tag color={BRAND.vibrantPurple}>{record.project?.name}</Tag>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (desc: string) => desc || <Text type="secondary">No description</Text>,
    },
    {
      title: 'Duration',
      dataIndex: 'formatted_duration',
      key: 'duration',
      render: (duration: string) => <Text strong>{duration}</Text>,
    },
    {
      title: 'Billable',
      dataIndex: 'is_billable',
      key: 'billable',
      render: (billable: boolean) => (
        billable ? <Tag color="green">Yes</Tag> : <Tag color="default">No</Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'paid' ? 'purple' : 'success'}>
          {status === 'paid' ? 'Paid' : 'Approved'}
        </Tag>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>{t('reports.title')}</Title>
          <Text type="secondary">{t('reports.subtitle')}</Text>
        </div>
        <Space>
          <Button
            icon={<FileExcelOutlined />}
            onClick={handleExportCSV}
            disabled={!entriesData?.length}
          >
            Export CSV
          </Button>
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={() => setMarkPaidModalOpen(true)}
            disabled={selectedIds.length === 0}
            style={{ background: BRAND.teal }}
          >
            Mark as Paid ({selectedIds.length})
          </Button>
        </Space>
      </div>

      {/* Filters */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Text strong>Filters:</Text>
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs] | null)}
            presets={[
              { label: 'This Month', value: [dayjs().startOf('month'), dayjs().endOf('month')] },
              { label: 'Last Month', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
              { label: 'This Year', value: [dayjs().startOf('year'), dayjs().endOf('year')] },
            ]}
          />
          <Select
            placeholder="All Projects"
            style={{ width: 200 }}
            allowClear
            value={selectedProject}
            onChange={setSelectedProject}
            options={projects?.map((p: Project) => ({ label: p.name, value: p.id })) || []}
          />
          <Select
            placeholder="All Developers"
            style={{ width: 200 }}
            allowClear
            value={selectedUser}
            onChange={setSelectedUser}
            options={users?.map((u: User) => ({ label: u.name, value: u.id })) || []}
          />
        </Space>
      </Card>

      {/* Stats Row */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Total Time"
              value={summary?.formatted_total || '0:00'}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: BRAND.deepPurple }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Billable Time"
              value={summary?.formatted_billable || '0:00'}
              prefix={<DollarOutlined />}
              valueStyle={{ color: BRAND.teal }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Developers"
              value={summary?.developers_count || 0}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Est. Cost"
              value={summary?.estimated_cost || 0}
              prefix="$"
              precision={2}
              valueStyle={{ color: BRAND.deepPurple }}
            />
          </Card>
        </Col>
      </Row>

      {/* Entries Table */}
      <Card title={`Approved Entries (${entriesData?.length || 0})`}>
        <Table
          columns={columns}
          dataSource={entriesData || []}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 20 }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No approved entries for this period"
              />
            ),
          }}
        />
      </Card>

      {/* Mark as Paid Modal */}
      <Modal
        title="Mark Entries as Paid"
        open={markPaidModalOpen}
        onCancel={() => setMarkPaidModalOpen(false)}
        onOk={() => markPaidMutation.mutate(selectedIds)}
        okText="Mark as Paid"
        okButtonProps={{ loading: markPaidMutation.isPending }}
      >
        <p>
          Are you sure you want to mark <strong>{selectedIds.length}</strong> entries as paid?
        </p>
        <Divider />
        <p>
          <Text type="secondary">
            This action will change the status of selected entries to "paid" and remove them from the pending list.
          </Text>
        </p>
      </Modal>
    </div>
  );
}
