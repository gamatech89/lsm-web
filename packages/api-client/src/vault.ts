/**
 * Vault API Module
 */

import type { AxiosInstance } from 'axios';
import type {
  ApiResponse,
  PaginatedResponse,
  Credential,
} from '@lsm/types';

export interface VaultFilters {
  type?: string;
  search?: string;
  sort_by?: 'updated_at' | 'title' | 'project';
  sort_order?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
}

export function createVaultApi(client: AxiosInstance) {
  return {
    /**
     * List all accessible credentials
     */
    list: (filters?: VaultFilters) =>
      client.get<PaginatedResponse<Credential>>('/vault', { params: filters }),
  };
}

export type VaultApi = ReturnType<typeof createVaultApi>;
