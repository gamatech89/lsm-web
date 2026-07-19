/**
 * Support Tickets Tab Component
 *
 * Displays support tickets submitted by clients from WordPress sites.
 * Viewing, replies, status management and todo conversion happen in the
 * shared TicketDetailModal.
 */

import { useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Badge,
  Space,
  Typography,
  Tooltip,
  Empty,
  Spin,
} from 'antd';
import {
  CustomerServiceOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import type { SupportTicket } from '@/lib/support-tickets-api';
import {
  TICKET_TYPE_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_PRIORITY_LABELS,
} from '@/lib/support-tickets-api';
import { TicketDetailModal } from '@/features/support/components/TicketDetailModal';
import type { Project } from '@lsm/api-client';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Text } = Typography;

interface SupportTicketsTabProps {
  project: Project;
}

export function SupportTicketsTab({ project }: SupportTicketsTabProps) {
  const queryClient = useQueryClient();
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const filters = { projectId: project.id };
  const listKey = queryKeys.supportTickets.list(filters);

  // Fetch tickets
  const { data: ticketsResponse, isLoading } = useQuery({
    queryKey: listKey,
    queryFn: () => api.supportTickets.getAll(project.id),
    refetchInterval: 60_000,
  });

  // Extract tickets from response (handle nested data)
  const tickets = (ticketsResponse?.data as any)?.data || ticketsResponse?.data || [];

  const markAsReadMutation = useMutation({
    mutationFn: (id: number) => api.supportTickets.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.supportTickets.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
    },
  });

  // Mark as read when opening detail
  const handleViewTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setDetailModalOpen(true);
    if (!ticket.is_read) {
      markAsReadMutation.mutate(ticket.id);
    }
  };

  // Table columns
  const columns = [
    {
      title: '#',
      dataIndex: 'ticket_number',
      key: 'ticket_number',
      width: 100,
      render: (text: string, record: SupportTicket) => (
        <Space>
          {!record.is_read && <Badge status="processing" />}
          <Text strong={!record.is_read}>{text}</Text>
        </Space>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) => {
        const typeInfo = TICKET_TYPE_LABELS[type];
        return (
          <Tooltip title={typeInfo?.label}>
            <span style={{ fontSize: 18 }}>{typeInfo?.emoji}</span>
          </Tooltip>
        );
      },
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
      width: 130,
      render: (status: string) => {
        const statusInfo = TICKET_STATUS_LABELS[status];
        return <Tag color={statusInfo?.color}>{statusInfo?.label}</Tag>;
      },
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority: string) => {
        const priorityInfo = TICKET_PRIORITY_LABELS[priority];
        return <Tag color={priorityInfo?.color}>{priorityInfo?.label}</Tag>;
      },
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (date: string) => (
        <Tooltip title={dayjs(date).format('YYYY-MM-DD HH:mm')}>
          <Text type="secondary">{dayjs(date).fromNow()}</Text>
        </Tooltip>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_: any, record: SupportTicket) => (
        <Button
          type="text"
          icon={<EyeOutlined />}
          onClick={() => handleViewTicket(record)}
        />
      ),
    },
  ];

  // Count by status
  const openCount = tickets.filter((t: SupportTicket) => t.status === 'open').length;
  const inProgressCount = tickets.filter((t: SupportTicket) => t.status === 'in_progress').length;
  const unreadCount = tickets.filter((t: SupportTicket) => !t.is_read).length;

  return (
    <>
      <Card
        title={
          <Space>
            <CustomerServiceOutlined />
            Support Tickets
            {unreadCount > 0 && (
              <Badge count={unreadCount} style={{ backgroundColor: '#1890ff' }} />
            )}
          </Space>
        }
        extra={
          <Space>
            <Tag icon={<ClockCircleOutlined />} color="blue">
              {openCount} Open
            </Tag>
            <Tag icon={<ExclamationCircleOutlined />} color="orange">
              {inProgressCount} In Progress
            </Tag>
          </Space>
        }
        style={{ borderRadius: 10, marginBottom: 24 }}
      >
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin />
          </div>
        ) : tickets.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No support tickets yet"
          />
        ) : (
          <Table
            columns={columns}
            dataSource={tickets}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 10 }}
            rowClassName={(record) => (!record.is_read ? 'ticket-unread' : '')}
            onRow={(record) => ({
              onClick: () => handleViewTicket(record),
              style: { cursor: 'pointer' },
            })}
          />
        )}
      </Card>

      <TicketDetailModal
        ticket={selectedTicket}
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        invalidateKeys={[listKey, queryKeys.todos.all(), queryKeys.projects.detail(project.id)]}
      />

      <style>{`
        .ticket-unread {
          background-color: #e6f7ff !important;
        }
        .ticket-unread:hover {
          background-color: #bae7ff !important;
        }
      `}</style>
    </>
  );
}

export default SupportTicketsTab;
