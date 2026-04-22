/**
 * Credentials API Module
 */

import type { AxiosInstance } from 'axios';
import type {
  ApiResponse,
  Credential,
  CreateCredentialRequest,
} from '@lsm/types';

export interface CredentialAccessData {
  granted_user_ids: number[];
  project_developers: Array<{ id: number; name: string; email: string; role: string }>;
}

export function createCredentialsApi(client: AxiosInstance) {
  return {
    /**
     * List credentials for a project
     */
    listByProject: (projectId: number) =>
      client.get<ApiResponse<Credential[]>>(`/projects/${projectId}/credentials`),

    /**
     * Create a credential for a project
     */
    create: (projectId: number, data: CreateCredentialRequest) =>
      client.post<ApiResponse<Credential>>(`/projects/${projectId}/credentials`, data),

    /**
     * Update a credential
     */
    update: (id: number, data: Partial<CreateCredentialRequest>) =>
      client.put<ApiResponse<Credential>>(`/credentials/${id}`, data),

    /**
     * Delete a credential
     */
    delete: (id: number) =>
      client.delete<ApiResponse<null>>(`/credentials/${id}`),

    /**
     * Reveal credential password (logged for audit)
     */
    reveal: (id: number) =>
      client.post<ApiResponse<Credential>>(`/credentials/${id}/reveal`),

    /**
     * Get access grant info for a credential (who has access + project developers list)
     */
    getAccess: (id: number) =>
      client.get<ApiResponse<CredentialAccessData>>(`/credentials/${id}/access`),

    /**
     * Sync access grants — replaces the current list with the provided user IDs
     */
    syncAccess: (id: number, userIds: number[]) =>
      client.put<ApiResponse<{ granted_user_ids: number[] }>>(`/credentials/${id}/access`, {
        user_ids: userIds,
      }),
  };
}

export type CredentialsApi = ReturnType<typeof createCredentialsApi>;
