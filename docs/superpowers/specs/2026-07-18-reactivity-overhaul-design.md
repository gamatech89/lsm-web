# Reactivity Overhaul — Design

**Date:** 2026-07-18
**Repos:** `lsm-web` (primary), `lsm-api` (Phase 4 only)
**Branches:** `fix/reactivity-overhaul` (lsm-web), `fix/malware-scan-job` (lsm-api)

## Problem

Users must manually refresh the page to see current data. This is not a handful of isolated bugs — it is a systemic freshness failure with four distinct causes, compounded by a global cache configuration that suppresses every automatic recovery mechanism React Query offers.

An audit of all 17 feature folders (~150 `useMutation` call sites, ~90 distinct query keys) produced ~70 findings, catalogued below.

## Root Cause

`src/main.tsx:12-19`:

```ts
staleTime: 1000 * 60 * 5,   // 5 minutes
retry: 1,
refetchOnWindowFocus: false, // never overridden anywhere in the codebase
```

Every query is considered fresh for 5 minutes, and returning to the tab refetches nothing. Roughly 50 call sites add their own `staleTime` (30s–5min) but none re-enable focus refetching. Only two queries in the entire app poll: `notifications/unread-count` (10s) and `timer/current` (60s).

Consequence: when invalidation is missing or mistargeted — which it very often is — there is no secondary mechanism to heal the cache. The user's only recourse is a hard refresh. That is precisely the reported symptom.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Freshness policy | Focus-first + selective polling | `refetchOnWindowFocus: true`, `staleTime` 30s, `refetchOnReconnect: true`. Polling added only where data changes without the current user acting. A background tab issues no requests; a focused tab is always current. Lowest API load for the largest gain — relevant on shared hosting. |
| Key architecture | Hierarchical key factory | Structural fix rather than ~45 individual patches. See below. |
| Real-time transport | Polling only | `lsm-api` has no broadcasting infrastructure at all: no `config/broadcasting.php`, no `routes/channels.php`, no `BroadcastServiceProvider`, zero pusher/reverb/ably packages, zero `ShouldBroadcast` implementations, `BROADCAST_CONNECTION=log`. Frontend has no `laravel-echo` or SSE client. Websockets would be a separate backend project. |
| Optimistic updates | Deferred | Considered and rejected for this pass. Adding optimistic updates on top of broken invalidation would layer rollback complexity over an unsound base. Revisit as its own decision once freshness is healthy. |
| Scope | All 6 phases, checkpoint after each | User explicitly opted for thorough over quick. |

### Hierarchical query keys

There is currently **no centralized query key definition** — `grep -rn "queryKeys"` returns zero hits. Every key is a hand-typed array literal at its call site. This is the direct cause of ~8 pairs of divergent keys naming the same server data:

- `['project-updates']` vs `['lsm-updates']`
- `['project-recovery-status']` vs `['lsm-recovery-status']`
- `['project-reports', id]` vs `['projects', id, 'reports']`
- `['projects','filter-options']` vs `['project-filter-options']`
- `['projects']` vs `['projects-list']`

The fix is a single `src/lib/queryKeys.ts` factory whose keys nest by ownership:

```ts
export const queryKeys = {
  projects: {
    all:     ()   => ['projects'] as const,
    list:    (f)  => ['projects', 'list', f] as const,
    detail:  (id) => ['projects', Number(id)] as const,
    plugins: (id) => ['projects', Number(id), 'plugins'] as const,
    updates: (id) => ['projects', Number(id), 'updates'] as const,
    health:  (id) => ['projects', Number(id), 'health'] as const,
    // …
  },
  // …
}
```

Three properties follow:

1. **Prefix invalidation becomes semantic.** `invalidateQueries({ queryKey: queryKeys.projects.detail(id) })` refreshes everything belonging to that project. The entire bug class "updated a plugin but the sidebar badge still shows the old count" disappears structurally.
2. **No refetch storms.** `invalidateQueries` refetches only *active* (mounted) queries; inactive ones are merely marked stale. Broad invalidation is therefore cheap.
3. **One place normalizes IDs.** `Number(id)` inside the factory closes the latent string-vs-number key hazard. Evidence this has already bitten someone: `UptimeSection.tsx:74-75` and `:333-334` defensively invalidate both `['projects', project.id]` and `['projects', Number(project.id)]`.

