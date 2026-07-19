# Reactivity Overhaul — Phases 0 & 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the app refresh its own data — fix the global cache defaults, introduce one hierarchical query key factory, and migrate every query and mutation onto it while correcting ~45 broken invalidations.

**Architecture:** All query keys move into a single `src/lib/queryKeys.ts` factory whose keys nest by ownership (`['projects', id, 'plugins']` rather than `['project-plugins', id]`). Prefix invalidation then becomes semantic: refreshing a project refreshes everything belonging to it. Migration proceeds feature-by-feature; each task migrates one domain's keys and fixes that domain's invalidation in the same commit, so every task is independently reviewable and revertable.

**Tech Stack:** React 18, TypeScript 5.7, TanStack Query v5, Ant Design 5, Zustand 5, Vite 6.

**Spec:** `../specs/2026-07-18-reactivity-overhaul-design.md`

## Global Constraints

- Branch: `fix/reactivity-overhaul`, already created from `master` (spec commit `de81a54`).
- **There is no test harness in this repo** — no `test` script, no runner. The verification gate for every task is `npm run typecheck && npm run build`, both must exit 0.
- TypeScript catches a *renamed* key but **cannot** catch a *wrong* key. Task 14 adds a lint gate that fails the build on any remaining raw key literal; until then, every migrated key must be checked by eye against the mapping table in its task.
- Never invalidate with a hand-written array after Task 2 lands. Always `queryKeys.*`.
- `invalidateQueries` refetches only *mounted* queries and marks the rest stale, so broad prefix invalidation is cheap. Prefer the broadest correct prefix over enumerating children.
- Project IDs are normalized to `number` inside the factory. Never pass a raw `useParams` string anywhere else.
- Commit messages end with:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

### Task 1: Global cache defaults

The single highest-leverage change in the repo. Land it alone so its effect is observable before anything else moves.

**Files:**
- Modify: `src/main.tsx:12-20`

**Interfaces:**
- Produces: app-wide default query behaviour consumed by every `useQuery` that does not override it.

- [ ] **Step 1: Change the defaults**

Replace the `queryClient` construction in `src/main.tsx`:

```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 30s: long enough to dedupe a burst of mounts, short enough that
      // returning to a screen shows current data.
      staleTime: 1000 * 30,
      retry: 1,
      // Focus + reconnect refetching is the safety net that heals the cache
      // when a mutation forgets to invalidate. Do not disable globally again;
      // opt individual noisy queries out instead.
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
});
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run typecheck && npm run build`
Expected: both exit 0.

- [ ] **Step 3: Verify the behaviour change by hand**

Run `npm run dev`. Open the projects list. In a second browser tab change a project's name (or edit it directly in the DB). Switch back to the first tab.
Expected: the list updates within a moment of the tab regaining focus, with no manual refresh.

This is the baseline. If this does not work, stop — something else is wrong and the rest of the plan rests on it.

- [ ] **Step 4: Commit**

```bash
git add src/main.tsx
git commit -m "fix: refetch on window focus and reconnect, 30s staleTime

The global config disabled focus refetching and held data fresh for five
minutes, so any missed invalidation stayed on screen until a hard refresh.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Query key factory

**Files:**
- Create: `src/lib/queryKeys.ts`

**Interfaces:**
- Produces: `queryKeys` — the single source of truth for every cache key. Every later task in this plan consumes it. Exact member names are fixed here; later tasks reference them verbatim.

**Design notes for the implementer:**

- Project-owned data nests under `['projects', id, …]` so `queryKeys.projects.detail(id)` prefix-invalidates all of it.
- `all()` returns the bare root so `queryKeys.projects.all()` invalidates lists, stats and every project's detail at once.
- Every id passes through `Number()`. This is the only place that normalization happens.
- Keys are `as const` so TypeScript preserves tuple types.

- [ ] **Step 1: Create the factory**

```ts
// src/lib/queryKeys.ts
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
    active: (userId?: Id) => ['projects', 'active', userId == null ? null : n(userId)] as const,

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
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run typecheck`
Expected: exits 0. The file is not imported yet, so nothing else can break.

- [ ] **Step 3: Commit**

```bash
git add src/lib/queryKeys.ts
git commit -m "feat: centralized hierarchical query key factory

Project-owned keys nest under ['projects', id, …] so prefix invalidation
refreshes everything belonging to a project. Collapses eight pairs of
divergent keys naming the same data and normalizes ids to number in one
place. Not yet adopted — migration follows per feature.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Phase 1 — Migration

Tasks 3–13 each own one domain. The shape of every task is identical:

1. Replace that domain's raw key literals with `queryKeys.*` (mapping table given per task).
2. Fix that domain's invalidation defects (numbered findings from the spec, listed per task).
3. `npm run typecheck && npm run build`.
4. Commit.

**Before editing a file, grep it for every key it touches** — several files query one domain and invalidate another, and the mapping tables only list the keys each task owns. When a file you are editing invalidates a key belonging to a domain not yet migrated, leave that literal alone; the task that owns it will convert it.

---

### Task 3: Projects — list, selector, form, detail page

**Files:**
- Modify: `src/features/projects/pages/ProjectsPage.tsx:94-127`
- Modify: `src/features/projects/components/ProjectSelector.tsx:31`
- Modify: `src/features/projects/components/ProjectFormModal.tsx:69-92`
- Modify: `src/features/projects/pages/ProjectDetailPageV2.tsx:86-192`
- Modify: `src/features/dashboard/components/ManagerDashboard.tsx:41`
- Modify: `src/features/dashboard/components/DeveloperDashboard.tsx:39`
- Modify: `src/features/projects/components/sections/OverviewSection.tsx:662`

**Interfaces:**
- Consumes: `queryKeys.projects` from Task 2.

**Key mapping:**

| Old | New |
|---|---|
| `['projects', filters]` (ProjectsPage:94) | `queryKeys.projects.list(filters)` |
| `['projects-list']` (ProjectSelector:31) | `queryKeys.projects.list()` |
| `['projects', 'list']` | `queryKeys.projects.list()` |
| `['projects', 'filter-options']` (ProjectsPage:99) | `queryKeys.projects.filterOptions()` |
| `['project-filter-options']` (OverviewSection:662) | `queryKeys.projects.filterOptions()` |
| `['projects', 'stats']` | `queryKeys.projects.stats()` |
| `['projects', 'active', user?.id]` | `queryKeys.projects.active(user?.id)` |
| `['projects']` (ManagerDashboard:41) | `queryKeys.projects.all()` |
| `['projects', projectId]` / `['projects', pid]` | `queryKeys.projects.detail(id)` |

Note `queryKeys.projects.list()` with no argument resolves to `['projects','list',{}]`, which the filtered variant prefix-matches at `['projects','list']` — so invalidating `queryKeys.projects.all()` covers both the selector and the filtered table. This is what fixes finding #2.

**Defects to fix in this task:**

- [ ] **Step 1: #2 — ProjectSelector was unreachable**

`ProjectSelector.tsx:31` currently queries `['projects-list']`, a key no mutation in the app invalidates. Changing it to `queryKeys.projects.list()` is the entire fix — it now sits under the `['projects']` prefix.

- [ ] **Step 2: #1 — deleting a project leaves it in the list**

In `ProjectDetailPageV2.tsx`, the delete mutation around line 192 navigates away without invalidating. Add the invalidation to its `onSuccess`, before the navigate:

```tsx
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.projects.all() });
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
  message.success('Project deleted');
  navigate('/projects');
},
```

If `queryClient` is not already in scope in that component, add `const queryClient = useQueryClient();` alongside the other hooks and import `useQueryClient` from `@tanstack/react-query`.

- [ ] **Step 3: #12 — updating a project does not refresh the dashboard**

In `ProjectFormModal.tsx`, `createMutation` (around line 70) invalidates `['dashboard']` but `updateMutation` (around line 86) does not. Make both `onSuccess` handlers invalidate the same set:

