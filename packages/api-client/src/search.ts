/**
 * Search API Module
 */

import type { AxiosInstance } from 'axios';
import type { ApiResponse, SearchResponse } from '@lsm/types';

export function createSearchApi(client: AxiosInstance) {
  return {
    /**
     * Global search across projects and credentials
     */
    search: (query: string, limit?: number) =>
      client.get<ApiResponse<SearchResponse>>('/search', {
        params: { q: query, limit },
      }),
  };
}

export type SearchApi = ReturnType<typeof createSearchApi>;