---

## Phase 0 — Foundations

**Goal:** Change global defaults; author the key factory. No call-site migration.

- `src/main.tsx:12-19` — `refetchOnWindowFocus: true`, `staleTime: 30_000`, `refetchOnReconnect: true`. Keep `retry: 1`.
- Create `src/lib/queryKeys.ts` covering all ~90 existing keys, collapsing each duplicate-name pair to one canonical key.

The `main.tsx` change alone is expected to remove the majority of manual refreshes. Verify this before proceeding — it establishes the baseline for the rest.

---

## Phase 1 — Key migration and invalidation

**Goal:** Migrate every `useQuery`/`useMutation` to the factory, feature by feature, fixing that feature's invalidation as it is touched.

`setQueryData` is used nowhere in the codebase, so all cache updates flow through `invalidateQueries` — there are no hand-written cache writes to reconcile.

### Critical — visibly wrong data

| # | Location | Symptom |
|---|---|---|
| 1 | `projects/pages/ProjectDetailPageV2.tsx:192` | Deletes project, navigates to list, never invalidates `['projects']` — deleted project still listed for 5 min |
| 2 | `projects/components/ProjectSelector.tsx:31` | Queries `['projects-list']`, invalidated by **nothing** in the codebase (`['projects']` does not prefix-match the string `'projects-list'`). New/renamed/deleted projects never appear in the dropdown |
| 3 | 9 todo mutations (`TodoFormModal.tsx:76,89`; `TodosSection.tsx:149,161,171,187,199`; `TodoDetailModal.tsx:196,206`) | All invalidate only `['projects', projectId]`. `DeveloperDashboard.tsx:33` queries `['todos','my-tasks']` — "My Tasks" never updates |
| 4 | `projects/components/SupportTicketsTab.tsx:220` | Invalidates `['todos', project.id]`, a key matching **no query** (real ones are `['todos','my-tasks']`, `['todos','completed',id]`). Ticket→todo conversion invalidates nothing |
| 5 | `support/components/TicketDetailModal.tsx:164` | `createTodoMutation` never invalidates `['projects', projectId]`; new todo absent from project's Todos section |
| 6 | `time/pages/MyTimePage.tsx:196` | Submits timesheet, invalidates `['time-entries']` but not `['timesheets']` — manager's approval queue (`ApprovalsPage.tsx:96`, `ApprovalsWidget.tsx:18`) misses it |
| 7 | `vault/components/AddCredentialModal.tsx:64`, `EditCredentialModal.tsx:78` | Invalidate `['vault']` only, not `['project-credentials', project_id]`. Credential added from vault never appears on project's Credentials tab. Reverse path (`CredentialFormModal.tsx:88-89,106-107`) does both — proving oversight |
| 8 | `reports/pages/MaintenanceReportsPage.tsx:80,93` | Invalidates `['projects', pid, 'reports']`, which does not match `ReportsSection.tsx:53`'s `['project-reports', project.id]` |
| 9 | `projects/components/sections/GdprAuditSection.tsx:194` | `saveToReportsMutation` invalidates nothing; report appears in neither reports view |
| 10 | `projects/components/SiteReviewCanvas.tsx:198` | `createTodoMutation` invalidates only pins; todo never reaches `['projects', projectId]` |
| 11 | `support/pages/SupportPage.tsx:65`, `SupportTicketsTab.tsx:68` | `markAsRead` is a bare fire-and-forget call outside any mutation. Unread badge and row highlight persist after reading |

### High — cross-feature staleness

