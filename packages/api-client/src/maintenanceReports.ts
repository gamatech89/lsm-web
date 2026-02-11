/**
 * Maintenance Reports API Module
 */

import type { AxiosInstance, AxiosResponse } from 'axios';
import type { ApiResponse, MaintenanceReport } from '@lsm/types';

export interface CreateMaintenanceReportRequest {
  report_date: string;
  type: 'monthly' | 'weekly' | 'ad-hoc';
  summary: string;
  tasks_completed?: string[];
  updates_performed?: string[];
  issues_found?: string[];
  issues_resolved?: string[];
  notes?: string;
  time_spent_minutes?: number;
}

export function createMaintenanceReportsApi(client: AxiosInstance) {
  return {
    // List uses nested route
    list: (projectId: number): Promise<AxiosResponse<ApiResponse<MaintenanceReport[]>>> =>
      client.get(`/projects/${projectId}/maintenance-reports`),

    // Get uses shallow route (no project prefix)
    get: (reportId: number): Promise<AxiosResponse<ApiResponse<MaintenanceReport>>> =>
      client.get(`/maintenance-reports/${reportId}`),

    // Create uses nested route
    create: (projectId: number, data: CreateMaintenanceReportRequest): Promise<AxiosResponse<ApiResponse<MaintenanceReport>>> =>
      client.post(`/projects/${projectId}/maintenance-reports`, data),

    // Update uses shallow route (no project prefix)
    update: (reportId: number, data: Partial<CreateMaintenanceReportRequest>): Promise<AxiosResponse<ApiResponse<MaintenanceReport>>> =>
      client.put(`/maintenance-reports/${reportId}`, data),

    // Delete uses shallow route (no project prefix)
    delete: (projectId: number, reportId: number): Promise<AxiosResponse<void>> =>
      client.delete(`/maintenance-reports/${reportId}`),

    // PDF download URL - returns the full URL for downloading
    getPdfUrl: (reportId: number): string =>
      `${client.defaults.baseURL}/maintenance-reports/${reportId}/pdf`,

    suggestions: (field: string, search?: string): Promise<AxiosResponse<ApiResponse<string[]>>> =>
      client.get('/maintenance-reports/suggestions', { params: { field, q: search } }),
  };
}