```tsx
queryClient.invalidateQueries({ queryKey: queryKeys.projects.all() });
queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
```

- [ ] **Step 4: #41 — two names for the filter options**

Both `ProjectsPage.tsx:99` and `OverviewSection.tsx:662` now use `queryKeys.projects.filterOptions()`, so the duplicate key disappears and `queryKeys.projects.all()` invalidation reaches it.

- [ ] **Step 5: #85 — deep-link filter effect uses a ref it does not declare**

`ProjectsPage.tsx:108-127` reads `initialUserIdRef.current` but declares `[filterOptions]` as its dependency, so a second navigation to `/projects?user_id=…` while the page stays mounted does not re-apply the filter. Drive the effect from the URL instead of a ref — replace the ref read with the search param and declare it:

```tsx
const [searchParams] = useSearchParams();
const userIdParam = searchParams.get('user_id');

useEffect(() => {
  if (!userIdParam || !filterOptions) return;
  setFilters((prev) => ({ ...prev, user_id: Number(userIdParam) }));
}, [userIdParam, filterOptions]);
```

Import `useSearchParams` from `react-router-dom`. Delete `initialUserIdRef` and its initialization if nothing else reads it.

- [ ] **Step 6: Verify**

Run: `npm run typecheck && npm run build`
Expected: both exit 0.

Then `npm run dev` and confirm by hand: create a project → it appears in the ProjectSelector dropdown without a refresh; delete a project → it is gone from the list you land on.

- [ ] **Step 7: Commit**

```bash
git add src/features/projects src/features/dashboard
git commit -m "fix: project keys onto factory, restore list invalidation

ProjectSelector queried ['projects-list'], a key nothing invalidated, so
new and deleted projects never appeared. Delete now invalidates the list
it navigates back to, and update refreshes the dashboard like create did.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Todos

**Files:**
- Modify: `src/features/projects/components/TodoFormModal.tsx:76,89`
- Modify: `src/features/projects/components/sections/TodosSection.tsx:149,161,171,187,199`
- Modify: `src/features/projects/components/TodoDetailModal.tsx:196,206,213,226`
- Modify: `src/features/projects/components/SupportTicketsTab.tsx:220`
- Modify: `src/features/support/components/TicketDetailModal.tsx:164`
- Modify: `src/features/projects/components/SiteReviewCanvas.tsx:198`
- Modify: `src/features/dashboard/components/DeveloperDashboard.tsx:33`
- Modify: `src/features/reports/components/MaintenanceReportFormModal.tsx:81`

**Interfaces:**
- Consumes: `queryKeys.todos`, `queryKeys.projects`, `queryKeys.time`, `queryKeys.dashboard`.

**Key mapping:**

| Old | New |
|---|---|
| `['todos', 'my-tasks']` | `queryKeys.todos.myTasks()` |
| `['todos', 'completed', projectId]` | `queryKeys.todos.completed(projectId)` |
| `['time-entries', 'todo', todo?.id]` | `queryKeys.time.forTodo(todo?.id)` |

- [ ] **Step 1: #3 — define the shared invalidation**

Every todo mutation currently invalidates only `['projects', projectId]`, so the developer's "My Tasks" widget never updates. Rather than repeating three lines in nine places, add a small hook next to the todos section:

Create `src/features/projects/hooks/useInvalidateTodos.ts`:

```ts
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

/**
 * A todo write touches the project detail (todos list), the cross-project
 * "My Tasks" widget, and dashboard counters. Callers should not have to
 * remember all three.
 */
export function useInvalidateTodos() {
  const queryClient = useQueryClient();
  return (projectId: number | string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.todos.all() });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
  };
}
```

Check the import alias first: if `@/` is not configured in `tsconfig.json`/`vite.config.ts`, use the relative path `../../../lib/queryKeys` instead. Match whatever the neighbouring files already do.

- [ ] **Step 2: Adopt it in all nine todo mutations**

In each of `TodoFormModal.tsx` (2 mutations), `TodosSection.tsx` (5), and `TodoDetailModal.tsx` (2), replace the existing `queryClient.invalidateQueries({ queryKey: ['projects', projectId] })` in `onSuccess` with:

```tsx
const invalidateTodos = useInvalidateTodos();   // with the other hooks
// …
onSuccess: () => {
  invalidateTodos(projectId);
  // keep whatever success message / modal close already exists
},
```

- [ ] **Step 3: #4 — dead key in SupportTicketsTab**

`SupportTicketsTab.tsx:220` passes `invalidateKeys={[listKey, ['todos', project.id]]}`. The key `['todos', 5]` matches no query. Replace with the real ones:

```tsx
invalidateKeys={[listKey, queryKeys.todos.all(), queryKeys.projects.detail(project.id)]}
```

- [ ] **Step 4: #5 — ticket → todo does not reach the project**

In `TicketDetailModal.tsx`, `createTodoMutation` around line 164 calls only `invalidateAll()`. Add the project and todo invalidation to its `onSuccess`:

```tsx
onSuccess: () => {
  invalidateAll();
  queryClient.invalidateQueries({ queryKey: queryKeys.todos.all() });
  if (projectId) {
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
  }
  message.success('Todo created');
},
```

- [ ] **Step 5: #10 — site review → todo**

Same fix in `SiteReviewCanvas.tsx:198` — its `createTodoMutation` invalidates only the pins key. Add `queryKeys.todos.all()` and `queryKeys.projects.detail(projectId)` alongside the existing pins invalidation.

- [ ] **Step 6: #14 — logging time against a todo updates nothing**

`TodoDetailModal.tsx:213` (`logTimeMutation`) and `:226` (`deleteTimeMutation`) create and delete real time entries but only call the local `refetchTimeEntries()`. Replace that local refetch with real invalidation in both:

```tsx
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.time.all() });
  queryClient.invalidateQueries({ queryKey: queryKeys.timer.all() });
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
  queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all() });
  queryClient.invalidateQueries({ queryKey: queryKeys.financial.all() });
},
```

`queryKeys.time.all()` prefix-matches `queryKeys.time.forTodo(id)`, so the modal's own list refreshes too and `refetchTimeEntries` can go.

- [ ] **Step 7: Verify**

Run: `npm run typecheck && npm run build`
Expected: both exit 0.

By hand: open a project, complete a todo, then open the developer dashboard — "My Tasks" reflects it without a refresh.

- [ ] **Step 8: Commit**

```bash
git add src/features/projects src/features/support src/features/dashboard src/features/reports
git commit -m "fix: todo mutations refresh My Tasks and dashboard

All nine todo mutations invalidated only the project detail, so the
cross-project My Tasks widget and dashboard counters never updated.
SupportTicketsTab invalidated ['todos', id], a key matching no query.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: WordPress sections — core, plugins, themes, maintenance, security

This task covers spec findings #28–#38, #40 and #43. They are one task because they all collapse into the same one-line fix once the keys nest: invalidating `queryKeys.projects.detail(id)` refreshes health, updates, plugins, themes and recovery together.

**Files:**
- Modify: `src/features/projects/components/sections/CoreSection.tsx:55-70`
- Modify: `src/features/projects/components/sections/PluginsSection.tsx:146-153,198-269`
- Modify: `src/features/projects/components/sections/ThemesSection.tsx:84-104`
- Modify: `src/features/projects/components/sections/MaintenanceSection.tsx:68-184`
- Modify: `src/features/projects/components/sections/SecuritySection.tsx:93-134`
- Modify: `src/features/projects/components/sections/MediaSection.tsx:83-100`
- Modify: `src/features/projects/components/sections/BackupsSection.tsx:97`
- Modify: `src/features/projects/components/sections/SettingsSection.tsx:134-135`
- Modify: `src/features/projects/components/sections/MalwareSection.tsx:97-114`
- Modify: `src/features/projects/pages/ProjectDetailPageV2.tsx:124-170`

