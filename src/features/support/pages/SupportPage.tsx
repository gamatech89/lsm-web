/**
 * Support Page — global ticket inbox
 *
 * All support tickets across projects the user can see (admins: everything;
 * managers/developers: their assigned projects), with search, status filter
 * and the shared ticket detail modal.
 */

import { useState } from 'react';
import {
  Typography,
  Card,
  Table,
  Tag,
  Badge,
  Space,
  Select,
  Input,
  Tooltip,
  Empty,
  Spin,
  Button,
} from 'antd';
import { CustomerServiceOutlined, EyeOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { SupportTicket } from '@/lib/support-tickets-api';
import {
  TICKET_TYPE_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_PRIORITY_LABELS,
} from '@/lib/support-tickets-api';
import { TicketDetailModal } from '../components/TicketDetailModal';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;

function SupportPage() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const queryKey = ['support-tickets-global', statusFilter ?? 'all', search] as const;

  const { data: response, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      api.supportTickets.getAllGlobal({
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(search.trim() ? { search: search.trim() } : {}),
      }),
    staleTime: 30000,
  });

  const tickets: SupportTicket[] = (response?.data as any)?.data || response?.data || [];

  const openTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setDetailOpen(true);
    if (!ticket.is_read) {
      api.supportTickets.markAsRead(ticket.id);
    }
  };

  const unreadCount = tickets.filter((t) => !t.is_read).length;

  const columns = [
    {
      title: '#',
      dataIndex: 'ticket_number',
      key: 'ticket_number',
      width: 110,
      render: (text: string, record: SupportTicket) => (
        <Space>
          {!record.is_read && <Badge status="processing" />}
          <Text strong={!record.is_read}>{text}</Text>
        </Space>
      ),
    },
    {
      title: 'Project',
      key: 'project',
      width: 180,
      render: (_: unknown, record: SupportTicket) => (
        <Text>{record.project?.name ?? `#${record.project_id}`}</Text>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 70,
      render: (type: string) => (
        <Tooltip title={TICKET_TYPE_LABELS[type]?.label}>
          <span style={{ fontSize: 18 }}>{TICKET_TYPE_LABELS[type]?.emoji}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Subject',
      dataIndex: 'subject',
      key: 'subject',
      render: (text: string, record: SupportTicket) => (
        <div>
          <Text strong={!record.is_read}>{text}</Text>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.client_name || record.client_email}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <Tag color={TICKET_STATUS_LABELS[status]?.color}>{TICKET_STATUS_LABELS[status]?.label}</Tag>
      ),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority: string) => (
        <Tag color={TICKET_PRIORITY_LABELS[priority]?.color}>
          {TICKET_PRIORITY_LABELS[priority]?.label}
        </Tag>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 130,
      render: (date: string) => (
        <Tooltip title={dayjs(date).format('YYYY-MM-DD HH:mm')}>
          <Text type="secondary">{dayjs(date).fromNow()}</Text>
        </Tooltip>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 60,
      render: (_: unknown, record: SupportTicket) => (
        <Button type="text" icon={<EyeOutlined />} onClick={() => openTicket(record)} />
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
          <CustomerServiceOutlined style={{ color: '#a855f7' }} />
          Support
          {unreadCount > 0 && <Badge count={unreadCount} style={{ backgroundColor: '#1890ff' }} />}
        </Title>
        <Text type="secondary">Ticket management &amp; client communication</Text>
      </div>

      <Card
        style={{ borderRadius: 12 }}
        title={
          <Space wrap>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Search subject, number, email, project…"
              style={{ width: 300 }}
              onChange={(e) => setSearch(e.target.value)}
              value={search}
            />
            <Select
              allowClear
              placeholder="All statuses"
              style={{ width: 150 }}
              value={statusFilter}
              onChange={(value) => setStatusFilter(value)}
              options={Object.entries(TICKET_STATUS_LABELS).map(([value, info]) => ({
                value,
                label: info.label,
              }))}
            />
          </Space>
        }
      >
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin />
          </div>
        ) : tickets.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No support tickets" />
        ) : (
          <Table
            columns={columns}
            dataSource={tickets}
            rowKey="id"
            size="middle"
            pagination={{ pageSize: 15 }}
            onRow={(record) => ({
              onClick: () => openTicket(record),
              style: { cursor: 'pointer' },
            })}
          />
        )}
      </Card>

      <TicketDetailModal
        ticket={selectedTicket}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        invalidateKeys={[queryKey]}
      />
    </div>
  );
}

export default SupportPage;
