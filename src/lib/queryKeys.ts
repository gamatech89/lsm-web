//
// Single source of truth for TanStack Query cache keys.
//
// Keys nest by ownership: everything belonging to a project lives under
// ['projects', id, …], so invalidating queryKeys.projects.detail(id)
// refreshes all of it via prefix matching. invalidateQueries refetches only
// mounted queries, so broad prefixes are cheap — prefer them.
//
// Never hand-write a key literal outside this file.

type Id = number | string;
type Filters = Record<string, unknown> | undefined;

const n = (id: Id) => Number(id);

export const queryKeys = {
  projects: {
    all: () => ['projects'] as const,
    list: (filters?: Filters) => ['projects', 'list', filters ?? {}] as const,
    stats: () => ['projects', 'stats'] as const,
    filterOptions: () => ['projects', 'filter-options'] as const,
    active: (userId?: Id) => ['projects', 'active', userId ?? null] as const,

    detail: (id: Id) => ['projects', n(id)] as const,

    // WordPress / LSM plugin surfaces
    health: (id: Id) => ['projects', n(id), 'health'] as const,
    status: (id: Id) => ['projects', n(id), 'status'] as const,
    siteInfo: (id: Id) => ['projects', n(id), 'site-info'] as const,
    updates: (id: Id) => ['projects', n(id), 'updates'] as const,
    plugins: (id: Id) => ['projects', n(id), 'plugins'] as const,
    themes: (id: Id) => ['projects', n(id), 'themes'] as const,
    recovery: (id: Id) => ['projects', n(id), 'recovery'] as const,
    dbStats: (id: Id) => ['projects', n(id), 'db-stats'] as const,
    media: (id: Id) => ['projects', n(id), 'media'] as const,

    // Security
    securitySettings: (id: Id) => ['projects', n(id), 'security', 'settings'] as const,
    securityHeaders: (id: Id) => ['projects', n(id), 'security', 'headers'] as const,
    securityHeaderSnippets: (id: Id) =>
      ['projects', n(id), 'security', 'header-snippets'] as const,
    securityScans: (id: Id) => ['projects', n(id), 'security', 'scans'] as const,
    securityScanLatest: (id: Id) =>
      ['projects', n(id), 'security', 'scan-latest'] as const,

    // Operational data
    phpErrors: (id: Id, filters?: Filters) =>
      ['projects', n(id), 'php-errors', filters ?? {}] as const,
    phpErrorsStats: (id: Id) => ['projects', n(id), 'php-errors', 'stats'] as const,
    uptimeStats: (id: Id) => ['projects', n(id), 'uptime-stats'] as const,
    backups: (id: Id) => ['projects', n(id), 'backups'] as const,
    backupsStats: (id: Id) => ['projects', n(id), 'backups', 'stats'] as const,
    gdprAudit: (id: Id) => ['projects', n(id), 'gdpr-audit'] as const,
    siteReviews: (id: Id) => ['projects', n(id), 'site-reviews'] as const,
    reports: (id: Id) => ['projects', n(id), 'reports'] as const,
    credentials: (id: Id) => ['projects', n(id), 'credentials'] as const,
    activityLog: (id: Id, filters?: Filters) =>
      ['projects', n(id), 'activity-log', filters ?? {}] as const,
    activityStats: (id: Id) => ['projects', n(id), 'activity-stats'] as const,
  },

  todos: {
    all: () => ['todos'] as const,
    myTasks: () => ['todos', 'my-tasks'] as const,
    completed: (projectId: Id) => ['todos', 'completed', n(projectId)] as const,
  },

  time: {
    all: () => ['time-entries'] as const,
    entries: (filters?: Filters) => ['time-entries', 'list', filters ?? {}] as const,
    today: () => ['time-entries', 'today'] as const,
    todayStats: () => ['time-entries', 'today-stats'] as const,
    forTodo: (todoId?: Id) =>
      ['time-entries', 'todo', todoId == null ? null : n(todoId)] as const,
  },

  timer: {
    all: () => ['timer'] as const,
    current: () => ['timer', 'current'] as const,
    projects: () => ['timer', 'projects'] as const,
    todos: (projectId?: Id) =>
      ['timer', 'todos', projectId == null ? null : n(projectId)] as const,
  },

  timesheets: {
    all: () => ['timesheets'] as const,
    pending: () => ['timesheets', 'pending'] as const,
  },

  invoices: {
    all: () => ['invoices'] as const,
    list: (filters?: Filters) => ['invoices', 'list', filters ?? {}] as const,
    detail: (id?: Id) => ['invoices', 'detail', id == null ? null : n(id)] as const,
  },

  financial: {
    all: () => ['financial'] as const,
    approved: (filters?: Filters) => ['financial', 'approved', filters ?? {}] as const,
    summary: (filters?: Filters) => ['financial', 'summary', filters ?? {}] as const,
  },

  analytics: {
    all: () => ['analytics'] as const,
    entries: (filters?: Filters) => ['analytics', 'entries', filters ?? {}] as const,
  },

  notifications: {
    all: () => ['notifications'] as const,
    unreadCount: () => ['notifications', 'unread-count'] as const,
    list: () => ['notifications', 'list'] as const,
    page: (page: number, perPage: number) =>
      ['notifications', 'page', page, perPage] as const,
  },

  supportTickets: {
    all: () => ['support-tickets'] as const,
    list: (filters?: Filters) => ['support-tickets', 'list', filters ?? {}] as const,
    detail: (id?: Id) =>
      ['support-tickets', 'detail', id == null ? null : n(id)] as const,
  },

  vault: {
    all: () => ['vault'] as const,
    list: (filters?: Filters) => ['vault', 'list', filters ?? {}] as const,
    access: (credentialId?: Id) =>
      ['vault', 'access', credentialId == null ? null : n(credentialId)] as const,
  },

  team: {
    all: () => ['team'] as const,
    list: (filters?: Filters) => ['team', 'list', filters ?? {}] as const,
  },

  availability: {
    all: () => ['availability'] as const,
  },

  dashboard: {
    all: () => ['dashboard'] as const,
  },

  settings: {
    all: () => ['settings'] as const,
    backup: () => ['settings', 'backup'] as const,
  },

  tags: {
    all: () => ['tags'] as const,
  },

  library: {
    all: () => ['library-resources'] as const,
    list: (filters?: Filters) => ['library-resources', 'list', filters ?? {}] as const,
    categories: () => ['library-resources', 'categories'] as const,
  },

  activity: {
    all: () => ['activity'] as const,
    list: (filters?: Filters) => ['activity', 'list', filters ?? {}] as const,
  },

  share: {
    reviewInfo: (token: string) => ['share', 'review-info', token] as const,
  },
} as const;
