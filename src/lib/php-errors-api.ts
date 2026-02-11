/**
 * PHP Errors API Helper
 * 
 * API client for PHP error log management.
 */

import type { AxiosInstance } from 'axios';

export interface PhpError {
  id: number;
  project_id: number;
  type: 'fatal' | 'warning' | 'notice' | 'deprecated' | 'parse';
  message: string;
  file: string | null;
  line: number | null;
  error_hash: string;
  count: number;
  first_seen_at: string;
  last_seen_at: string;
  wordpress_version: string | null;
  php_version: string | null;
  plugin_slug: string | null;
  theme_slug: string | null;
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface PhpErrorStats {
  total: number;
  unresolved: number;
  by_type: {
    fatal: number;
    warning: number;
    notice: number;
    deprecated: number;
  };
  recent_24h: number;
}

export interface ListPhpErrorsParams {
  type?: string;
  search?: string;
  page?: number;
}

export function createPhpErrorsApi(client: AxiosInstance) {
  const basePath = (projectId: number) => `/projects/${projectId}/php-errors`;

  return {
    /**
     * List all PHP errors for a project
     */
    list: (projectId: number, params: ListPhpErrorsParams = {}) => {
      const queryParams = new URLSearchParams();
      if (params.type) queryParams.set('type', params.type);
      if (params.search) queryParams.set('search', params.search);
      if (params.page) queryParams.set('page', params.page.toString());
      
      const query = queryParams.toString();
      return client.get<{ data: PhpError[]; meta: any }>(
        `${basePath(projectId)}${query ? `?${query}` : ''}`
      );
    },

    /**
     * Get a single PHP error
     */
    get: (errorId: number) =>
      client.get<{ data: PhpError }>(`/php-errors/${errorId}`),

    /**
     * Delete a single error
     */
    delete: (errorId: number) =>
      client.delete<{ message: string }>(`/php-errors/${errorId}`),

    /**
     * Mark an error as resolved
     */
    resolve: (errorId: number) =>
      client.post<{ data: PhpError; message: string }>(`/php-errors/${errorId}/resolve`),

    /**
     * Clear all errors for a project
     */
    clear: (projectId: number) =>
      client.delete<{ message: string }>(`${basePath(projectId)}`),

    /**
     * Get error statistics
     */
    stats: (projectId: number) =>
      client.get<{ data: PhpErrorStats }>(`/projects/${projectId}/php-errors-stats`),
  };
}

export type PhpErrorsApi = ReturnType<typeof createPhpErrorsApi>;
