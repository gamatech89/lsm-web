/**
 * Todos API Module
 */

import type { AxiosInstance } from 'axios';
import type {
  ApiResponse,
  Todo,
  CreateTodoRequest,
} from '@lsm/types';

export interface TodoFilters {
  status?: string;
  priority?: string;
  assignee_id?: number;
  include_completed?: boolean;
}

export function createTodosApi(client: AxiosInstance) {
  return {
    /**
     * List todos for a project
     */
    listByProject: (projectId: number, filters?: TodoFilters) =>
      client.get<ApiResponse<Todo[]>>(`/projects/${projectId}/todos`, { params: filters }),

    /**
     * Get a single todo
     */
    get: (id: number) =>
      client.get<ApiResponse<Todo>>(`/todos/${id}`),

    /**
     * Create a todo for a project
     */
    create: (projectId: number, data: CreateTodoRequest | FormData) =>
      client.post<ApiResponse<Todo>>(`/projects/${projectId}/todos`, data),

    /**
     * Update a todo
     */
    update: (id: number, data: Partial<CreateTodoRequest & { completed?: boolean }> | FormData) => {
      if (data instanceof FormData) {
        data.append('_method', 'PUT');
        return client.post<ApiResponse<Todo>>(`/todos/${id}`, data);
      }
      return client.put<ApiResponse<Todo>>(`/todos/${id}`, data);
    },

    /**
     * Delete a todo
     */
    delete: (id: number) =>
      client.delete<ApiResponse<null>>(`/todos/${id}`),

    /**
     * Download todo attachment
     */
    downloadFile: (id: number) =>
      client.get(`/todos/${id}/download`, { responseType: 'blob' }),
  };
}

export type TodosApi = ReturnType<typeof createTodosApi>;
