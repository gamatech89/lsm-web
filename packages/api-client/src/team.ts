/**
 * Team API Module
 */

import type { AxiosInstance } from 'axios';
import type {
  ApiResponse,
  User,
  Project,
  CreateUserRequest,
} from '@lsm/types';

export interface TeamFilters {
  role?: string;
  search?: string;
}

export function createTeamApi(client: AxiosInstance) {
  return {
    /**
     * List team members
     */
    list: (filters?: TeamFilters) =>
      client.get<ApiResponse<User[]>>('/team', { params: filters }),

    /**
     * Get a team member
     */
    get: (id: number) =>
      client.get<ApiResponse<User>>(`/team/${id}`),

    /**
     * Create a team member (admin only)
     */
    create: (data: CreateUserRequest) =>
      client.post<ApiResponse<User>>('/team', data),

    /**
     * Update a team member (admin only)
     */
    update: (id: number, data: Partial<CreateUserRequest>) =>
      client.put<ApiResponse<User>>(`/team/${id}`, data),

    /**
     * Delete a team member (admin only)
     */
    delete: (id: number) =>
      client.delete<ApiResponse<null>>(`/team/${id}`),

    /**
     * Get projects assigned to a team member
     */
    getProjects: (id: number) =>
      client.get<ApiResponse<Project[]>>(`/team/${id}/projects`),
  };
}

export type TeamApi = ReturnType<typeof createTeamApi>;