**Key mapping (this is where the duplicate names die):**

| Old | New |
|---|---|
| `['lsm-health', project.id]` | `queryKeys.projects.health(id)` |
| `['lsm-status', project.id]` / `['lsm-status', projectId]` | `queryKeys.projects.status(id)` |
| `['lsm-site-info', project.id]` | `queryKeys.projects.siteInfo(id)` |
| `['lsm-updates', project.id]` **and** `['project-updates', project.id]` | `queryKeys.projects.updates(id)` |
| `['project-plugins', project.id]` | `queryKeys.projects.plugins(id)` |
| `['project-themes', project.id]` | `queryKeys.projects.themes(id)` |
| `['lsm-recovery-status', …]` **and** `['project-recovery-status', …]` | `queryKeys.projects.recovery(id)` |
| `['project-db-stats', project.id]` | `queryKeys.projects.dbStats(id)` |
| `['lsm-security-settings', project.id]` | `queryKeys.projects.securitySettings(id)` |
| `['lsm-security-headers', project.id]` | `queryKeys.projects.securityHeaders(id)` |
| `['lsm-security-header-snippets', project.id]` | `queryKeys.projects.securityHeaderSnippets(id)` |
| `['security-scans', project.id]` | `queryKeys.projects.securityScans(id)` |
| `['security-scan-latest', project.id]` | `queryKeys.projects.securityScanLatest(id)` |

- [ ] **Step 1: Migrate all keys in the listed files per the table above**

Do this mechanically, file by file. After each file, re-grep it to confirm no raw literal remains:

```bash
grep -n "queryKey: \[" src/features/projects/components/sections/CoreSection.tsx
```
Expected: no output once the file is done.

- [ ] **Step 2: #28–#40 — every WordPress write refreshes the whole project**

These mutations each change server state that several sibling queries display. Replace their narrow (or missing) invalidation with the project prefix. In `CoreSection.tsx`, `PluginsSection.tsx`, `ThemesSection.tsx`, `MaintenanceSection.tsx`, `SecuritySection.tsx`, `MediaSection.tsx`, `BackupsSection.tsx` (`restoreMutation`), `SettingsSection.tsx` and `MalwareSection.tsx`, every mutation's `onSuccess` gets:

```tsx
queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(project.id) });
```

This single line replaces the enumerated child keys and is what fixes #28, #29, #30, #32, #35, #36, #37, #40 and #43 at once. Mutations that currently have **no** `onSuccess` at all — `MaintenanceSection.tsx:140,149` (enable/disableMaintenance, #33) and `:83,93,99` (clearCache, flushRewrite, optimizeDb, #34), `BackupsSection.tsx:97` (restore, #37) — need one added.

Do **not** delete the existing narrower invalidations where they also touch a *different* project or a non-project domain; only the redundant same-project child keys go.

- [ ] **Step 3: #31 — the auto-update toggle does nothing**

`PluginsSection.tsx:228` — `toggleAutoUpdateMutation` has no `mutationFn` calling the API; it resolves `{ success: false }` and the toggle silently does nothing.

**Already investigated — do not re-check.** `grep -rniE "auto.?update" ../lsm-api/routes/api.php` returns nothing: no auto-update endpoint exists on the server. The feature is unimplemented backend-side.

**Decision (confirmed with the product owner 2026-07-19): disable the toggle, keep it visible.** Do not delete the control — the feature is wanted later. Do not fake it either.

Render the toggle `disabled` and wrap it in a tooltip explaining why:

```tsx
<Tooltip title="Auto-update management is not available yet">
  <Switch
    checked={plugin.auto_update}
    disabled
    // no onChange — the mutation is removed
  />
</Tooltip>
```

Delete `toggleAutoUpdateMutation` entirely, along with any `onChange` handler that called it. A control that reports success while doing nothing is worse than no control; a visibly disabled one is honest.

- [ ] **Step 4: #88 — remove the debug logging**

`PluginsSection.tsx:146-153` has `console.log('🔍 [PLUGIN MAPPING] …')` inside a `useMemo` map, firing on every recompute in production. Delete the log statement, keep the mapping.

- [ ] **Step 5: Verify**

Run: `npm run typecheck && npm run build`
Expected: both exit 0.

Then confirm no legacy literals survive anywhere:

```bash
grep -rn "'lsm-\|'project-plugins'\|'project-themes'\|'project-updates'\|'project-db-stats'\|'security-scan" src/
```
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/features/projects
git commit -m "fix: WordPress section keys nest under project, unify duplicates

lsm-updates/project-updates and lsm-recovery-status/project-recovery-status
were two names for the same data, so updating a plugin left the sidebar
badge and recovery banner stale. Nesting under ['projects', id] means one
prefix invalidation refreshes all of it. Maintenance and restore mutations
had no onSuccess at all.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5b: WordPress duplicates and stragglers

**Added 2026-07-19 during execution.** Task 5's file list omitted the three duplicate WordPress management components covered by spec finding #39, plus two stragglers. This is a gap in the plan, not in Task 5's execution — Task 5 correctly stayed inside its stated scope and flagged these.

**Files:**
- Modify: `src/features/projects/components/WordPressManagementTab.tsx` (5 legacy keys)
- Modify: `src/features/projects/components/WordPressManagementDrawer.tsx` (3)
- Modify: `src/features/projects/components/WordPressManagement.tsx` (2)
- Modify: `src/features/projects/components/ConnectWordPressCard.tsx:60`
- Modify: `src/features/projects/components/sections/OverviewSection.tsx:67,155`
- Modify: `src/features/projects/pages/ProjectDetailPageV2.tsx` (maintenance mutations)

Use the same key mapping table as Task 5. `['lsm-status', id]` → `queryKeys.projects.status(id)`, `['lsm-health', id]` → `queryKeys.projects.health(id)`, `['lsm-site-info', id]` → `queryKeys.projects.siteInfo(id)`.

**Do not migrate these — they are false positives, not query keys:** `src/stores/timer.ts:63`, `src/stores/auth.ts:65`, `src/stores/theme.ts:63` (zustand persist storage names), `src/lib/i18n.ts:2642` (localStorage lookup key), `SiteReviewCanvas.tsx:237` (a postMessage event type). They merely contain the string `lsm-`.

- [ ] **Step 1: Migrate the keys per the Task 5 mapping table**

- [ ] **Step 2: #39 — the three duplicates have inconsistent invalidation**

`WordPressManagement.tsx` invalidates after its core update; `WordPressManagementTab.tsx` and `WordPressManagementDrawer.tsx` do not. Across all three, these mutations have zero invalidation: clearCache, optimizeDb, flushRewrite, enableMaintenance, disableMaintenance, disablePlugins, restorePlugins, emergencyRecovery, and no `updateAllPlugins` handler invalidates the updates key.

Give every mutation in all three files the project prefix in `onSuccess`, adding `onSuccess` where absent:

```tsx
queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(project.id) });
```

Match the actual prop name for the project in each component — it may be `project`, `projectId`, or destructured differently.

- [ ] **Step 3: ProjectDetailPageV2 maintenance mutations**

