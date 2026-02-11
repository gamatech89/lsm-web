/**
 * Tags API Module
 */

import type { AxiosInstance } from 'axios';
import type { ApiResponse, Tag } from '@lsm/types';

export function createTagsApi(client: AxiosInstance) {
  return {
    /**
     * List all tags
     */
    list: () =>
      client.get<ApiResponse<Tag[]>>('/tags'),

    /**
     * Get a single tag
     */
    get: (id: number) =>
      client.get<ApiResponse<Tag>>(`/tags/${id}`),

    /**
     * Create a tag
     */
    create: (data: { name: string; color?: string }) =>
      client.post<ApiResponse<Tag>>('/tags', data),

    /**
     * Update a tag
     */
    update: (id: number, data: { name?: string; color?: string }) =>
      client.put<ApiResponse<Tag>>(`/tags/${id}`, data),

    /**
     * Delete a tag
     */
    delete: (id: number) =>
      client.delete<ApiResponse<null>>(`/tags/${id}`),
  };
}

export type TagsApi = ReturnType<typeof createTagsApi>;
