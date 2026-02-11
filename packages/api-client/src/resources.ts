/**
 * Resources API Client
 * CRUD operations for project resources
 */

import type { ApiClient } from './client';
import type { AxiosResponse } from 'axios';

export interface Resource {
  id: number;
  project_id: number;
  title: string;
  type: 'link' | 'file';
  url?: string;
  file_path?: string;
  notes?: string;
  is_quick_action?: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateResourceRequest {
  title: string;
  type: 'link' | 'file';
  url?: string;
  notes?: string;
  is_quick_action?: boolean;
}

export interface UpdateResourceRequest {
  title?: string;
  type?: 'link' | 'file';
  url?: string;
  notes?: string;
  is_quick_action?: boolean;
}

export interface ResourcesApi {
  list: (projectId: number) => Promise<AxiosResponse<{ data: Resource[] }>>;
  create: (projectId: number, data: CreateResourceRequest) => Promise<AxiosResponse<{ data: Resource }>>;
  update: (id: number, data: UpdateResourceRequest) => Promise<AxiosResponse<{ data: Resource }>>;
  delete: (id: number) => Promise<AxiosResponse<void>>;
  download: (id: number) => Promise<AxiosResponse<Blob>>;
}

export function createResourcesApi(client: ApiClient): ResourcesApi {
  return {
    list: (projectId: number) =>
      client.get(`/projects/${projectId}/resources`),
    
    create: (projectId: number, data: CreateResourceRequest | FormData) =>
      client.post(`/projects/${projectId}/resources`, data),
    
    update: (id: number, data: UpdateResourceRequest | FormData) => {
      if (data instanceof FormData) {
        data.append('_method', 'PUT');
        return client.post(`/resources/${id}`, data);
      }
      return client.put(`/resources/${id}`, data);
    },
    
    delete: (id: number) =>
      client.delete(`/resources/${id}`),

    download: (id: number) =>
      client.get(`/resources/${id}/download`, { responseType: 'blob' }),
  };
}