That page has its own `enableMaintenanceMutation` / `disableMaintenanceMutation` with no cache invalidation — the same defect as Task 5's finding #33, in a file Task 5 did not own. Give both the project-detail invalidation. If they currently call a local `refetchRecoveryStatus()`, the prefix invalidation covers it and the local refetch can go.

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npm run build` — both exit 0.

Then:
```bash
grep -rn "queryKey: \['lsm-\|queryKey: \['project-" src/
```
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add src/features/projects
git commit -m "fix: WordPress duplicate components and straggler keys

Three near-duplicate WordPress management components had inconsistent
invalidation — most of their mutations had none at all. Completes the key
migration Task 5 began; its file list had omitted these.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

**Recorded debt, not done here:** spec #39 also proposes consolidating these three near-duplicate components into one. That is a refactor with its own risk profile, not a freshness fix — leave it for a follow-up and keep this task mechanical.

---

### Task 6: Time tracking — entries, timer, timesheets, invoices, financial

Spec findings #6, #13, #15, #16, #17.

**Files:**
- Modify: `src/features/time/pages/MyTimePage.tsx:163-196`
- Modify: `src/features/time/pages/ApprovalsPage.tsx:96,131,140`
- Modify: `src/features/time/pages/InvoicesPage.tsx:204-236`
- Modify: `src/features/time/pages/FinancialReportsPage.tsx:114-157`
- Modify: `src/features/time/pages/AnalyticsPage.tsx:88`
- Modify: `src/features/time/components/TimerWidget.tsx:47-137`
- Modify: `src/features/time/components/FloatingTimerWidget.tsx:94-188`
- Modify: `src/features/dashboard/components/widgets/ActiveTimerWidget.tsx:30-31`
- Modify: `src/features/dashboard/components/widgets/ApprovalsWidget.tsx:18`
- Modify: `src/features/dashboard/components/DeveloperDashboard.tsx:26`

**Key mapping:**

| Old | New |
|---|---|
| `['time-entries', view, …, page]` | `queryKeys.time.entries({ view, date, range, page })` |
| `['time-entries', 'today']` | `queryKeys.time.today()` |
| `['time-entries', 'today-stats']` | `queryKeys.time.todayStats()` |
| `['timer', 'current']` | `queryKeys.timer.current()` |
| `['timer', 'projects']` | `queryKeys.timer.projects()` |
| `['timer', 'todos', selectedProject]` | `queryKeys.timer.todos(selectedProject)` |
| `['timesheets', 'pending']` | `queryKeys.timesheets.pending()` |
| `['invoices', statusFilter, …]` | `queryKeys.invoices.list({ status, from, to, developer })` |
| `['invoices', 'detail', id]` | `queryKeys.invoices.detail(id)` |
| `['financial', 'approved', filters]` | `queryKeys.financial.approved(filters)` |
| `['financial', 'summary', filters]` | `queryKeys.financial.summary(filters)` |
| `['analytics', 'entries', filters]` | `queryKeys.analytics.entries(filters)` |

- [ ] **Step 1: Define the shared money-and-time invalidation**

Time entries feed timesheets, invoices, financial reports, analytics and the dashboard. Every one of the five pages above currently invalidates a different subset, which is why the two financial screens permanently disagree (#17).

Create `src/features/time/hooks/useInvalidateTimeData.ts`:

```ts
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

/**
 * Time entries roll up into timesheets, invoices, financial reports and
 * analytics. Any write to one of them must refresh the others, or the
 * screens disagree with each other.
 */
export function useInvalidateTimeData() {
  const queryClient = useQueryClient();
  return () => {
    for (const key of [
      queryKeys.time.all(),
      queryKeys.timer.all(),
      queryKeys.timesheets.all(),
      queryKeys.invoices.all(),
      queryKeys.financial.all(),
      queryKeys.analytics.all(),
      queryKeys.dashboard.all(),
    ]) {
      queryClient.invalidateQueries({ queryKey: key });
    }
  };
}
```

- [ ] **Step 2: Adopt it across every time mutation**

Replace the `onSuccess` invalidation body in each of these with a single `invalidateTimeData()` call, keeping any existing message/modal logic:

- `MyTimePage.tsx:163,179,191` (create/update/delete entry) and `:196` (submit timesheet — fixes #6, the manager's approval queue)
- `ApprovalsPage.tsx:131` (approve) and `:140` (reject — fixes #16, the stale invoice row)
- `InvoicesPage.tsx:204,220,236` (approve/decline/markPaid — fixes #17)
- `FinancialReportsPage.tsx:157` (fixes the mirror of #17)
- `TimerWidget.tsx:82,96,110` and `FloatingTimerWidget.tsx:137,151,165` (start/stop/discard — fixes #13)
- `ActiveTimerWidget.tsx:30-31`

- [ ] **Step 3: #74, #75 — polling gaps on other-people's data**

`ApprovalsWidget.tsx:17-20` shows pending timesheets, which only other people create. Add an interval to its `useQuery`:

```tsx
refetchInterval: 60_000,
```

Do the same for the four `ManagerDashboard.tsx` queries at `:26,31,36,41` — it is the only one of three role dashboards without polling (`AdminDashboard.tsx:56` and `DeveloperDashboard.tsx:28` already use 60s).

- [ ] **Step 4: #82 — Rules of Hooks violation**

`FloatingTimerWidget.tsx:71` returns `null` for admins *before* `useTimerStore()` and the `useQuery`/`useState` calls beneath it. If `user.role` ever changes while the component is mounted, the hook count changes between renders and React throws.

Move the early return below every hook call:

```tsx
export function FloatingTimerWidget() {
  const user = useAuthStore((s) => s.user);
  const { runningTimer, setRunningTimer } = useTimerStore();
  const { data: currentTimer } = useQuery({ /* … unchanged … */ });
  // … all remaining hooks, unchanged …

  // Hooks are all called; safe to bail out now.
  if (user?.role === 'admin') return null;

  return ( /* … unchanged … */ );
}
```

- [ ] **Step 5: #83 — the timer store never re-syncs**

`FloatingTimerWidget.tsx:170-188` and `TimerWidget.tsx:118-137` both guard with `&& !runningTimer`, so the store is filled only when empty. Since `stores/timer.ts` persists to localStorage, a timer started on another device is never picked up and a stale persisted timer survives forever — a page refresh does not fix this one.

The server is the source of truth, so the sync must not gate on the store's current value — that gate is the bug.

**Corrected during execution 2026-07-19.** An earlier draft of this step prescribed a fully unconditional `setRunningTimer(currentTimer?.data ?? null)`. That was wrong on two counts, both confirmed in review:

1. **Shape mismatch.** The store's `RunningTimer` needs flat `project_name` / `todo_id` / `todo_name`; the API returns nested `project` / `todo` objects. The raw value type-checks but renders `undefined`. A transform is required.
2. **Mount-time false clear.** Zustand's `persist` rehydrates synchronously before first render, and `currentTimer?.data` is `undefined` both *before the first fetch resolves* and *when nothing is running*. Writing `null` without distinguishing those two states destroys a legitimately running persisted timer on every mount — strictly worse than the bug being fixed.

The correct shape gates on **fetch state**, never on `runningTimer`:

```tsx
useEffect(() => {
  // Defer until the in-flight fetch settles, so an unresolved query is not
  // mistaken for "nothing is running" and does not wipe a rehydrated timer.
  if (isFetching) return;
  // Deliberately does NOT read runningTimer: gating on the store's current
  // value is what made this write-once and unfixable by refresh.
  if (currentTimer?.data) {
    setRunningTimer(toRunningTimer(currentTimer.data));
  } else {
    clearTimer();
  }
}, [isFetching, currentTimer?.data, setRunningTimer, clearTimer]);
```

`isFetching` in the dependency array is what makes this recur: each poll transitions it true→false, so the effect re-evaluates against the server's current answer every interval. `setRunningTimer` already accepts `null` in `src/stores/timer.ts` — no type widening needed.

- [ ] **Step 6: Verify**

Run: `npm run typecheck && npm run build`
Expected: both exit 0.

By hand: log time on MyTimePage, then open Financial Reports and Invoices — both reflect it without a refresh. Start a timer, stop it from a second tab, confirm the first tab's widget clears within a minute.

- [ ] **Step 7: Commit**

```bash
git add src/features/time src/features/dashboard
git commit -m "fix: time writes refresh timesheets, invoices and financials

Every time page invalidated a different subset, so the two financial
screens permanently disagreed and submitted timesheets never reached the
manager's approval queue. Also fixes a Rules of Hooks violation in
FloatingTimerWidget and makes the server authoritative for the running
timer, which localStorage persistence had made unfixable by refresh.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Team, availability, tags

