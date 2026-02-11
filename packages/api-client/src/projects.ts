/**
 * Projects API Module
 */

import type { AxiosInstance } from 'axios';
import type {
  ApiResponse,
  PaginatedResponse,
  Project,
  ProjectFilters,
  ProjectFilterOptions,
  CreateProjectRequest,
  UpdateProjectRequest,
  DashboardStats,
} from '@lsm/types';

export function createProjectsApi(client: AxiosInstance) {
  return {
    /**
     * List projects with pagination and filters
     */
    list: (filters?: ProjectFilters) =>
      client.get<PaginatedResponse<Project>>('/projects', { params: filters }),

    /**
     * Get a single project by ID
     */
    get: (id: number) =>
      client.get<ApiResponse<Project>>(`/projects/${id}`),

    /**
     * Create a new project
     */
    create: (data: CreateProjectRequest) =>
      client.post<ApiResponse<Project>>('/projects', data),

    /**
     * Update an existing project
     */
    update: (id: number, data: UpdateProjectRequest) =>
      client.put<ApiResponse<Project>>(`/projects/${id}`, data),

    /**
     * Delete a project
     */
    delete: (id: number) =>
      client.delete<ApiResponse<null>>(`/projects/${id}`),

    /**
     * Trigger a health check for a project
     */
    checkHealth: (id: number) =>
      client.post<ApiResponse<{ health_data: Record<string, unknown>; project: Project }>>(
        `/projects/${id}/check-health`
      ),

    /**
     * Get filter options (managers, developers, tags)
     */
    getFilterOptions: () =>
      client.get<ApiResponse<ProjectFilterOptions>>('/projects-filter-options'),

    /**
     * Get project statistics
     */
    getStats: () =>
      client.get<ApiResponse<DashboardStats>>('/projects-stats'),
  };
}

export type ProjectsApi = ReturnType<typeof createProjectsApi>;