| # | Location | Symptom |
|---|---|---|
| 12 | `projects/components/ProjectFormModal.tsx:86-92` | `createMutation` invalidates `['dashboard']` (`:70`); `updateMutation` does not. Neither invalidates `['projects-list']` |
| 13 | `TimerWidget.tsx:96-97`, `FloatingTimerWidget.tsx:151-152`, `ActiveTimerWidget.tsx:30-31` | Stop invalidates `['timer']`+`['time-entries']`, never `['dashboard']`. Start (`:82`/`:137`) and discard (`:110`/`:165`) invalidate only `['timer']` |
| 14 | `projects/components/TodoDetailModal.tsx:213,226` | `logTime`/`deleteTime` create real time entries but only call local `refetchTimeEntries()`. Never touch `['time-entries']`, `['timer']`, `['dashboard']`, `['analytics']`, `['financial']` |
| 15 | `time/pages/MyTimePage.tsx:163,179,191` | Invalidate `['time-entries']` only; `['analytics']`, `['financial']`, `['dashboard']` stale |
| 16 | `time/pages/ApprovalsPage.tsx:140` | `rejectMutation` omits `['invoices']`, which `approveMutation:131` includes |
| 17 | `time/pages/InvoicesPage.tsx:204,220,236` | Invalidate `['invoices']` only, never `['financial']`. Mirror bug at `FinancialReportsPage.tsx:157`. The two financial screens permanently disagree |
| 18 | `team/pages/TeamPage.tsx:161,185,209` | Invalidate `['team']` only — not `['availability']`, `['dashboard']`, `['projects']`. Deleted user still listed as assignee on project cards |
| 19 | `team/components/SetAvailabilityModal.tsx:82` | `updateMutate` omits `['team']`, which `createMutate:73` includes |
| 20 | `dashboard/components/AdminDashboard.tsx:70` | `cancelMutation` omits `['team']` |
| 21 | `projects/components/sections/OverviewSection.tsx:668,682` | Developer/manager assignment invalidates `['projects', id]` only; list avatars, `['availability']`, `['team']` stale |
| 22 | `tags/pages/TagsPage.tsx:56,71,86` | Invalidate `['tags']` only; stale tag chips on project and team rows |
| 23 | `settings/pages/SettingsPage.tsx:124` | PUTs both `uptime` and `backup` sections, invalidates `['settings']` only. `['backup-settings']` (`:86`, `OverviewSection.tsx:584`) never refreshes |
| 24 | `library/LibraryResourcesPage.tsx:95,111,126` | Never invalidate `['library-resources-categories']` (`:83`); new category missing from filter |
| 25 | `projects/components/sections/ResourcesSection.tsx:82,92,105` | Invalidate `['projects', id]` but not `['library-resources']`; deleted resource remains in library |
| 26 | `ActivitySection.tsx:70,81`, `admin/pages/ActivityPage.tsx:69` | **Activity log is invalidated by nothing anywhere**, yet nearly every mutation writes an audit row. Always up to 5 min behind |
| 27 | `projects/components/ManageCredentialAccessModal.tsx:66` | Omits `['vault']` |

### Medium — within-feature staleness

