/**
 * Dashboard API Module
 */

import type { AxiosInstance } from 'axios';
import type {
  ApiResponse,
  DashboardResponse,
  DashboardStats,
} from '@lsm/types';

export function createDashboardApi(client: AxiosInstance) {
  return {
    /**
     * Get full dashboard data (stats + recent issues)
     */
    get: () =>
      client.get<ApiResponse<DashboardResponse>>('/dashboard'),

    /**
     * Get stats only (lighter endpoint)
     */
    getStats: () =>
      client.get<ApiResponse<DashboardStats>>('/dashboard/stats'),
  };
}

export type DashboardApi = ReturnType<typeof createDashboardApi>;
