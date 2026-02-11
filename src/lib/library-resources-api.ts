/**
 * Library Resources API
 * 
 * API client for global shared library resources.
 */

import type { AxiosInstance } from 'axios';

export interface LibraryResource {
  id: number;
  title: string;
  category: string | null;
  file_path: string;
  file_name: string;
  file_size: number;
  formatted_file_size: string;
  notes: string | null;
  created_by: number | null;
  creator?: { id: number; name: string };
  projects_count?: number;
  created_at: string;
  updated_at: string;
}

export function createLibraryResourcesApi(client: AxiosInstance) {
  return {
    /**
     * Get all library resources
     */
    getAll: (params?: { category?: string; search?: string }) =>
      client.get<{ data: LibraryResource[] }>('/library-resources', { params }),

    /**
     * Get a single library resource
     */
    get: (id: number) =>
      client.get<{ data: LibraryResource }>(`/library-resources/${id}`),

    /**
     * Create a new library resource (file upload)
     */
    create: (data: FormData) =>
      client.post<{ data: LibraryResource }>('/library-resources', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),

    /**
     * Update a library resource
     */
    update: (id: number, data: FormData | Record<string, any>) =>
      client.put<{ data: LibraryResource }>(`/library-resources/${id}`, data, {
        headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
      }),

    /**
     * Delete a library resource
     */
    delete: (id: number) =>
      client.delete(`/library-resources/${id}`),

    /**
     * Download a library resource file
     */
    download: (id: number) =>
      client.get(`/library-resources/${id}/download`, { responseType: 'blob' }),

    /**
     * Link a library resource to a project
     */
    linkToProject: (resourceId: number, projectId: number) =>
      client.post(`/library-resources/${resourceId}/link`, { project_id: projectId }),

    /**
     * Unlink a library resource from a project
     */
    unlinkFromProject: (resourceId: number, projectId: number) =>
      client.post(`/library-resources/${resourceId}/unlink`, { project_id: projectId }),

    /**
     * Get available categories
     */
    getCategories: () =>
      client.get<{ data: { categories: string[]; suggested: string[] } }>('/library-resources-categories'),
  };
}