| # | Location | Symptom |
|---|---|---|
| 28 | `sections/CoreSection.tsx:70` | Omits `['lsm-updates', id]` (`:63`) and `['lsm-health', id]` (`:55`) queried in the same file — post-update card shows old version |
| 29 | `sections/PluginsSection.tsx:198-199,268-269` | Invalidate `['project-updates']` but not `['lsm-updates', id]`, used by `ProjectDetailPageV2.tsx:132` for the sidebar badge. Same data, two names |
| 30 | `sections/PluginsSection.tsx:205` | `toggleActiveMutation` omits `['lsm-health', id]`, which `deletePluginMutation:243` correctly includes |
| 31 | `sections/PluginsSection.tsx:228` | `toggleAutoUpdateMutation` is a stub returning `{ success: false }` — no `mutationFn`, no API call, no invalidation |
| 32 | `sections/MaintenanceSection.tsx:164,174,184` | Omit both `['project-recovery-status', id]` (own query, `:68`) and `['lsm-recovery-status', id]` (`ProjectDetailPageV2.tsx:124`) — recovery banner stale after recovery actions |
| 33 | `sections/MaintenanceSection.tsx:140,149` | enable/disableMaintenance have **no `onSuccess` at all**; maintenance badge on project card stale |
| 34 | `sections/MaintenanceSection.tsx:83,93,99` | clearCache/flushRewrite/optimizeDb have no invalidation; `optimizeDb` changes DB size but `['project-db-stats', id]` (`:76`) only refetches via `cleanupDbMutation` |
| 35 | `sections/SecuritySection.tsx:134` | Omits `['lsm-security-headers', id]` (`:109`) and `['lsm-health', id]` (`:93`) |
| 36 | `sections/ThemesSection.tsx:84,94,104` | Omit `['lsm-updates']`/`['lsm-health']` |
| 37 | `sections/BackupsSection.tsx:97` | `restoreMutation` has no invalidation despite changing site state |
| 38 | `sections/MediaSection.tsx:83,100` | Mutate local `useState` only; deleting media never invalidates health or storage stats |
| 39 | `WordPressManagement.tsx`, `WordPressManagementTab.tsx`, `WordPressManagementDrawer.tsx` | Three near-duplicate components with inconsistent invalidation. `Management.tsx:135` invalidates after core update; `Tab.tsx:156` and `Drawer.tsx:142` do not. Zero invalidation across all three for: clearCache, optimizeDb, flushRewrite, enable/disableMaintenance, disable/restorePlugins, emergencyRecovery. No `updateAllPlugins` handler invalidates `['lsm-updates']`. **Consider consolidating these three into one component** — the triplication is itself the defect |
| 40 | `sections/SettingsSection.tsx:134-135` | Omits `['lsm-health']`/`['lsm-updates']`, which only become reachable once the API key is saved |
| 41 | `sections/OverviewSection.tsx:662` | Queries `['project-filter-options']` while `ProjectsPage.tsx:99` uses `['projects','filter-options']` for the same data; the former is invalidated by nothing |
| 42 | `vault/components/ShareCredentialModal.tsx:49` | `shareMutation` has no invalidation; share-link listings stale |
| 43 | `sections/MalwareSection.tsx:97,114` | Correct on scan keys but omits `['lsm-health', id]`, which surfaces malware status |

### Low

| # | Location | Note |
|---|---|---|
| 44 | `profile/pages/ProfilePage.tsx:58,74,93,117,127,141,152,163,172` | All 9 mutations lack invalidation. `['team']` shows the user's old name/email. **`changePasswordMutation:74` is a stub** — `Promise.resolve({ success: true })`, shows a success toast without calling any API. Treat as a real bug, not a nit |
| 45 | `auth/components/TwoFactorSetupGate.tsx:32,38,48` | No invalidation; no dependent query today, will break when one is added |
| 46 | `team/pages/TeamPage.tsx:217,241` | resetPassword/sendResetLink — acceptable, no displayed state changes |
| 47 | `VaultPage.tsx:106`, `CredentialsSection.tsx:85`, `CredentialViewModal.tsx:78` | Reveal mutations. Acceptable *unless* the backend increments a view counter or writes an access-log row shown in `['vault']`/`['activity-log']` — **verify against the backend** |
| 48 | `secrets/SendSecretModal.tsx:48`, `share/pages/SiteReviewSharePage.tsx:34` | No dependent queries. Not defects |
| 49 | `sections/UptimeSection.tsx:74-75,333-334` | Defensive double-invalidation of string and number ID. Currently harmless; resolved by the factory |
| 50 | `team/pages/TeamPage.tsx:138` | Object in key — v5 hashes deterministically, prefix-matches. **Not a bug**, recorded to prevent a spurious "fix" |
| 51 | `components/common/NotificationsPopover.tsx:88-94` | Works, but couples list refresh to an effect on unread count. Note: **no mutation elsewhere invalidates `['notifications']`** — server-generated notifications surface only via the 10s poll |

