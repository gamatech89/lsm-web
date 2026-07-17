/**
 * Ticket Detail Modal
 *
 * Shared ticket detail view: metadata, attachments, conversation thread,
 * staff reply box, status/priority triage and todo conversion.
 * Used by the per-project Support tab and the global Support page.
 */

import { useState } from 'react';
import {
  Tag,
  Button,
  Space,
  Modal,
  Typography,
  Select,
  Spin,
  message,
  Descriptions,
  Divider,
  Input,
  Upload,
  Avatar,
  theme,
} from 'antd';
import {
  CheckCircleOutlined,
  PlusOutlined,
  LinkOutlined,
  MailOutlined,
  GlobalOutlined,
  SendOutlined,
  PaperClipOutlined,
  UserOutlined,
  CustomerServiceFilled,
  DownloadOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { SupportTicket, SupportTicketAttachment, SupportTicketMessage } from '@/lib/support-tickets-api';
import {
  TICKET_TYPE_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_PRIORITY_LABELS,
} from '@/lib/support-tickets-api';
import dayjs from 'dayjs';

const { Text, Paragraph, Title } = Typography;

interface TicketDetailModalProps {
  ticket: SupportTicket | null;
  open: boolean;
  onClose: () => void;
  /** Extra query keys to invalidate when the ticket changes (list views). */
  invalidateKeys?: readonly (readonly unknown[])[];
}

export function TicketDetailModal({ ticket, open, onClose, invalidateKeys = [] }: TicketDetailModalProps) {
  const { token } = theme.useToken();
  const queryClient = useQueryClient();

  const [replyText, setReplyText] = useState('');
  const [replyFiles, setReplyFiles] = useState<File[]>([]);

  // Full ticket (incl. thread) — the list rows don't carry messages/attachments
  const { data: detailResponse, isLoading: detailLoading } = useQuery({
    queryKey: ['support-ticket-detail', ticket?.id],
    queryFn: () => api.supportTickets.get(ticket!.id),
    enabled: open && !!ticket,
  });
  const ticketDetail: SupportTicket | null =
    ((detailResponse?.data as any)?.data as SupportTicket) ?? (detailResponse?.data as SupportTicket) ?? null;

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['support-ticket-detail', ticket?.id] });
    invalidateKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: [...key] }));
  };

  const replyMutation = useMutation({
    mutationFn: () => api.supportTickets.postMessage(ticket!.id, replyText, replyFiles),
    onSuccess: () => {
      setReplyText('');
      setReplyFiles([]);
      invalidateAll();
      message.success('Reply sent to client');
    },
    onError: () => {
      message.error('Failed to send reply');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.supportTickets.update(id, data),
    onSuccess: () => {
      invalidateAll();
      message.success('Ticket updated');
    },
    onError: () => {
      message.error('Failed to update ticket');
    },
  });

  const createTodoMutation = useMutation({
    mutationFn: (ticketId: number) => api.supportTickets.createTodo(ticketId),
    onSuccess: () => {
      invalidateAll();
      message.success('Todo created from ticket!');
      handleClose();
    },
    onError: () => {
      message.error('Failed to create todo');
    },
  });

  const handleClose = () => {
    setReplyText('');
    setReplyFiles([]);
    onClose();
  };

  const renderAttachments = (attachments?: SupportTicketAttachment[]) =>
    attachments && attachments.length > 0 ? (
      <Space wrap style={{ marginTop: 8 }}>
        {attachments.map((a) => (
          <Button
            key={a.id}
            size="small"
            icon={<DownloadOutlined />}
            onClick={() =>
              api.supportTickets.downloadAttachment(a).catch(() => message.error('Failed to download attachment'))
            }
          >
            {a.filename} ({Math.round(a.size / 1024)} KB)
          </Button>
        ))}
      </Space>
    ) : null;

  const renderMessage = (msg: SupportTicketMessage) => {
    const isStaff = msg.author_type === 'staff';
    return (
      <div
        key={msg.id}
        style={{
          display: 'flex',
          flexDirection: isStaff ? 'row-reverse' : 'row',
          gap: 8,
          marginBottom: 12,
        }}
      >
        <Avatar
          size="small"
          icon={isStaff ? <CustomerServiceFilled /> : <UserOutlined />}
          style={{ backgroundColor: isStaff ? '#1890ff' : '#bfbfbf', flexShrink: 0 }}
        />
        <div
          style={{
            // colorPrimary + alpha instead of colorPrimaryBg: the app's dark theme
            // overrides tokens by hand (no darkAlgorithm), so derived *Bg stays light
            background: isStaff ? `${token.colorPrimary}1F` : token.colorFillTertiary,
            borderRadius: 8,
            padding: '8px 12px',
            maxWidth: '80%',
          }}
        >
          <Text type="secondary" style={{ fontSize: 11 }}>
            {msg.author_name} · {dayjs(msg.created_at).format('YYYY-MM-DD HH:mm')}
          </Text>
          <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.message}</Paragraph>
          {renderAttachments(msg.attachments)}
        </div>
      </div>
    );
  };

  // Prefer fresh detail values (status may have just been changed) over the stale list row
  const current = ticketDetail ?? ticket;

  return (
    <Modal
      title={
        <Space>
          <span style={{ fontSize: 20 }}>{TICKET_TYPE_LABELS[ticket?.type || 'question']?.emoji}</span>
          {ticket?.ticket_number}
        </Space>
      }
      open={open}
      onCancel={handleClose}
      width={700}
      footer={[
        <Button key="close" onClick={handleClose}>
          Close
        </Button>,
        !current?.todo_id && (
          <Button
            key="create-todo"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => ticket && createTodoMutation.mutate(ticket.id)}
            loading={createTodoMutation.isPending}
          >
            Create Todo
          </Button>
        ),
      ].filter(Boolean)}
    >
      {ticket && current && (
        <>
          <Title level={4} style={{ marginTop: 0 }}>
            {current.subject}
          </Title>

          <Space style={{ marginBottom: 16 }}>
            <Select
              value={current.status}
              onChange={(value) => updateMutation.mutate({ id: ticket.id, data: { status: value } })}
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
              value={current.priority}
              onChange={(value) => updateMutation.mutate({ id: ticket.id, data: { priority: value } })}
              style={{ width: 120 }}
              loading={updateMutation.isPending}
            >
              {Object.entries(TICKET_PRIORITY_LABELS).map(([key, info]) => (
                <Select.Option key={key} value={key}>
                  <Tag color={info.color}>{info.label}</Tag>
                </Select.Option>
              ))}
            </Select>

            {current.todo_id && (
              <Tag icon={<LinkOutlined />} color="green">
                Linked to Todo
              </Tag>
            )}
          </Space>

          <Divider />

          <Descriptions column={2} size="small">
            <Descriptions.Item label={<><MailOutlined /> Email</>}>
              <a href={`mailto:${current.client_email}`}>{current.client_email}</a>
            </Descriptions.Item>
            <Descriptions.Item label="Name">{current.client_name || '-'}</Descriptions.Item>
            <Descriptions.Item label={<><GlobalOutlined /> Problem Page</>} span={2}>
              {current.problem_page ? (
                <a href={current.problem_page} target="_blank" rel="noreferrer">
                  {current.problem_page}
                </a>
              ) : (
                '-'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Created">
              {dayjs(current.created_at).format('YYYY-MM-DD HH:mm')}
            </Descriptions.Item>
            <Descriptions.Item label="Type">
              <Tag color={TICKET_TYPE_LABELS[current.type]?.color}>
                {TICKET_TYPE_LABELS[current.type]?.emoji} {TICKET_TYPE_LABELS[current.type]?.label}
              </Tag>
            </Descriptions.Item>
          </Descriptions>

          <Divider>Message</Divider>

          <div
            style={{
              background: token.colorFillTertiary,
              padding: 16,
              borderRadius: 8,
              whiteSpace: 'pre-wrap',
            }}
          >
            <Paragraph style={{ margin: 0 }}>{current.message}</Paragraph>
          </div>

          {renderAttachments(ticketDetail?.attachments)}

          <Divider>Conversation</Divider>

          {detailLoading ? (
            <div style={{ textAlign: 'center', padding: 16 }}>
              <Spin />
            </div>
          ) : (ticketDetail?.messages?.length ?? 0) === 0 ? (
            <Text type="secondary">No replies yet.</Text>
          ) : (
            <div style={{ maxHeight: 320, overflowY: 'auto', paddingRight: 4 }}>
              {ticketDetail!.messages!.map(renderMessage)}
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <Input.TextArea
              rows={3}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Reply to the client… (they will receive it by email)"
            />
            <Space style={{ marginTop: 8, width: '100%', justifyContent: 'space-between' }}>
              <Upload
                multiple
                maxCount={5}
                accept=".png,.jpg,.jpeg,.webp,.gif,.pdf"
                beforeUpload={(file) => {
                  if (file.size > 5 * 1024 * 1024) {
                    message.error(`${file.name} is larger than 5 MB`);
                    return Upload.LIST_IGNORE;
                  }
                  setReplyFiles((prev) => [...prev, file as unknown as File].slice(0, 5));
                  return false; // manual upload via postMessage
                }}
                onRemove={(file) => {
                  setReplyFiles((prev) => prev.filter((f) => f.name !== file.name));
                }}
                fileList={replyFiles.map((f, i) => ({ uid: String(i), name: f.name }))}
              >
                <Button icon={<PaperClipOutlined />}>Attach</Button>
              </Upload>
              <Button
                type="primary"
                icon={<SendOutlined />}
                disabled={!replyText.trim()}
                loading={replyMutation.isPending}
                onClick={() => replyMutation.mutate()}
              >
                Send Reply
              </Button>
            </Space>
          </div>

          {current.resolved_at && (
            <>
              <Divider>Resolution</Divider>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text type="secondary">
                  <CheckCircleOutlined style={{ color: '#52c41a' }} /> Resolved{' '}
                  {dayjs(current.resolved_at).fromNow()}
                </Text>
                {current.resolution_notes && <Paragraph>{current.resolution_notes}</Paragraph>}
              </Space>
            </>
          )}
        </>
      )}
    </Modal>
  );
}

export default TicketDetailModal;
