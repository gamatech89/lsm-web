/**
 * LSM API Client
 *
 * Central export for the shared API client package.
 * Use this to create a configured API instance for web or mobile.
 */

// Client factory
export { createApiClient, unwrapResponse, unwrapPaginatedResponse } from './client';
export type { ApiClientConfig, ApiClient } from './client';

// API modules
export { createAuthApi } from './auth';
export type { AuthApi } from './auth';

export { createDashboardApi } from './dashboard';
export type { DashboardApi } from './dashboard';

export { createProjectsApi } from './projects';
export type { ProjectsApi } from './projects';

export { createCredentialsApi } from './credentials';
export type { CredentialsApi } from './credentials';

export { createTodosApi } from './todos';
export type { TodosApi, TodoFilters } from './todos';

export { createTeamApi } from './team';
export type { TeamApi, TeamFilters } from './team';

export { createVaultApi } from './vault';
export type { VaultApi, VaultFilters } from './vault';

export { createTagsApi } from './tags';
export type { TagsApi } from './tags';

export { createNotificationsApi } from './notifications';
export type { NotificationsApi, NotificationsResponse } from './notifications';

export { createSearchApi } from './search';
export type { SearchApi } from './search';

export { createActivityApi } from './activity';
export type { ActivityFilters, ActivityLog } from './activity';

export { createMaintenanceReportsApi } from './maintenanceReports';
export type { CreateMaintenanceReportRequest } from './maintenanceReports';

export { createResourcesApi } from './resources';
export type { ResourcesApi, Resource, CreateResourceRequest, UpdateResourceRequest } from './resources';

export { createTimerApi, createTimeEntriesApi, createTimesheetsApi, createInvoicesApi } from './timer';
export type { 
  TimeEntry, 
  Timesheet, 
  TimerProject, 
  StartTimerRequest, 
  StopTimerRequest,
  CreateTimeEntryRequest,
  UpdateTimeEntryRequest,
  TimeEntriesFilters,
  Invoice,
} from './timer';

export { createAvailabilityApi } from './availability';
export type { AvailabilityLog, CreateAvailabilityRequest } from './availability';

// Re-export types for convenience
export * from '@lsm/types';