Spec findings #18, #19, #20, #21, #22.

**Files:**
- Modify: `src/features/team/pages/TeamPage.tsx:138-209`
- Modify: `src/features/team/components/SetAvailabilityModal.tsx:73-82`
- Modify: `src/features/dashboard/components/AdminDashboard.tsx:54-75`
- Modify: `src/features/tags/pages/TagsPage.tsx:56-86`
- Modify: `src/features/projects/components/sections/OverviewSection.tsx:668-682`

**Key mapping:**

| Old | New |
|---|---|
| `['team', { search, role, tag }]` | `queryKeys.team.list({ search, role, tag })` |
| `['team']` | `queryKeys.team.all()` |
| `['availability']` | `queryKeys.availability.all()` |
| `['tags']` | `queryKeys.tags.all()` |

- [ ] **Step 1: #18, #19, #20 — team and availability move together**

A user's team record, their availability and their appearance as a project assignee are the same underlying data. Every mutation in `TeamPage.tsx:161,185,209`, `SetAvailabilityModal.tsx:73,82` and `AdminDashboard.tsx:70` gets the full set in `onSuccess`:

```tsx
queryClient.invalidateQueries({ queryKey: queryKeys.team.all() });
queryClient.invalidateQueries({ queryKey: queryKeys.availability.all() });
queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
queryClient.invalidateQueries({ queryKey: queryKeys.projects.all() });
```

The `projects.all()` line is what stops a deleted user from remaining listed as an assignee on project cards.

- [ ] **Step 2: #21 — assignment changes do not refresh the list**

`OverviewSection.tsx:668` (`updateDevelopersMutation`) and `:682` (`updateManagersMutation`) invalidate only `queryKeys.projects.detail(id)`. The projects *list* shows assignee avatars, so add:

```tsx
queryClient.invalidateQueries({ queryKey: queryKeys.projects.all() });
queryClient.invalidateQueries({ queryKey: queryKeys.team.all() });
queryClient.invalidateQueries({ queryKey: queryKeys.availability.all() });
```

`projects.all()` prefix-matches `projects.detail(id)`, so the existing detail invalidation becomes redundant and can go.

- [ ] **Step 3: #22 — renaming a tag leaves stale chips**

`TagsPage.tsx:56,71,86` invalidate `queryKeys.tags.all()` only, while tag chips render on project rows and team rows. Add to all three:

```tsx
queryClient.invalidateQueries({ queryKey: queryKeys.projects.all() });
queryClient.invalidateQueries({ queryKey: queryKeys.team.all() });
```

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npm run build`
Expected: both exit 0.

By hand: rename a tag, then open the projects list — the chip shows the new name without a refresh.

- [ ] **Step 5: Commit**

```bash
git add src/features/team src/features/tags src/features/dashboard src/features/projects
git commit -m "fix: team, availability and tag writes refresh their consumers

Team mutations invalidated only ['team'], leaving deleted users listed as
project assignees and stale tag chips on project and team rows.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Credentials and vault

Spec findings #7, #27, #42, plus the two security defects #58 and #63, which live in these same files and should not be left in the tree once it is open.

**Files:**
- Modify: `src/features/vault/pages/VaultPage.tsx:65,106`
- Modify: `src/features/vault/components/AddCredentialModal.tsx:64`
- Modify: `src/features/vault/components/EditCredentialModal.tsx:78`
- Modify: `src/features/vault/components/ShareCredentialModal.tsx:43,49`
- Modify: `src/features/projects/components/sections/CredentialsSection.tsx:81,390`
- Modify: `src/features/projects/components/CredentialFormModal.tsx:88-107`
- Modify: `src/features/projects/components/ManageCredentialAccessModal.tsx:60-66`
- Modify: `src/features/projects/components/CredentialViewModal.tsx:75`

**Key mapping:**

| Old | New |
|---|---|
| `['vault', filters]` | `queryKeys.vault.list(filters)` |
| `['project-credentials', project.id]` | `queryKeys.projects.credentials(id)` |
| `['credential-access', credential?.id]` | `queryKeys.vault.access(credential?.id)` |

- [ ] **Step 1: Define the shared credential invalidation**

Create `src/features/vault/hooks/useInvalidateCredentials.ts`:

```ts
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

/**
 * The same credential is listed both in the vault and on its project's
 * Credentials tab. Writes from either side must refresh both.
 */
export function useInvalidateCredentials() {
  const queryClient = useQueryClient();
  return (projectId?: number | string | null) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.vault.all() });
    if (projectId != null) {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.credentials(projectId) });
    }
  };
}
```

- [ ] **Step 2: #7, #27, #42 — adopt it**

Use it in `AddCredentialModal.tsx:64`, `EditCredentialModal.tsx:78`, `ShareCredentialModal.tsx:49`, `ManageCredentialAccessModal.tsx:66` and both branches of `CredentialFormModal.tsx:88-107`. `CredentialFormModal` already invalidates both sides correctly — replacing its body with the hook keeps behaviour identical and removes the divergence that made the vault modals wrong.

- [ ] **Step 3: #58 — the access modal can grant the wrong credential's permissions**

This is a data-integrity bug, not staleness. `ManageCredentialAccessModal.tsx:60-64`:

```tsx
useEffect(() => { if (data) setSelectedUserIds(data.granted_user_ids ?? []) }, [data]);
```

The modal is permanently mounted (`CredentialsSection.tsx:390` renders it with `open={!!accessCredential}`, no `destroyOnClose`, no `key`). Opening credential B leaves `data` undefined while its query loads, the `if (data)` guard blocks the reset, and the checkboxes still show credential A's users. Saving then grants A's access list to B.

Fix at the mount boundary so no stale state can survive an open — in `CredentialsSection.tsx:390`:

```tsx
{accessCredential && (
  <ManageCredentialAccessModal
    key={accessCredential.id}
    credential={accessCredential}
    open
    onClose={() => setAccessCredential(null)}
  />
)}
```

Then, inside the modal, disable the save button while the query is in flight so it cannot be submitted against unloaded data:

```tsx
const { data, isPending } = useQuery({ /* … */ });
// …
<Button type="primary" onClick={handleSave} disabled={isPending} loading={isSaving}>
  Save
</Button>
```

- [ ] **Step 4: #63 — revealed secrets leak into the next open**

`CredentialViewModal.tsx:75` (`revealedPassword`) and `ShareCredentialModal.tsx:43` (`generatedLink`) live in permanently-mounted outer components and are cleared only by `handleClose`. Any close path that bypasses `onCancel` — the parent setting its record state to `null` directly — leaves the previous credential's revealed secret in state for the next open. `destroyOnClose` on the inner `<Modal>` does not help, because the state is declared in the outer component.

Apply the same `key`-on-record fix at both call sites so the component unmounts with its secret:

```tsx
{viewingCredential && (
  <CredentialViewModal key={viewingCredential.id} credential={viewingCredential} open /* … */ />
)}
```

- [ ] **Step 5: #47 — check whether reveals need invalidation**

Reveal mutations (`VaultPage.tsx:106`, `CredentialsSection.tsx:85`, `CredentialViewModal.tsx:78`) currently invalidate nothing. That is correct only if the server records nothing. Check:

```bash
grep -rn "reveal" ../lsm-api/app/Http/Controllers/ | grep -i "log\|audit\|view_count\|accessed"
```

If a reveal writes an access-log row or increments a counter that the vault list or activity log displays, add `queryClient.invalidateQueries({ queryKey: queryKeys.vault.all() })` to each. If it writes nothing, leave them and note it in the commit message.

- [ ] **Step 6: Verify**

Run: `npm run typecheck && npm run build`
Expected: both exit 0.

By hand, specifically for #58: open credential A's access modal, close it, immediately open credential B's — the checkboxes must be empty or B's, never A's, and Save must be disabled until loaded.

- [ ] **Step 7: Commit**

