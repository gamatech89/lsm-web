/**
 * Notifications API Module
 */

import type { AxiosInstance } from 'axios';
import type { ApiResponse, Notification } from '@lsm/types';

export interface NotificationsResponse {
  data: Notification[];
  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  unread_count: number;
}

export function createNotificationsApi(client: AxiosInstance) {
  return {
    /**
     * List notifications
     */
    list: (page?: number, perPage?: number) =>
      client.get<ApiResponse<NotificationsResponse>>('/notifications', {
        params: { page, per_page: perPage },
      }),

    /**
     * Mark a notification as read
     */
    markAsRead: (id: string) =>
      client.post<ApiResponse<null>>(`/notifications/${id}/read`),

    /**
     * Mark all notifications as read
     */
    markAllAsRead: () =>
      client.post<ApiResponse<null>>('/notifications/read-all'),

    /**
     * Get unread count
     */
    getUnreadCount: () =>
      client.get<ApiResponse<{ count: number }>>('/notifications/unread-count'),
  };
}

export type NotificationsApi = ReturnType<typeof createNotificationsApi>;
