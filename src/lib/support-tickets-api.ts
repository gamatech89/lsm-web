/**
 * Support Tickets API client
 */

import type { AxiosInstance } from 'axios';

export interface SupportTicketAttachment {
  id: number;
  filename: string;
  mime: string;
  size: number;
}

export interface SupportTicketMessage {
  id: number;
  author_type: 'client' | 'staff';
  author_name: string;
  user_id: number | null;
  message: string;
  created_at: string;
  attachments?: SupportTicketAttachment[];
}

export interface SupportTicket {
  id: number;
  ticket_number: string;
  project_id: number;
  type: 'bug' | 'content' | 'design' | 'feature' | 'question' | 'urgent';
  type_label: string;
  subject: string;
  message: string;
  client_email: string;
  client_name: string | null;
  problem_page: string | null;
  site_url: string | null;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  is_open: boolean;
  is_read: boolean;
  read_at: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  todo_id: number | null;
  todo: {
    id: number;
    title: string;
    status: string;
  } | null;
  messages?: SupportTicketMessage[];
  attachments?: SupportTicketAttachment[];
  project?: {
    id: number;
    name: string;
    url: string;
    domain: string;
  };
  created_at: string;
  updated_at: string;
}

export interface SupportTicketUpdatePayload {
  status?: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  resolution_notes?: string;
}

export function createSupportTicketsApi(client: AxiosInstance) {
  const basePath = (projectId: number) => `/projects/${projectId}/support-tickets`;

  return {
    /**
     * Get all support tickets for a project
     */
    getAll: (projectId: number, params?: {
      status?: string;
      type?: string;
      unread_only?: boolean;
      open_only?: boolean;
    }) =>
      client.get<SupportTicket[]>(basePath(projectId), { params }),

    /**
     * Get a single support ticket
     */
    get: (ticketId: number) =>
      client.get<SupportTicket>(`/support-tickets/${ticketId}`),

    /**
     * Update a support ticket
     */
    update: (ticketId: number, data: SupportTicketUpdatePayload) =>
      client.put<SupportTicket>(`/support-tickets/${ticketId}`, data),

    /**
     * Delete a support ticket
     */
    delete: (ticketId: number) =>
      client.delete(`/support-tickets/${ticketId}`),

    /**
     * Mark ticket as read
     */
    markAsRead: (ticketId: number) =>
      client.post<SupportTicket>(`/support-tickets/${ticketId}/mark-read`),

    /**
     * Create todo from ticket
     */
    createTodo: (ticketId: number) =>
      client.post(`/support-tickets/${ticketId}/create-todo`),

    /**
     * Get unread count for a project
     */
    getUnreadCount: (projectId: number) =>
      client.get<{ count: number }>(`${basePath(projectId)}/unread-count`),

    /**
     * Get ALL support tickets globally (for Support Tab)
     */
    getAllGlobal: (params?: {
      status?: string;
      search?: string;
    }) =>
      client.get<SupportTicket[]>('/support-tickets', { params }),

    /**
     * Add a staff reply (optionally with attachments) to a ticket thread
     */
    postMessage: (ticketId: number, message: string, files?: File[]) => {
      const form = new FormData();
      form.append('message', message);
      (files ?? []).slice(0, 5).forEach((f) => form.append('attachments[]', f, f.name));
      return client.post<SupportTicketMessage>(`/support-tickets/${ticketId}/messages`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },

    /**
     * Fetch a ticket attachment as a Blob (authenticated)
     */
    fetchAttachmentBlob: async (attachmentId: number) => {
      const response = await client.get<Blob>(`/support-tickets/attachments/${attachmentId}`, {
        responseType: 'blob',
      });
      return response.data;
    },

    /**
     * Download a ticket attachment (authenticated blob → browser download)
     */
    downloadAttachment: async (attachment: SupportTicketAttachment) => {
      const response = await client.get<Blob>(`/support-tickets/attachments/${attachment.id}`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    },
  };
}

export type SupportTicketsApi = ReturnType<typeof createSupportTicketsApi>;

// Type labels with emojis
export const TICKET_TYPE_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  bug: { label: 'Bug / Error', emoji: '🐛', color: '#f5222d' },
  content: { label: 'Content Change', emoji: '📝', color: '#1890ff' },
  design: { label: 'Design Change', emoji: '🎨', color: '#722ed1' },
  feature: { label: 'New Feature', emoji: '✨', color: '#52c41a' },
  question: { label: 'Question', emoji: '❓', color: '#faad14' },
  urgent: { label: 'URGENT', emoji: '🚨', color: '#cf1322' },
};

// Status labels with colors
export const TICKET_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  open: { label: 'Open', color: 'blue' },
  in_progress: { label: 'In Progress', color: 'orange' },
  resolved: { label: 'Resolved', color: 'green' },
  closed: { label: 'Closed', color: 'default' },
};

// Priority labels with colors
export const TICKET_PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  low: { label: 'Low', color: 'default' },
  medium: { label: 'Medium', color: 'blue' },
  high: { label: 'High', color: 'orange' },
  critical: { label: 'Critical', color: 'red' },
};
