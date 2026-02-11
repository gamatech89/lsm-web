/**
 * Activity Log API Module
 */

import type { AxiosInstance, AxiosResponse } from 'axios';
import type { PaginatedResponse } from '@lsm/types';

export interface ActivityLog {
  id: number;
  description: string;
  subject_type: string;
  subject_id: number;
  causer_id: number;
  causer?: {
    id: number;
    name: string;
  };
  properties: Record<string, unknown>;
  created_at: string;
}

export interface ActivityFilters {
  page?: number;
  per_page?: number;
  search?: string;
  subject_type?: string;
  causer_id?: number;
  date_from?: string;
  date_to?: string;
}

export function createActivityApi(client: AxiosInstance) {
  return {
    list: (filters?: ActivityFilters): Promise<AxiosResponse<PaginatedResponse<ActivityLog>>> =>
      client.get('/activity', { params: filters }),
  };
}