---

## Phase 2 — Frozen snapshots

Detail modals hold a `useState` copy of the table row rather than reading live query data. Change them to accept an `id` and read from the query — the pattern `support/components/TicketDetailModal.tsx:127-134` already implements correctly (`current = detail ?? prop`).

| # | Location | Symptom |
|---|---|---|
| 52 | `sections/TodosSection.tsx:87,425,822-831` + `TodoDetailModal.tsx:378,392,406,411` | `viewingTodo` frozen; changing status/assignee updates the table behind but not the open modal |
| 53 | `TodoDetailModal.tsx:137-142` | Sync effect depends on the frozen `todo` prop, so a server-side description change never reaches the textarea |
| 54 | `sections/ReportsSection.tsx:48-49,192-198,309-316` | `viewingReport`/`editingReport` frozen; reopening after edit shows pre-edit content |
| 55 | `sections/SecuritySection.tsx:89` | `selectedScan` frozen; re-running a scan does not update the open detail view |
| 56 | `sections/SiteReviewsSection.tsx:31-32` | `openReview`/`shareReview` frozen; pin counts and share status stale |
| 57 | `sections/ResourcesSection.tsx:60,168` | `editingResource` frozen |
| 58 | **`ManageCredentialAccessModal.tsx:60-64`** | **Data-integrity bug, not cosmetic.** Modal is permanently mounted (`CredentialsSection.tsx:390`, no `destroyOnClose`, no `key`). Opening credential B leaves `data` undefined while loading; the `if (data)` guard blocks the reset, so checkboxes still show A's granted users. Saving at that moment **grants A's access list to B** |
| 59 | **`time/pages/ApprovalsPage.tsx:84,100-115`** | `useMemo` used to perform `setState` — runs during render, not guaranteed to run, breaks under StrictMode/concurrent. Also `timesheetDetails = selectedTimesheet` is a click-time snapshot never reconciled; approve posts stale `entry_ids` |
| 60 | `sections/SettingsSection.tsx:98-114` | `useEffect` guarded by `if (project.notification_preferences)` → clearing all prefs server-side never propagates. Dep is object identity, so every refetch **overwrites the user's unsaved in-progress toggles** |
| 61 | `SiteReviewShareModal.tsx:20` | `useState(review.share_url)`; link generated/revoked elsewhere shows old value |
| 62 | `profile/pages/ProfilePage.tsx:227-230,623-628` | antd `initialValues` from the auth store with no `setFieldsValue` effect, no `key`, no `destroyOnClose` — the only two forms in the codebase missing the sync every modal form has. Save billing → navigate away → return → pre-save values |
| 63 | `CredentialViewModal.tsx:75`, `ShareCredentialModal.tsx:43` | `revealedPassword`/`generatedLink` live in a permanently-mounted outer component, cleared only by `handleClose`. Any close path bypassing `onCancel` **leaks the previous credential's revealed secret into the next open**. `destroyOnClose` on the inner `<Modal>` does not protect outer state |

---

## Phase 3 — Auth

Isolated as its own phase because it touches authentication and warrants independent testing.

`stores/auth.ts:26-74` persists `user` to localStorage and is written only at login, profile save (`ProfilePage.tsx:64,104`) and 2FA enrollment (`TwoFactorSetupGate.tsx:25`). There is **no `/me` query, no refetch on mount, no invalidation**. `hooks/useTokenRefresh.ts:16-35` refreshes the token but explicitly reuses `useAuthStore.getState().user` untouched.

- #64 — `App.tsx:52-56` `AdminRoute` gates on `user?.role`. **A server-side role change has zero effect until logout.** Admin routes stay open, or stay closed, indefinitely.
- #65 — `stores/auth.ts:88-105` `useHasRole`/`useIsAdmin`/`useCanManageProjects` read the frozen object; every permission-gated button inherits the staleness.
- #66 — `AuthenticatedLayout.tsx:382` and `SettingsPage.tsx:71-75` gate on `user?.requires_two_factor_setup`; an admin forcing 2FA does not gate the user until re-login.
- #67 — `lib/api.ts:43` 401 interceptor sets `window.location.href = '/login'` bypassing `logout()`, leaving persisted `user`/`token` in localStorage.

