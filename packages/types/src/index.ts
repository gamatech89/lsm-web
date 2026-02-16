/**
 * LSM Platform - Shared Type Definitions
 *
 * This package contains all TypeScript types shared between
 * the web SPA, mobile app, and any future clients.
 */

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export type HealthStatus = 'online' | 'down_error' | 'updating';

export type SecurityStatus = 'secure' | 'monitoring' | 'compromised' | 'hacked';

export type UserRole = 'admin' | 'manager' | 'developer' | 'viewer';

export type CredentialType =
  | 'wordpress'
  | 'ssh'
  | 'ftp'
  | 'database'
  | 'hosting'
  | 'email'
  | 'api'
  | 'other';

export type TodoPriority = 'low' | 'medium' | 'high' | 'urgent' | 'critical';

export type TodoStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export type MaintenanceReportType = 'monthly' | 'weekly' | 'ad-hoc';

// =============================================================================
// MODELS
// =============================================================================

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  is_admin: boolean;
  hourly_rate?: number;
  billing_company_name?: string | null;
  billing_address?: string | null;
  billing_tax_id?: string | null;
  invoice_prefix?: string | null;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: number;
  name: string;
  url: string;
  domain: string | null;
  client_email: string | null;
  notes: string | null;

  // Status
  health_status: HealthStatus;
  security_status: SecurityStatus;

  // External IDs
  project_external_id: string | null;
  maintenance_id: string | null;

  // Hosting
  hosting_provider: string | null;
  hosting_url: string | null;
  ssh_access: string | null;

  // External links
  drive_link: string | null;
  trello_link: string | null;

  // Health monitoring
  response_time_ms: number | null;
  last_health_check_at: string | null;
  ssl_status: string | null;
  ssl_expires_at: string | null;
  wp_version: string | null;
  php_version: string | null;
  outdated_plugins_count: number | null;
  last_health_details: Record<string, unknown> | null;
  health_check_secret: string | null;

  // Monitoring toggles
  uptime_monitoring_enabled: boolean | null;
  ssl_alerts_enabled: boolean | null;
  domain_alerts_enabled: boolean | null;
  notification_preferences: Record<string, unknown> | null;

  // Domain expiry (WHOIS)
  domain_expires_at: string | null;
  domain_registrar: string | null;

  // Team (IDs)
  manager_id: number | null;
  developer_id: number | null;

  // Relationships (when loaded)
  manager?: User;
  managers?: User[];
  developer?: User;
  developers?: User[];
  credentials?: Credential[];
  todos?: Todo[];
  resources?: Resource[];
  maintenance_reports?: MaintenanceReport[];
  tags?: Tag[];

  // Counts (when loaded)
  credentials_count?: number;
  todos_count?: number;
  pending_todos_count?: number;
  resources_count?: number;
  maintenance_reports_count?: number;

  // Computed
  highest_todo_priority?: TodoPriority;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface Credential {
  id: number;
  project_id: number;
  title: string;
  type: CredentialType;
  username: string | null;
  url: string | null;
  note: string | null;
  metadata: Record<string, unknown> | null;

  // Security
  has_password: boolean;
  password?: string; // Only present when revealed

  // Relationships
  project?: Project;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface Todo {
  id: number;
  project_id: number;
  title: string;
  description: string | null;
  priority: TodoPriority;
  status: TodoStatus;
  completed: boolean;
  due_date: string | null;

  // Assignee
  assignee_id: number | null;
  assignee?: User;

  // Attachment
  file_path: string | null;
  file_name: string | null;
  has_attachment: boolean;

  // Time Tracking
  estimated_minutes: number | null;
  time_entries?: TimeEntry[]; // When loaded

  // Relationships
  project?: Project;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface Resource {
  id: number;
  project_id: number;
  title: string;
  type: 'link' | 'file';
  url: string | null;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  notes: string | null;
  is_quick_action: boolean;

  // Computed
  download_url?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: number;
  name: string;
  slug: string;
  color: string | null;
  projects_count?: number;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceReport {
  id: number;
  project_id: number;
  user_id: number;
  report_date: string;
  type: MaintenanceReportType;
  summary: string;
  tasks_completed: string[];
  updates_performed: string[];
  issues_found: string[];
  issues_resolved: string[];
  notes: string | null;
  time_spent_minutes: number | null;
  time_spent_formatted?: string;
  invoice_id: number | null;

  // Relationships
  user?: User;
  project?: Project;

  // Computed
  pdf_url?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface UpdatePerformed {
  name: string;
  from_version?: string;
  to_version?: string;
}

export interface Notification {
  id: string;
  type: string;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export interface ActivityLog {
  id: number;
  description: string;
  subject_type: string;
  subject_id: number | null;
  causer: User | null;
  properties: Record<string, unknown>;
  created_at: string;
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

export interface AuthResponse {
  user: User;
  token: string;
  token_type: 'Bearer';
}

export interface DashboardStats {
  total: number;
  online: number;
  offline: number;
  maintenance: number;
  secure: number;
  monitoring: number;
  at_risk: number;
  hacked: number;
}

export interface DashboardResponse {
  stats: DashboardStats;
  recent_issues: Project[];
}

export interface ProjectFilterOptions {
  managers: User[];
  developers: User[];
  tags: Tag[];
  health_statuses: HealthStatus[];
  security_statuses: SecurityStatus[];
}

export interface SearchResponse {
  projects: Project[];
  credentials: Credential[];
  counts: {
    projects: number;
    credentials: number;
  };
}

// =============================================================================
// REQUEST TYPES
// =============================================================================

export interface LoginRequest {
  email: string;
  password: string;
  device_name?: string;
}

export interface ProjectFilters {
  page?: number;
  per_page?: number;
  search?: string;
  health?: HealthStatus | 'all';
  security?: SecurityStatus | 'all';
  manager_id?: number;
  developer_id?: number;
  tag?: string;
}

export interface CreateProjectRequest {
  name: string;
  url: string;
  client_email?: string;
  notes?: string;
  health_status?: HealthStatus;
  security_status?: SecurityStatus;
  manager_id?: number;
  manager_ids?: number[];
  developer_ids?: number[];
  tag_ids?: number[];
  project_external_id?: string;
  maintenance_id?: string;
  add_maintenance_todos?: boolean;
}

export interface UpdateProjectRequest extends Partial<CreateProjectRequest> {
  health_check_secret?: string;
  uptime_monitoring_enabled?: boolean;
  ssl_alerts_enabled?: boolean;
  domain_alerts_enabled?: boolean;
  notification_preferences?: Record<string, unknown>;
}

export interface CreateCredentialRequest {
  title: string;
  type: CredentialType;
  username?: string;
  password?: string;
  url?: string;
  note?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateTodoRequest {
  title: string;
  description?: string;
  priority: TodoPriority;
  estimated_minutes?: number;
  status?: TodoStatus;
  due_date?: string;
  assignee_id?: number;
}

export interface CreateMaintenanceReportRequest {
  report_date: string;
  type: MaintenanceReportType;
  summary: string;
  tasks_completed?: string[];
  updates_performed?: UpdatePerformed[];
  issues_found?: string[];
  issues_resolved?: string[];
  notes?: string;
  time_spent_minutes?: number;
  invoice_id?: number;
}

export interface TimeEntry {
  id: number;
  user_id: number;
  project_id: number;
  todo_id: number | null;
  description: string | null;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  is_billable: boolean;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid';
  timesheet_id: number | null;
  
  // Computed
  formatted_duration?: string;
  
  // Relationships
  user?: User;
  project?: Project;
  todo?: Todo;
}

export interface CreateTimeEntryRequest {
  project_id: number;
  todo_id?: number;
  description?: string;
  started_at: string;
  ended_at: string;
  is_billable?: boolean;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  is_admin?: boolean;
}

export interface UpdateBillingRequest {
  billing_company_name?: string | null;
  billing_address?: string | null;
  billing_tax_id?: string | null;
  invoice_prefix?: string | null;
}
