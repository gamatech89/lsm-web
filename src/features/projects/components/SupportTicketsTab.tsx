/**
 * Support Tickets Tab Component
 * 
 * Displays support tickets submitted by clients from WordPress sites.
 * Allows viewing, status management, and converting to todos.
 */

import React, { useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Badge,
  Space,
  Modal,
  Typography,
  Select,
  Tooltip,
  Empty,
  Spin,
  message,
  Descriptions,
  Divider,
} from 'antd';
import {
  CustomerServiceOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
  EyeOutlined,
  LinkOutlined,
  MailOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { SupportTicket } from '@/lib/support-tickets-api';
import {
  TICKET_TYPE_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_PRIORITY_LABELS,
} from '@/lib/support-tickets-api';
import type { Project } from '@lsm/api-client';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Text, Paragraph, Title } = Typography;

interface SupportTicketsTabProps {
  project: Project;
}

export function SupportTicketsTab({ project }: SupportTicketsTabProps) {
  const queryClient = useQueryClient();
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Fetch tickets
  const { data: ticketsResponse, isLoading } = useQuery({
    queryKey: ['support-tickets', project.id],
    queryFn: () => api.supportTickets.getAll(project.id),
    staleTime: 30000,
  });

  // Extract tickets from response (handle nested data)
  const tickets = (ticketsResponse?.data as any)?.data || ticketsResponse?.data || [];

  // Update ticket mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      api.supportTickets.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets', project.id] });
      message.success('Ticket updated');
    },
    onError: () => {
      message.error('Failed to update ticket');
    },
  });

  // Create todo mutation
  const createTodoMutation = useMutation({
    mutationFn: (ticketId: number) => api.supportTickets.createTodo(ticketId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets', project.id] });
      queryClient.invalidateQueries({ queryKey: ['todos', project.id] });
      message.success('Todo created from ticket!');
      setDetailModalOpen(false);
    },
    onError: () => {
      message.error('Failed to create todo');
    },
  });

  // Mark as read when opening detail
  const handleViewTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setDetailModalOpen(true);
    if (!ticket.is_read) {
      api.supportTickets.markAsRead(ticket.id);
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

      {/* Ticket Detail Modal */}
      <Modal
        title={
          <Space>
            <span style={{ fontSize: 20 }}>
              {TICKET_TYPE_LABELS[selectedTicket?.type || 'question']?.emoji}
            </span>
            {selectedTicket?.ticket_number}
          </Space>
        }
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        width={700}
        footer={[
          <Button key="close" onClick={() => setDetailModalOpen(false)}>
            Close
          </Button>,
          !selectedTicket?.todo_id && (
            <Button
              key="create-todo"
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => selectedTicket && createTodoMutation.mutate(selectedTicket.id)}
              loading={createTodoMutation.isPending}
            >
              Create Todo
            </Button>
          ),
        ].filter(Boolean)}
      >
        {selectedTicket && (
          <>
            <Title level={4} style={{ marginTop: 0 }}>
              {selectedTicket.subject}
            </Title>

            <Space style={{ marginBottom: 16 }}>
              <Select
                value={selectedTicket.status}
                onChange={(value) =>
                  updateMutation.mutate({ id: selectedTicket.id, data: { status: value } })
                }
                style={{ width: 130 }}
                loading={updateMutation.isPending}
              >
                {Object.entries(TICKET_STATUS_LABELS).map(([key, info]) => (
                  <Select.Option key={key} value={key}>
                    <Tag color={info.color}>{info.label}</Tag>
                  </Select.Option>
                ))}
              </Select>

              <Select
                value={selectedTicket.priority}
                onChange={(value) =>
                  updateMutation.mutate({ id: selectedTicket.id, data: { priority: value } })
                }
                style={{ width: 120 }}
                loading={updateMutation.isPending}
              >
                {Object.entries(TICKET_PRIORITY_LABELS).map(([key, info]) => (
                  <Select.Option key={key} value={key}>
                    <Tag color={info.color}>{info.label}</Tag>
                  </Select.Option>
                ))}
              </Select>

              {selectedTicket.todo_id && (
                <Tag icon={<LinkOutlined />} color="green">
                  Linked to Todo
                </Tag>
              )}
            </Space>

            <Divider />

            <Descriptions column={2} size="small">
              <Descriptions.Item label={<><MailOutlined /> Email</>}>
                <a href={`mailto:${selectedTicket.client_email}`}>
                  {selectedTicket.client_email}
                </a>
              </Descriptions.Item>
              <Descriptions.Item label="Name">
                {selectedTicket.client_name || '-'}
              </Descriptions.Item>
              <Descriptions.Item label={<><GlobalOutlined /> Problem Page</>} span={2}>
                {selectedTicket.problem_page ? (
                  <a href={selectedTicket.problem_page} target="_blank" rel="noreferrer">
                    {selectedTicket.problem_page}
                  </a>
                ) : (
                  '-'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Created">
                {dayjs(selectedTicket.created_at).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="Type">
                <Tag color={TICKET_TYPE_LABELS[selectedTicket.type]?.color}>
                  {TICKET_TYPE_LABELS[selectedTicket.type]?.emoji}{' '}
                  {TICKET_TYPE_LABELS[selectedTicket.type]?.label}
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            <Divider>Message</Divider>

            <div
              style={{
                background: '#f5f5f5',
                padding: 16,
                borderRadius: 8,
                whiteSpace: 'pre-wrap',
              }}
            >
              <Paragraph style={{ margin: 0 }}>{selectedTicket.message}</Paragraph>
            </div>

            {selectedTicket.resolved_at && (
              <>
                <Divider>Resolution</Divider>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Text type="secondary">
                    <CheckCircleOutlined style={{ color: '#52c41a' }} /> Resolved{' '}
                    {dayjs(selectedTicket.resolved_at).fromNow()}
                  </Text>
                  {selectedTicket.resolution_notes && (
                    <Paragraph>{selectedTicket.resolution_notes}</Paragraph>
                  )}
                </Space>
              </>
            )}
          </>
        )}
      </Modal>

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