**Change:** back `user` with a `['auth','me']` query (focus refetch enabled), keeping zustand for token/session only. Route guards then become genuinely enforceable.

---

## Phase 4 — Long-running jobs

Three jobs, three different strategies today.

- #68 — **Backups: a real bug, currently masked.** `sections/BackupsSection.tsx:74-83` invalidates immediately after dispatch; `BackupController.php:97` does `CreateBackupJob::dispatch($backup)`. The list (`:59-64`) has `staleTime: 30000` and no interval, while the status column (`:236-246`) explicitly renders `pending`/`in_progress` — the UI knows rows can be mid-flight but nothing transitions them. Works locally only because `.env` has `QUEUE_CONNECTION=sync`; on `database` (as `.env.example` specifies) the invalidate races the job and always loses. Restore (`:100-105`) invalidates nothing at all (`BackupController.php:199` dispatches `RestoreBackupJob`). **Fix:** conditional `refetchInterval` active only while a row is `pending`/`in_progress`.
- #69 — **GDPR poll has no bailout.** `sections/GdprAuditSection.tsx:110-149` polls every 4s and handles `completed`/`failed` correctly, but has no timeout or attempt cap. A job that dies without writing `failed` polls forever with `isPolling` stuck true — no escape short of reload. **Fix:** max-attempts cap with a surfaced error.
- #70 — **Malware scan is a blocking request, not a job.** `sections/MalwareSection.tsx:97-112` — the mutation blocks until the scan finishes; the polling at `:127-160` only drives a progress bar and is not a completion mechanism. Any gateway/PHP timeout surfaces as "Scan failed. Ensure the site is reachable." (`:108`) while the scan is in fact running fine server-side. **Fix (lsm-api, branch `fix/malware-scan-job`):** dispatch a job + status endpoint; frontend polls it using the GDPR pattern.

### Polling gaps to close in the same phase

The app already contains a correct polling pattern (`NotificationsPopover.tsx:80-84`, 10s) — it was simply never applied consistently, so freshness varies per screen in ways users read as bugs.

| # | Surface | Current | Needed |
|---|---|---|---|
| 71 | `notifications/NotificationsPage.tsx:118-121` | No interval, no staleTime override | Badge in the header says 3 new while the list below shows none — on the same screen. Match the popover |
| 72 | `support/pages/SupportPage.tsx:49-57`, `SupportTicketsTab.tsx:56-60` | `staleTime: 30000`, no interval | A new client ticket never appears without navigation. An inbox that does not refresh is an inbox people stop trusting |
| 73 | `support/components/TicketDetailModal.tsx:127-131` | No interval, 5 min default | Two-party conversation; an agent replying never sees the client's reply arrive. Poll 5–10s while `open` |
| 74 | `dashboard/components/ManagerDashboard.tsx:26,31,36,41` | No interval on any of four queries | The only one of three role dashboards that goes stale (`AdminDashboard.tsx:56` and `DeveloperDashboard.tsx:28` both poll 60s) |
| 75 | `dashboard/components/widgets/ApprovalsWidget.tsx:17-20` | No interval | Purely other-people-generated data |
| 76 | `admin/pages/ActivityPage.tsx:68-71` | No interval | An audit feed of other users' actions that does not update is a contradiction in terms |
| 77 | `projects/pages/ProjectsPage.tsx:94-101` | No interval | Health/uptime columns stale while the detail page polls the same server data at 60s |

Correct already, leave alone: `UptimeSection.tsx:44-51` and `OverviewSection.tsx:143-150` (60s, matching the `sites:check-uptime` cron in `routes/console.php:76-77`); `TimerWidget.tsx:47-51`, `FloatingTimerWidget.tsx:94-98` (60s).