```bash
git add src/features/vault src/features/projects
git commit -m "fix: credential access modal could grant the wrong permissions

The modal stayed mounted between opens and its reset was guarded by
if (data), so opening a second credential while its query loaded left the
previous credential's user checkboxes selected — saving then granted that
list to the wrong credential. Keyed on the record so it unmounts, and Save
is disabled until loaded. Same fix stops revealed secrets leaking into the
next open. Vault writes now also refresh the project Credentials tab.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Support tickets

Spec findings #11, #72, #73.

**Files:**
- Modify: `src/features/support/pages/SupportPage.tsx:49-65`
- Modify: `src/features/projects/components/SupportTicketsTab.tsx:56-68`
- Modify: `src/features/support/components/TicketDetailModal.tsx:127-131`

**Key mapping:**

| Old | New |
|---|---|
| `['support-ticket-detail', ticket?.id]` | `queryKeys.supportTickets.detail(ticket?.id)` |
| the local `listKey` variable | `queryKeys.supportTickets.list(filters)` |

- [ ] **Step 1: #11 — read receipts never take effect**

`SupportPage.tsx:65` and `SupportTicketsTab.tsx:68` call `api.supportTickets.markAsRead(ticket.id)` as a bare fire-and-forget outside any mutation, so the unread badge and the row highlight persist after reading.

Wrap it in a mutation that invalidates:

```tsx
const markAsReadMutation = useMutation({
  mutationFn: (id: number) => api.supportTickets.markAsRead(id),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.supportTickets.all() });
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
  },
});
```

Call `markAsReadMutation.mutate(ticket.id)` at the existing call sites.

- [ ] **Step 2: #72 — the ticket inbox does not refresh**

Both list queries have `staleTime: 30000` and no interval, so a client's new ticket never appears without navigating. Add to `SupportPage.tsx:49` and `SupportTicketsTab.tsx:56`:

```tsx
refetchInterval: 60_000,
```

- [ ] **Step 3: #73 — the conversation thread does not refresh**

`TicketDetailModal.tsx:127-131` has no interval, so an agent with the modal open never sees the client's reply arrive. Poll only while it is open, mirroring `NotificationsPopover.tsx:99-104`:

```tsx
const { data: detail } = useQuery({
  queryKey: queryKeys.supportTickets.detail(ticket?.id),
  queryFn: () => api.supportTickets.get(ticket!.id),
  enabled: open && !!ticket,
  refetchInterval: open ? 10_000 : false,
});
```

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npm run build`
Expected: both exit 0.

By hand: open a ticket in two browser tabs, reply in one — the other shows the reply within ten seconds.

- [ ] **Step 5: Commit**

```bash
git add src/features/support src/features/projects
git commit -m "fix: ticket inbox and thread refresh, read receipts invalidate

markAsRead was a bare fire-and-forget call, so the unread badge survived
reading the ticket. The inbox and the open conversation now poll, since
both change from the client's side without staff acting.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Reports, resources, library, site reviews, GDPR

Spec findings #8, #9, #24, #25.

**Files:**
- Modify: `src/features/reports/pages/MaintenanceReportsPage.tsx:47-93`
- Modify: `src/features/reports/components/MaintenanceReportFormModal.tsx:81-91`
- Modify: `src/features/projects/components/sections/ReportsSection.tsx:53`
- Modify: `src/features/projects/components/sections/ResourcesSection.tsx:72-105`
- Modify: `src/features/library/LibraryResourcesPage.tsx:77-126`
- Modify: `src/features/projects/components/sections/SiteReviewsSection.tsx`
- Modify: `src/features/projects/components/sections/GdprAuditSection.tsx:194`
- Modify: `src/features/share/pages/SiteReviewSharePage.tsx:34`

**Key mapping:**

| Old | New |
|---|---|
| `['project-reports', project.id]` **and** `['projects', pid, 'reports']` | `queryKeys.projects.reports(id)` |
| `['library-resources']` | `queryKeys.library.list(filters)` |
| `['library-resources-categories']` | `queryKeys.library.categories()` |
| `['site-reviews', project.id]` | `queryKeys.projects.siteReviews(id)` |
| `['gdpr-audit', project.id]` | `queryKeys.projects.gdprAudit(id)` |
| `['review-share-info', token]` | `queryKeys.share.reviewInfo(token)` |

- [ ] **Step 1: #8 — the two report key schemes collapse**

`MaintenanceReportsPage.tsx:80,93` used `['projects', pid, 'reports']` while `ReportsSection.tsx:53` used `['project-reports', id]`. Both become `queryKeys.projects.reports(id)`, which resolves #8 by itself. `MaintenanceReportFormModal.tsx:90-91` currently invalidates both schemes defensively — collapse it to the single key.

- [ ] **Step 2: #9 — GDPR report is saved but never shown**

`GdprAuditSection.tsx:194` — `saveToReportsMutation` invalidates nothing. Add:

```tsx
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.projects.reports(project.id) });
  message.success('Saved to reports');
},
```

- [ ] **Step 3: #24 — a new category never reaches the filter**

`LibraryResourcesPage.tsx:95,111,126` invalidate the resource list but never the categories query at `:83`. Add to all three:

```tsx
queryClient.invalidateQueries({ queryKey: queryKeys.library.all() });
```

`library.all()` prefix-matches both `library.list()` and `library.categories()`, so one line covers it.

- [ ] **Step 4: #25 — deleting a resource leaves it in the library**

`ResourcesSection.tsx:82,92,105` invalidate the project only. Add `queryKeys.library.all()` to all three.

- [ ] **Step 5: Verify**

Run: `npm run typecheck && npm run build`
Expected: both exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/features/reports src/features/library src/features/projects src/features/share
git commit -m "fix: report and library keys unified, cross-view invalidation

project-reports and ['projects', id, 'reports'] were the same data under
two names, so reports created from the standalone page never appeared on
the project. GDPR save-to-reports invalidated nothing at all.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 10b: lsm-api — self-service change-password endpoint

**Different repository.** This task runs in `/Users/bmarkovic/Documents/Projects/LSMPlatform/lsm-api`, not `lsm-web`. It must be completed **before Task 11 Step 4**, which wires the frontend form to it.

Added 2026-07-19 after the audit found `ProfilePage.tsx:74` faking a successful password change. `lsm-api` has only the public token-based `POST /reset-password` and the admin `POST /team/{user}/reset-password` — no authenticated user can change their own password. The product owner chose to build the endpoint rather than remove the form.

**Files:**
- Modify: `app/Http/Controllers/Api/V1/AuthController.php`
- Modify: `routes/api.php` (near line 119, beside the existing `PUT /user/profile`)
- Create: `tests/Feature/Auth/ChangePasswordTest.php`

**Interfaces:**
- Produces: `PUT /api/v1/user/password`, auth:sanctum. Body `{ current_password, password, password_confirmation }`. Returns 200 `{ success: true }`; 422 on validation failure or wrong current password.

**Constraints for this repo:**
- Branch: create `fix/change-password-endpoint` from `main`.
- **This repo has a real test harness — use TDD.** `./vendor/bin/pest`. Tests run on SQLite `:memory:`, which behaves differently from production MySQL on enum columns; this task touches no enums, so it is not a concern here.
- Follow the shape of the neighbouring `updateProfile` method in the same controller.

- [ ] **Step 1: Write the failing test**

```php
<?php
// tests/Feature/Auth/ChangePasswordTest.php

use App\Models\User;
use Illuminate\Support\Facades\Hash;

it('changes the password when the current password is correct', function () {
    $user = User::factory()->create(['password' => Hash::make('old-password-123')]);

    $response = $this->actingAs($user)->putJson('/api/v1/user/password', [
        'current_password' => 'old-password-123',
        'password' => 'new-password-456',
        'password_confirmation' => 'new-password-456',
    ]);

    $response->assertOk()->assertJson(['success' => true]);
    expect(Hash::check('new-password-456', $user->fresh()->password))->toBeTrue();
});

