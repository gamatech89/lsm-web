/**
 * Backups API Helper
 * 
 * API client for project backup management.
 */

import type { AxiosInstance } from 'axios';

export interface Backup {
  id: number;
  project_id: number;
  created_by: number | null;
  type: 'manual' | 'scheduled' | 'pre_update';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  includes_database: boolean;
  includes_files: boolean;
  includes_uploads: boolean;
  file_path: string | null;
  file_size: number | null;
  checksum: string | null;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  creator?: {
    id: number;
    name: string;
  };
}

export interface BackupStats {
  total: number;
  completed: number;
  last_backup: string | null;
  total_size: number;
  by_type: {
    manual: number;
    scheduled: number;
    pre_update: number;
  };
}

export interface CreateBackupParams {
  type?: 'manual' | 'scheduled' | 'pre_update';
  includes_database?: boolean;
  includes_files?: boolean;
  includes_uploads?: boolean;
}

export function createBackupsApi(client: AxiosInstance) {
  const basePath = (projectId: number) => `/projects/${projectId}/backups`;

  return {
    /**
     * List all backups for a project
     */
    list: (projectId: number, page = 1) =>
      client.get<{ data: Backup[]; meta: any }>(`${basePath(projectId)}?page=${page}`),

    /**
     * Get a single backup
     */
    get: (backupId: number) =>
      client.get<{ data: Backup }>(`/backups/${backupId}`),

    /**
     * Create a new backup
     */
    create: (projectId: number, params: CreateBackupParams = {}) =>
      client.post<{ data: Backup; message: string }>(`${basePath(projectId)}`, params),

    /**
     * Delete a backup
     */
    delete: (backupId: number) =>
      client.delete<{ message: string }>(`/backups/${backupId}`),

    /**
     * Download a backup
     */
    download: (backupId: number) =>
      client.get(`/backups/${backupId}/download`, { responseType: 'blob' }),

    /**
     * Restore a backup
     */
    restore: (backupId: number) =>
      client.post<{ message: string }>(`/backups/${backupId}/restore`),

    /**
     * Get backup statistics
     */
    stats: (projectId: number) =>
      client.get<{ data: BackupStats }>(`/projects/${projectId}/backups-stats`),
  };
}

export type BackupsApi = ReturnType<typeof createBackupsApi>;