`hooks/useAiChat.ts:77` needs no refetch — the user is the only actor. Its separate risk (a long tool-using turn held open on one HTTP request with no partial output, vulnerable to gateway timeouts) is **out of scope**; recorded as debt.

---

## Phase 5 — Remaining defects

### Imperative fetches that never revalidate

These bypass the cache entirely; nothing can invalidate them.

| # | Location | Stale data |
|---|---|---|
| 78 | `share/pages/PublicSharePage.tsx:489-503` | `fetchMetadata()` in `useEffect([token])`; view counts / `views_remaining` frozen at load |
| 79 | `share/pages/EphemeralSecretRevealPage.tsx:35-40` | Secret availability fetched once; consumed-elsewhere state not reflected |
| 80 | `TodoDetailModal.tsx:147-190` | Attachment previews imperative; new attachments never appear |
| 81 | `components/layouts/AuthenticatedLayout.tsx:248-260` | Header quick-search in raw `useState`, no cache or dedupe |

`support/components/TicketDetailModal.tsx:61-76` is an acceptable exception — blob URLs need manual lifecycle management.

### Correctness and hygiene

| # | Location | Issue |
|---|---|---|
| 82 | **`FloatingTimerWidget.tsx:71`** | `if (user?.role === 'admin') return null;` executes **before** `useTimerStore()` and all `useQuery`/`useState` calls below. **Rules of Hooks violation** — if `user.role` changes while mounted, hook order changes and React throws |
| 83 | `FloatingTimerWidget.tsx:170-188`, `TimerWidget.tsx:118-137` | `if (currentTimer?.data && !runningTimer)` — the `&& !runningTimer` guard populates the store only when empty. With `stores/timer.ts` persisting to localStorage, a timer started on another device is never picked up and a stale persisted timer survives indefinitely. **A page refresh does not even fix this one** |
| 84 | `sections/OverviewSection.tsx:202` | `window.location.href = \`/projects/${project.id}?section=maintenance\`` — a **full page reload** to move between two sections of the same route, destroying the entire query cache. Direct evidence of the reported bug: a hard reload was used instead of `navigate()`/`setSearchParams()` |
| 85 | `projects/pages/ProjectsPage.tsx:108-127` | Effect reads `initialUserIdRef.current` but declares `[filterOptions]`; a second navigation to `/projects?user_id=…` within the same mounted page does not re-apply the filter — URL and table disagree |
| 86 | `sections/MediaSection.tsx:69-75,100-121` | `scanResult` is mutation-response state manually patched after deletes; media deleted through any other path leaves phantom rows. A `useQuery` would self-heal |
| 87 | `vault/pages/VaultPage.tsx:65` | `document.documentElement.getAttribute('data-theme')` read during render instead of `useThemeStore()`; theme toggle does not re-render the page |
| 88 | `sections/PluginsSection.tsx:146-153` | `console.log('🔍 [PLUGIN MAPPING] …')` inside a `useMemo` map, firing on every recompute. Debug logging in production |

---

## Verification

`lsm-web` has no test harness — no `test` script, no runner. Verification is therefore:

1. `npm run typecheck` and `npm run build` after every phase (non-negotiable gate).
2. Manual flow exercise via Chrome DevTools MCP for Phases 1 and 3 specifically — typecheck cannot detect a wrong query key, and auth changes carry lockout risk.
3. Phase 4 backups must be verified with `QUEUE_CONNECTION=database` and a running worker, **not** `sync` — `sync` is exactly what hides the bug.

## Out of scope (recorded debt)

- Optimistic updates (deliberate, revisit after this pass).
- Websocket/SSE transport — requires standing up broadcasting in `lsm-api` as its own project.
- AI chat streaming / partial output (`useAiChat.ts:77`).
- `lsm-api` `.env` has `QUEUE_CONNECTION=sync` while `.env.example` says `database`; this masks async bugs locally beyond the backup one. Worth aligning separately.
- Consolidating the three duplicate WordPress management components (#39) if it proves larger than a mechanical merge.