it('rejects a wrong current password and leaves the password unchanged', function () {
    $user = User::factory()->create(['password' => Hash::make('old-password-123')]);

    $response = $this->actingAs($user)->putJson('/api/v1/user/password', [
        'current_password' => 'wrong-password',
        'password' => 'new-password-456',
        'password_confirmation' => 'new-password-456',
    ]);

    $response->assertStatus(422)->assertJsonValidationErrors('current_password');
    expect(Hash::check('old-password-123', $user->fresh()->password))->toBeTrue();
});

it('rejects a confirmation mismatch', function () {
    $user = User::factory()->create(['password' => Hash::make('old-password-123')]);

    $response = $this->actingAs($user)->putJson('/api/v1/user/password', [
        'current_password' => 'old-password-123',
        'password' => 'new-password-456',
        'password_confirmation' => 'different-456',
    ]);

    $response->assertStatus(422)->assertJsonValidationErrors('password');
});

it('requires authentication', function () {
    $this->putJson('/api/v1/user/password', [
        'current_password' => 'old-password-123',
        'password' => 'new-password-456',
        'password_confirmation' => 'new-password-456',
    ])->assertUnauthorized();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `./vendor/bin/pest tests/Feature/Auth/ChangePasswordTest.php`
Expected: FAIL — the route does not exist, so the requests 404 rather than matching the assertions.

- [ ] **Step 3: Add the controller method**

In `app/Http/Controllers/Api/V1/AuthController.php`, beside `updateProfile`:

```php
public function changePassword(Request $request)
{
    $validated = $request->validate([
        'current_password' => ['required', 'string'],
        'password' => ['required', 'string', Password::defaults(), 'confirmed'],
    ]);

    $user = $request->user();

    if (! Hash::check($validated['current_password'], $user->password)) {
        throw ValidationException::withMessages([
            'current_password' => __('The provided password does not match your current password.'),
        ]);
    }

    $user->update(['password' => Hash::make($validated['password'])]);

    return response()->json(['success' => true]);
}
```

Add the imports the file does not already have: `Illuminate\Support\Facades\Hash`, `Illuminate\Validation\ValidationException`, `Illuminate\Validation\Rules\Password`.

- [ ] **Step 4: Register the route**

In `routes/api.php`, immediately after the existing `PUT /user/profile` line (~119):

```php
Route::put('/user/password', [V1\AuthController::class, 'changePassword'])->name('user.change-password');
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `./vendor/bin/pest tests/Feature/Auth/ChangePasswordTest.php`
Expected: 4 passed.

Then the full suite, to confirm nothing regressed:

Run: `./vendor/bin/pest`
Expected: no new failures relative to the pre-change baseline. Record the before/after counts in the report.

- [ ] **Step 6: Commit**

```bash
git add app/Http/Controllers/Api/V1/AuthController.php routes/api.php tests/Feature/Auth/ChangePasswordTest.php
git commit -m "feat: self-service change-password endpoint

The web profile page had a change-password form wired to a stub that
resolved successfully without calling any API, so users believed they had
changed passwords they had not. No authenticated self-service endpoint
existed — only the public reset flow and the admin reset.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: Settings, notifications, activity, profile

Spec findings #23, #26, #44, #51, #71, #76.

**Files:**
- Modify: `src/features/settings/pages/SettingsPage.tsx:86-124`
- Modify: `src/components/common/NotificationsPopover.tsx:81-117`
- Modify: `src/features/notifications/NotificationsPage.tsx:118-145`
- Modify: `src/features/admin/pages/ActivityPage.tsx:68-71`
- Modify: `src/features/projects/components/sections/ActivitySection.tsx:70-81`
- Modify: `src/features/profile/pages/ProfilePage.tsx:58-172`

**Key mapping:**

| Old | New |
|---|---|
| `['settings']` | `queryKeys.settings.all()` |
| `['backup-settings']` | `queryKeys.settings.backup()` |
| `['notifications', …]` | `queryKeys.notifications.*` |
| `['activity', filters]` | `queryKeys.activity.list(filters)` |
| `['activity-log', project.id, actionFilter]` | `queryKeys.projects.activityLog(id, { action: actionFilter })` |
| `['activity-stats', project.id]` | `queryKeys.projects.activityStats(id)` |

- [ ] **Step 1: #23 — saving settings does not refresh backup settings**

`SettingsPage.tsx:124` PUTs a payload containing both `uptime` and `backup` sections but invalidates `queryKeys.settings.all()` only, while `['backup-settings']` is a sibling key queried at `:86` and at `OverviewSection.tsx:584`. Nesting it as `queryKeys.settings.backup()` (`['settings','backup']`) puts it under the `settings.all()` prefix, so the existing single invalidation now covers it. No extra line needed — but verify both call sites were migrated.

- [ ] **Step 2: #26, #76 — the activity log updates for nobody**

Nearly every mutation writes an audit row, and nothing anywhere invalidates the activity queries. Rather than adding an activity invalidation to all ~150 mutations, poll — an audit feed of other users' actions needs polling regardless.

`ActivityPage.tsx:68` and `ActivitySection.tsx:70,81`:

```tsx
refetchInterval: 60_000,
```

Combined with focus refetching from Task 1, this is sufficient. Note in the commit that activity is deliberately poll-driven, not invalidation-driven.

- [ ] **Step 3: #71 — the notifications page is staler than the badge above it**

`NotificationsPage.tsx:118-121` has no interval while the header popover polls at 10s, so the badge can read "3 new" while the list below shows none — on the same screen. Match the popover:

```tsx
refetchInterval: 30_000,
```

30s rather than 10s: the full page is a heavier query and is not a glanceable badge.

- [ ] **Step 4: #44 — profile mutations, and the password stub**

Add to the `onSuccess` of `ProfilePage.tsx:58` (updateProfile) and `:93` (updateBilling):

```tsx
queryClient.invalidateQueries({ queryKey: queryKeys.team.all() });
```

`:74` `changePasswordMutation` is **`Promise.resolve({ success: true })`** — it shows a success toast without calling any API, so a user who "changed" their password there did not.

**Already investigated — do not re-check.** `lsm-api` has only `POST /reset-password` (public, token-based forgot-password flow) and `POST /team/{user}/reset-password` (admin resetting someone else's). **No authenticated self-service change-password endpoint exists.**

**Decision (confirmed with the product owner 2026-07-19): build the endpoint.** It is covered by **Task 14 of this plan**, in the `lsm-api` repo. Task 14 runs *before* this step.

In this step, wire the existing form to the endpoint Task 10b created.

**The endpoint as actually built is `PUT /user/password`** (relative to the client's `/api/v1` base), not the `POST /profile/change-password` an earlier draft of this plan guessed at. Use the real one.

Note also: on 422 this endpoint returns Laravel's default `{message, errors}` shape with **no top-level `success` key** — same as the existing `updateProfile` endpoint, since both use raw `$request->validate()`. A `success === false` check will not fire; read `error.response.data.message`.

```tsx
const changePasswordMutation = useMutation({
  mutationFn: (values: { current_password: string; password: string; password_confirmation: string }) =>
    apiClient.put('/user/password', values),
  onSuccess: () => {
    message.success('Password changed');
    passwordForm.resetFields();
  },
  onError: (error: any) => {
    message.error(error?.response?.data?.message ?? 'Could not change password');
  },
});
```

The form must send `current_password` — verify the form has that field and add it if not. Do **not** ship this step until Task 14 is merged and the endpoint responds.

The remaining 2FA mutations (`:117,127,141,152,163,172`) have no dependent query today (#45); leave them, they are covered when Phase 3 introduces the `auth.me` query.

- [ ] **Step 5: Verify**

Run: `npm run typecheck && npm run build`
Expected: both exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/features/settings src/features/notifications src/features/admin src/features/profile src/components/common src/features/projects
git commit -m "fix: settings, activity and notifications freshness

backup-settings now nests under settings so one invalidation covers both.
Activity feeds poll, since almost every mutation writes an audit row and
invalidating from all of them is not maintainable. Notifications page no
longer lags the badge in the header above it.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 12: Remaining project surfaces — uptime, php errors, backups list, malware

Sweeps up the keys not owned by any earlier task, plus finding #77.

**Files:**
- Modify: `src/features/projects/components/sections/UptimeSection.tsx:44-51,74-75,333-334`
- Modify: `src/features/projects/components/sections/OverviewSection.tsx:143-150,202,584`
- Modify: `src/features/projects/components/sections/PhpErrorsSection.tsx`
- Modify: `src/features/projects/components/sections/BackupsSection.tsx:59-64`
- Modify: `src/features/projects/pages/ProjectsPage.tsx:94`

**Key mapping:**

| Old | New |
|---|---|
| `['uptime-stats', project.id]` | `queryKeys.projects.uptimeStats(id)` |
| `['php-errors', project.id, typeFilter, searchTerm]` | `queryKeys.projects.phpErrors(id, { type: typeFilter, search: searchTerm })` |
| `['php-errors-stats', project.id]` | `queryKeys.projects.phpErrorsStats(id)` |
| `['backups', project.id]` | `queryKeys.projects.backups(id)` |
| `['backups-stats', project.id]` | `queryKeys.projects.backupsStats(id)` |

- [ ] **Step 1: #49 — drop the defensive double invalidation**

`UptimeSection.tsx:74-75` and `:333-334` invalidate both `['projects', project.id]` and `['projects', Number(project.id)]` because someone was unsure of the id type. The factory normalizes, so collapse each pair to one:

```tsx
queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(project.id) });
```

- [ ] **Step 2: #84 — a full page reload between two sections of one route**

`OverviewSection.tsx:202`:

```tsx
window.location.href = `/projects/${project.id}?section=maintenance`;
```

This is a react-router app; that line reloads the whole document and destroys the entire query cache. Replace with client navigation:

```tsx
const navigate = useNavigate();
// …
navigate(`/projects/${project.id}?section=maintenance`);
```

Import `useNavigate` from `react-router-dom`. Verify the target section actually renders after the change — if it does not, the section is being read once on mount somewhere and needs to follow the search param; fix that rather than reverting to the reload.

- [ ] **Step 3: #77 — the projects list does not poll**

`ProjectsPage.tsx:94` renders health and uptime columns from the same server data the detail page polls at 60s. Match it:

```tsx
refetchInterval: 60_000,
```

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npm run build`
Expected: both exit 0.

Then confirm the migration is total:

```bash
grep -rn "queryKey: \['" src/ | grep -v "queryKeys\."
```
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add src/features/projects
git commit -m "fix: remaining project keys, drop reload-based navigation

OverviewSection navigated between two sections of the same route with
window.location.href, reloading the document and destroying the query
cache. Projects list now polls like the detail page it mirrors.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 13: Lock the migration in

Without a test suite, nothing stops the next contributor from hand-writing a key literal and silently reintroducing this entire bug class. Make it a build error.

**Files:**
- Create: `eslint.config.js`

**Interfaces:**
- Consumes: nothing. Produces: a working lint setup with a rule failing on raw key literals.

**Note for the implementer:** `npm run lint` is currently **broken, not merely unused**. ESLint 9.39.2 and its plugins are in `devDependencies` and `package.json` declares a `lint` script, but no config file of any form exists, so the script exits with "ESLint couldn't find an eslint.config.(js|mjs|cjs) file". This task creates the missing flat config. Expect it to surface pre-existing violations across the codebase the first time it runs.

- [ ] **Step 1: Create the flat config**

```js
// eslint.config.js
import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  { ignores: ['dist/**', 'node_modules/**', 'packages/**/dist/**'] },
  js.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'no-restricted-syntax': [
        'error',
        {
          // Query keys must come from src/lib/queryKeys.ts. Hand-written
          // literals drift into near-duplicates that no invalidation matches
          // — the bug this branch exists to fix.
          selector: "Property[key.name='queryKey'] > ArrayExpression",
          message: 'Use queryKeys.* from src/lib/queryKeys.ts, not a raw array literal.',
        },
      ],
    },
  },
  {
    // The factory is the one place allowed to write key literals.
    files: ['src/lib/queryKeys.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
];
```

`@eslint/js` may not be installed — check `node_modules/@eslint/js` and `npm install -D @eslint/js` if absent.

- [ ] **Step 2: Run it and triage what it finds**

Run: `npm run lint`

The `lint` script uses `--max-warnings 0`, so anything it reports fails. Two categories will appear:

- **`react-hooks/rules-of-hooks` errors** — these are real bugs of the same family as #82. Fix them here; they are exactly what this rule exists to catch.
- **Everything else** (unused vars, `no-undef` on browser globals, etc.) — pre-existing noise unrelated to this branch. Do **not** fix them in this task. Either add the missing `globals` config for browser environments or downgrade those specific rules to `'warn'`, and record in the commit message what was deferred.

The `no-restricted-syntax` rule must report **zero** violations — if it reports any, Tasks 3–12 missed a key and it must be migrated before this task can be committed.

- [ ] **Step 3: Verify the rule catches a violation**

Temporarily add `queryKey: ['scratch-test'],` to any `useQuery` call, then:

Run: `npm run lint`
Expected: fails with "Use queryKeys.* from src/lib/queryKeys.ts, not a raw array literal."

Remove the temporary line and re-run.
Expected: the rule reports nothing (modulo any unrelated pre-existing violations triaged in Step 2).

- [ ] **Step 4: Commit**

```bash
git add eslint.config.js package.json package-lock.json
git commit -m "chore: restore working eslint config, ban raw query key literals

npm run lint has been broken since the ESLint 9 flat-config migration —
the dependency and script existed but no config file did, so the repo has
had no lint coverage at all.

Keys must come from the factory. Without this, the near-duplicate keys
this branch removed would drift back in and no invalidation would match.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-review notes

Checked against the spec:

- **Phase 0** — Tasks 1–2. Covered.
- **Phase 1 findings #1–#51** — all mapped: #1,#2,#12,#41 → Task 3; #3,#4,#5,#10,#14 → Task 4; #28–#40,#43,#88 → Task 5; #6,#13,#15,#16,#17,#82,#83 → Task 6; #18–#22 → Task 7; #7,#27,#42,#47,#58,#63 → Task 8; #11,#72,#73 → Task 9; #8,#9,#24,#25 → Task 10; #23,#26,#44,#51,#71,#76 → Task 11; #49,#77,#84,#85 → Task 12.
- **Deliberately deferred to later plans:** #52–#57, #59–#62 (Phase 2, frozen snapshots); #64–#67 (Phase 3, auth); #68–#70 (Phase 4, jobs); #78–#81, #86, #87 (Phase 5). #45, #46, #48, #50 need no action.
- **Findings #58, #63, #82, #83, #85, #88 were pulled forward** out of later phases into Tasks 5, 6, 8 and 12 because they sit in files those tasks already open. Leaving a known credential-permissions bug in a file being edited would be indefensible.
- **#31 and #44** contain conditional branches ("if no endpoint exists"), which is a genuine unknown about the backend rather than a placeholder — each branch specifies a concrete action, including refusing to ship a control that fakes success.

## Follow-on plans

Phases 2–5 get their own plans, written once this one lands, so they reflect the migrated code rather than guessing at it:

- **Phase 2** — frozen modal snapshots (#52–#57, #59–#62)
- **Phase 3** — auth `/me` query and enforceable route guards (#64–#67)
- **Phase 4** — job polling: backups, GDPR bailout, malware scan → dispatched job in `lsm-api` (#68–#70)
- **Phase 5** — imperative fetches and remaining defects (#78–#81, #86, #87)
