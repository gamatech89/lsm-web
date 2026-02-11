/**
 * API Client Configuration
 *
 * Creates and exports the configured API client instance.
 */

import {
  createApiClient,
  createAuthApi,
  createDashboardApi,
  createProjectsApi,
  createCredentialsApi,
  createTodosApi,
  createTeamApi,
  createVaultApi,
  createTagsApi,
  createNotificationsApi,
  createSearchApi,
  createActivityApi,
  createMaintenanceReportsApi,
  createTimerApi,
  createTimeEntriesApi,
  createTimesheetsApi,
  createInvoicesApi,
  createResourcesApi,
} from '@lsm/api-client';
import { createAvailabilityApi } from './availability-api';
import { createRmbApi } from './rmb-api';
import { createSupportTicketsApi } from './support-tickets-api';
import { createBackupsApi } from './backups-api';
import { createPhpErrorsApi } from './php-errors-api';
import { createLibraryResourcesApi } from './library-resources-api';
import { useAuthStore } from '@/stores/auth';

// Create the base API client
const client = createApiClient({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  getToken: () => useAuthStore.getState().token,
  onUnauthorized: () => {
    useAuthStore.getState().logout();
    window.location.href = '/login';
  },
  timeout: 30000,
});

// Export configured API modules
export const api = {
  auth: createAuthApi(client),
  dashboard: createDashboardApi(client),
  projects: createProjectsApi(client),
  credentials: createCredentialsApi(client),
  todos: createTodosApi(client),
  team: createTeamApi(client),
  vault: createVaultApi(client),
  tags: createTagsApi(client),
  notifications: createNotificationsApi(client),
  search: createSearchApi(client),
  activity: createActivityApi(client),
  maintenanceReports: createMaintenanceReportsApi(client),
  timer: createTimerApi(client),
  timeEntries: createTimeEntriesApi(client),
  timesheets: createTimesheetsApi(client),
  invoices: createInvoicesApi(client),
  availability: createAvailabilityApi(client),
  resources: createResourcesApi(client),
  rmb: createRmbApi(client),
  supportTickets: createSupportTicketsApi(client),
  backups: createBackupsApi(client),
  phpErrors: createPhpErrorsApi(client),
  libraryResources: createLibraryResourcesApi(client),
};

// Export the raw client for custom requests
export { client as apiClient };
