# Mobile Responsive — Phases 1 & 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the shared mobile-first primitives (`useMediaQuery`, `PageHeader`, `ResponsiveTable`, global table CSS, type scale) and adopt them on the project screens — the ones the user screenshotted as broken.

**Architecture:** One `PageHeader` component replaces 43 inline `space-between` headers; on mobile it keeps a primary action and collapses the rest into a `⋯` overflow menu. One `ResponsiveTable` wraps antd `Table` with an `overflow-x` safety net and an optional per-row card renderer for key lists. A shared `useMediaQuery` hook replaces 5 copy-pasted definitions. Everything binds to the existing purple theme — no new colors.

**Tech Stack:** React 18, TypeScript 5.7, Ant Design 5, Vite 6, Inter font.

**Spec:** `../specs/2026-07-22-mobile-responsive-design.md`

## Global Constraints

- Branch: `feat/mobile-responsive`, already created from `master` (spec commit `5c2a3a3`).
- **No test harness in this repo.** The gate for every task is `npm run typecheck && npm run build && npm run lint`, all exit 0. `lint` was fixed on the reactivity branch and now bans raw query-key literals — this branch touches no query keys, so that rule is not a concern, but lint must still pass clean.
- **Visual verification is mandatory and is the real gate.** After each task that changes rendered output, drive the app at a **375px viewport** in Chrome DevTools and screenshot the affected screen. Nothing may wrap letter-by-letter; nothing may overflow the viewport horizontally; every control must be reachable and ≥44px. The project verify skill at `.claude/skills/verify/SKILL.md` documents launch (both servers), login (`daniel@example.com` / `password`, but that user has projects only after assignment — use `stefan@example.com` / `password` or assign in DB), and the antd/MCP interaction traps (synthetic `click` misses antd handlers — use a programmatic `.click()`; `fill_form` doesn't update antd Form state — use the native-setter script).
- **Bind to existing theme tokens exactly** (`src/styles/theme.ts`): primary `#7C3AED`, brand gradient `linear-gradient(135deg, #6B21A8 0%, #A855F7 100%)`, success `#10B981`, Inter font, `borderRadius: 12`, control height 44. Invent no new colors.
- Breakpoint is `max-width: 767px` for mobile. Never hard-code the number outside the shared hook.
- Import alias `@/` maps to `src/` (configured in vite + tsconfig).
- Commit messages end with:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

## Phase 1 — Foundations

### Task 1: Shared `useMediaQuery` hook

Five files each define or copy this hook. Extract one, repoint them.

**Files:**
- Create: `src/hooks/useMediaQuery.ts`
- Modify: `src/components/layouts/AuthenticatedLayout.tsx` (remove local `useMediaQuery` at :54, import shared)
- Modify: `src/features/projects/pages/ProjectsPage.tsx`, `src/features/library/LibraryResourcesPage.tsx`, `src/features/notifications/NotificationsPage.tsx`, `src/features/vault/pages/VaultPage.tsx` (repoint their local copies)

**Interfaces:**
- Produces: `useMediaQuery(query: string): boolean` and `useIsMobile(): boolean` (= `useMediaQuery('(max-width: 767px)')`). Consumed by every later task.

- [ ] **Step 1: Create the hook**

```ts
// src/hooks/useMediaQuery.ts
import { useState, useEffect } from 'react';

/** Subscribe to a media query. Re-renders when it starts/stops matching. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** The app's single mobile breakpoint: viewport ≤ 767px. */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)');
}
```

- [ ] **Step 2: Repoint the 5 existing copies**

In each of the 5 files, delete the local `function useMediaQuery(...)` definition (in `AuthenticatedLayout.tsx` it is at line 54) and add at the top with the other imports:

```ts
import { useMediaQuery } from '@/hooks/useMediaQuery';
```

Leave each file's `const isMobile = useMediaQuery('(max-width: 767px)')` call sites exactly as they are — they now resolve to the shared hook. Do not change behavior, only the source of the function.

- [ ] **Step 3: Verify**

Run: `npm run typecheck && npm run build && npm run lint`
Expected: all exit 0.

Confirm no duplicate definitions remain:
```bash
grep -rn "function useMediaQuery" src/
```
Expected: only `src/hooks/useMediaQuery.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useMediaQuery.ts src/components/layouts/AuthenticatedLayout.tsx src/features/projects/pages/ProjectsPage.tsx src/features/library/LibraryResourcesPage.tsx src/features/notifications/NotificationsPage.tsx src/features/vault/pages/VaultPage.tsx
git commit -m "refactor: extract shared useMediaQuery hook

Five files each defined their own copy. One source, one breakpoint.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: `PageHeader` component

The core of the branch. One responsive header for all 43 screens.

**Files:**
- Create: `src/components/common/PageHeader.tsx`

**Interfaces:**
- Consumes: `useIsMobile` from Task 1.
- Produces:

```ts
interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  prefix?: React.ReactNode;          // back button, avatar, icon
  tags?: React.ReactNode;            // status tags beside the title
  actions?: React.ReactNode;         // desktop: inline right; mobile: into ⋯ overflow
  primaryAction?: React.ReactNode;   // the one action that stays visible on mobile
  sticky?: boolean;                  // default true
}
export function PageHeader(props: PageHeaderProps): JSX.Element;
```

**Design notes for the implementer:**
- Desktop (`!isMobile`): one flex row, `justify-content: space-between`. Left group: `prefix`, then a `min-width: 0` column with `title` (16px/600) over `subtitle` (13px secondary), then `tags`. Right group: `actions` inline.
- Mobile (`isMobile`): vertical stack. Row 1: `prefix` + title (18px/600, `overflowWrap: 'anywhere'`, never `nowrap`/`break-all`) + on the far right either `primaryAction` (if given) or, when there are `actions`, a `⋯` `Button`. Row 2: `subtitle`. Row 3: `tags` (wrapping). If both `primaryAction` and extra `actions` exist on mobile, the primary stays inline and the rest go into the `⋯` menu.
- The `⋯` overflow: antd `Dropdown` with `trigger={['click']}`. Its menu items are derived from the `actions` node — but since `actions` is an opaque `React.ReactNode`, the component cannot introspect it into menu items reliably. **Resolve this by accepting `actions` as an array when overflow is needed** (see the prop refinement below), OR render the `actions` node itself inside the dropdown's `dropdownRender`. Use `dropdownRender` — it takes arbitrary nodes and needs no introspection.
- Sticky: when `sticky !== false`, wrap in a container with `position: sticky; top: 0; z-index: 10` and the theme surface background so content scrolling under it is masked.

- [ ] **Step 1: Implement the component**

```tsx
// src/components/common/PageHeader.tsx
import React from 'react';
import { Button, Dropdown, Typography } from 'antd';
import { MoreOutlined } from '@ant-design/icons';
import { useIsMobile } from '@/hooks/useMediaQuery';

const { Text } = Typography;

export interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  prefix?: React.ReactNode;
  tags?: React.ReactNode;
  actions?: React.ReactNode;
  primaryAction?: React.ReactNode;
  sticky?: boolean;
}

export function PageHeader({
  title,
  subtitle,
  prefix,
  tags,
  actions,
  primaryAction,
  sticky = true,
}: PageHeaderProps) {
  const isMobile = useIsMobile();

  const titleNode = (
    <div style={{ minWidth: 0 }}>
      <Text
        strong
        style={{
          fontSize: isMobile ? 18 : 16,
          lineHeight: 1.3,
          display: 'block',
          overflowWrap: 'anywhere',   // wrap by words, never letter-by-letter
        }}
      >
        {title}
      </Text>
      {subtitle && (
        <Text type="secondary" style={{ fontSize: 13, overflowWrap: 'anywhere' }}>
          {subtitle}
        </Text>
      )}
    </div>
  );

  const containerStyle: React.CSSProperties = sticky
    ? {
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: 'var(--lsm-header-bg, transparent)',
        padding: isMobile ? '10px 0' : '10px 0',
      }
    : { padding: '10px 0' };

  if (isMobile) {
    const overflow = actions ? (
      <Dropdown trigger={['click']} dropdownRender={() => (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 8, padding: 8,
          background: '#fff', borderRadius: 12, boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
        }}>
          {actions}
        </div>
      )}>
        <Button icon={<MoreOutlined />} type="text" aria-label="More actions" />
      </Dropdown>
    ) : null;

    return (
      <div style={containerStyle}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          {prefix}
          <div style={{ flex: 1, minWidth: 0 }}>{titleNode}</div>
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            {primaryAction}
            {overflow}
          </div>
        </div>
        {tags && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {tags}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ ...containerStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        {prefix}
        {titleNode}
        {tags && <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>{tags}</div>}
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        {primaryAction}
        {actions}
      </div>
    </div>
  );
}
```

**Note on the dropdown background:** the hardcoded `#fff` will look wrong in dark mode. Read how a sibling component reads the current theme (e.g. `useThemeStore` or the `data-theme` attribute — check `src/stores/theme.ts`) and use the theme surface color instead of `#fff`. Same for the sticky `--lsm-header-bg`: either wire it to the real surface token or drop the CSS var and pass the theme background directly. Do not ship a white-on-dark dropdown.

- [ ] **Step 2: Verify it compiles**

Run: `npm run typecheck && npm run build && npm run lint`
Expected: all exit 0. Nothing imports it yet.

- [ ] **Step 3: Commit**

```bash
git add src/components/common/PageHeader.tsx
git commit -m "feat: responsive PageHeader with mobile action overflow

Desktop: title left, actions right. Mobile: title wraps by words, primary
action stays, the rest collapse into a ⋯ menu. Sticky. Not yet adopted.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: `ResponsiveTable` + global table safety net

**Files:**
- Create: `src/components/common/ResponsiveTable.tsx`
- Modify: `src/styles/index.css` (global table overflow rule)

**Interfaces:**
- Consumes: `useIsMobile` from Task 1.
- Produces:

```ts
interface ResponsiveTableProps<T> extends TableProps<T> {
  renderCard?: (record: T) => React.ReactNode;   // mobile-only per-row card
}
export function ResponsiveTable<T extends object>(props: ResponsiveTableProps<T>): JSX.Element;
```

- [ ] **Step 1: Global overflow safety net**

Append to `src/styles/index.css`:

```css
/* Any antd table scrolls within its own box on narrow screens instead of
   stretching the page. ResponsiveTable opts specific lists into cards; this
   catches every table that does not. */
@media (max-width: 767px) {
  .ant-table-wrapper .ant-table-content,
  .ant-table-wrapper .ant-table-body {
    overflow-x: auto;
  }
}
```

- [ ] **Step 2: Implement ResponsiveTable**

```tsx
// src/components/common/ResponsiveTable.tsx
import { Table } from 'antd';
import type { TableProps } from 'antd';
import { useIsMobile } from '@/hooks/useMediaQuery';

export interface ResponsiveTableProps<T> extends TableProps<T> {
  renderCard?: (record: T) => React.ReactNode;
}

export function ResponsiveTable<T extends object>({
  renderCard,
  dataSource,
  rowKey,
  ...tableProps
}: ResponsiveTableProps<T>) {
  const isMobile = useIsMobile();

  if (isMobile && renderCard && dataSource) {
    const keyOf = (rec: T, i: number) =>
      typeof rowKey === 'function' ? rowKey(rec) : (rec as any)[rowKey as string] ?? i;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {(dataSource as T[]).map((rec, i) => (
          <div key={keyOf(rec, i)}>{renderCard(rec)}</div>
        ))}
      </div>
    );
  }

  return <Table<T> dataSource={dataSource} rowKey={rowKey} {...tableProps} />;
}
```

- [ ] **Step 3: Verify**

Run: `npm run typecheck && npm run build && npm run lint`
Expected: all exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/common/ResponsiveTable.tsx src/styles/index.css
git commit -m "feat: ResponsiveTable with mobile card layout + global table scroll

Tables scroll within their box on mobile by default; key lists opt into a
per-row card renderer. Not yet adopted.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Phase 2 — Project screens

### Task 4: ProjectDetailPageV2 header → PageHeader

This is the screen the user screenshotted breaking.

**Files:**
- Modify: `src/features/projects/pages/ProjectDetailPageV2.tsx` (header block ~310-395)

**Interfaces:**
- Consumes: `PageHeader` from Task 2.

- [ ] **Step 1: Read the current header, then replace it**

The current header (~310-395) is a `<div style={{ display:'flex', justifyContent:'space-between' }}>` with a left `<Space>` (back button, avatar, name, url, health/security tags) and a right `<Space>` (globe link, Re-sync button, Edit button, and possibly more). Replace the whole block with:

```tsx
<PageHeader
  prefix={
    <>
      <Link to="/projects">
        <Button icon={<ArrowLeftOutlined />} type="text" size="small" />
      </Link>
      <Avatar
        shape="square"
        size={32}
        style={{
          background: 'linear-gradient(135deg, #6B21A8 0%, #A855F7 100%)',
          color: '#fff', fontSize: 14, fontWeight: 700, borderRadius: 6,
        }}
      >
        {project.name.charAt(0).toUpperCase()}
      </Avatar>
    </>
  }
  title={project.name}
  subtitle={project.url ? project.url.replace(/^https?:\/\//, '') : undefined}
  tags={
    <>
      <Tag bordered={false} color={healthConfig.color} style={{ margin: 0 }}>
        {healthConfig.label}
      </Tag>
      {project.security_status !== 'secure' && (
        <Tag bordered={false} color={securityConfig.color} style={{ margin: 0 }}>
          <LockOutlined /> {securityConfig.label}
        </Tag>
      )}
    </>
  }
  primaryAction={
    <Button
      icon={<SyncOutlined spin={checkHealthMutation.isPending} />}
      onClick={() => checkHealthMutation.mutate()}
      loading={checkHealthMutation.isPending}
    >
      Re-sync
    </Button>
  }
  actions={
    <>
      {project.url && (
        <Button icon={<GlobalOutlined />} href={project.url} target="_blank">Visit site</Button>
      )}
      <Button icon={<EditOutlined />} onClick={() => setEditModalOpen(true)}>Edit</Button>
      {/* keep every action that was in the original right-hand Space */}
    </>
  }
/>
```

Read the actual right-hand `<Space>` in the file first and move **every** button it holds into `actions` (except Re-sync, which becomes `primaryAction`). Match the real handler names and state variables in the file — the names above (`checkHealthMutation`, `setEditModalOpen`) are illustrative; use what the file actually declares. Import `PageHeader` from `@/components/common/PageHeader`. Remove the now-unused `Space` import only if nothing else in the file uses it.

- [ ] **Step 2: Verify build**

Run: `npm run typecheck && npm run build && npm run lint`
Expected: all exit 0.

- [ ] **Step 3: Verify visually at 375px — this is the real test**

Launch both servers (see `.claude/skills/verify/SKILL.md`), log in, open a project detail page, set the Chrome DevTools viewport to 375px wide. Screenshot.
Expected: the project name wraps by words (or fits), never letter-by-letter; the back button, avatar, and tags are visible; Re-sync is visible; Edit and Visit site are inside the `⋯` menu; nothing overflows horizontally. Compare against the user's original screenshot — the letter-per-line title must be gone.

- [ ] **Step 4: Commit**

```bash
git add src/features/projects/pages/ProjectDetailPageV2.tsx
git commit -m "fix: project detail header responsive via PageHeader

The reported break — title wrapping one letter per line, buttons
overflowing off-screen. Re-sync stays primary on mobile; the rest collapse
into the ⋯ menu.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: ProjectsPage header → PageHeader

**Files:**
- Modify: `src/features/projects/pages/ProjectsPage.tsx` (header block ~500-620)

**Interfaces:**
- Consumes: `PageHeader` from Task 2.

- [ ] **Step 1: Replace the header block**

The header (~503) is a `<div style={{ justifyContent: 'space-between' }}>` with a `<Title level={4} style={{ whiteSpace: 'nowrap', ... }}>` (the `nowrap` is a direct cause of the break) and action buttons (an "Add"/"New Project" button, possibly export/filters). Replace with:

```tsx
<PageHeader
  title={t('projects.title')}          {/* use the real title expression in the file */}
  subtitle={/* the real subtitle/count if one exists, else omit */}
  primaryAction={
    <Button type="primary" icon={<PlusOutlined />} onClick={/* real handler */}>
      {t('projects.add')}
    </Button>
  }
  actions={/* any secondary header buttons that existed; omit the prop if none */}
/>
```

Delete the old `<Title ... whiteSpace: 'nowrap'>` block entirely. The search box and filter controls that sit below the title are **not** part of PageHeader — leave them as their own row below it (they already wrap via Row/Col; fix only if Step 3 shows a break). Use the file's real title/handler expressions, not the placeholders above.

- [ ] **Step 2: Verify build**

Run: `npm run typecheck && npm run build && npm run lint`
Expected: all exit 0.

- [ ] **Step 3: Verify visually at 375px**

At 375px: the "Projects" title no longer forces a nowrap overflow; the add button is reachable (visible or in `⋯`); the search/filter row below wraps cleanly.

- [ ] **Step 4: Commit**

```bash
git add src/features/projects/pages/ProjectsPage.tsx
git commit -m "fix: projects list header responsive, drop nowrap title

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Projects list → mobile cards

The projects table becomes cards on mobile — the first of the four key lists.

**Files:**
- Modify: `src/features/projects/pages/ProjectsPage.tsx` (the `<Table>` at ~799)

**Interfaces:**
- Consumes: `ResponsiveTable` from Task 3.

- [ ] **Step 1: Swap Table for ResponsiveTable with a card renderer**

Replace the `<Table columns={columns} dataSource={data?.data || []} ... />` at ~799 with `<ResponsiveTable>` carrying the same props plus a `renderCard`. The card shows what a user scans a project by: name, health/uptime status, and the row's primary tap target (open the project).

```tsx
<ResponsiveTable<Project>
  columns={columns}
  dataSource={data?.data || []}
  rowKey="id"
  /* keep every prop the original Table had: pagination, loading, onRow, etc. */
  renderCard={(project) => (
    <Card
      size="small"
      style={{ borderRadius: 12, cursor: 'pointer' }}
      onClick={() => navigate(`/projects/${project.id}`)}
      styles={{ body: { padding: 14 } }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar shape="square" size={40} style={{
          background: 'linear-gradient(135deg, #6B21A8 0%, #A855F7 100%)',
          color: '#fff', fontWeight: 700, borderRadius: 8, flexShrink: 0,
        }}>
          {project.name.charAt(0).toUpperCase()}
        </Avatar>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text strong style={{ display: 'block', overflowWrap: 'anywhere' }}>
            {project.name}
          </Text>
          {project.url && (
            <Text type="secondary" style={{ fontSize: 12, overflowWrap: 'anywhere' }}>
              {project.url.replace(/^https?:\/\//, '')}
            </Text>
          )}
        </div>
        <Tag bordered={false} color={/* the same health color mapping the table column uses */ ''} style={{ margin: 0, flexShrink: 0 }}>
          {/* health label */}
        </Tag>
      </div>
    </Card>
  )}
/>
```

Read how the table's status column computes its health color/label and reuse that exact mapping in the card — do not invent a second mapping. Import `ResponsiveTable` from `@/components/common/ResponsiveTable`, and `Card` from antd if not already imported. Confirm `navigate` (from `useNavigate`) is in scope; the table likely already has an `onRow` click that navigates — reuse its target.

- [ ] **Step 2: Verify build**

Run: `npm run typecheck && npm run build && npm run lint`
Expected: all exit 0.

- [ ] **Step 3: Verify visually at 375px AND at desktop width**

At 375px: the projects list renders as tappable cards, each showing name + url + status, no horizontal scroll. **At desktop width (>767px): the original table is unchanged** — this is the critical regression check, since ResponsiveTable must fall through to the plain table above the breakpoint. Screenshot both.

- [ ] **Step 4: Commit**

```bash
git add src/features/projects/pages/ProjectsPage.tsx
git commit -m "feat: projects list renders as cards on mobile

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-review notes

Checked against the spec:

- **Existing theme binding** — Task 4 and Task 6 use the exact brand gradient `#6B21A8 → #A855F7`; primary buttons inherit `#7C3AED` from the theme. Task 2's dropdown/sticky background is explicitly flagged to use the theme surface, not hardcoded `#fff`.
- **useMediaQuery extraction** (spec note) → Task 1.
- **PageHeader** (spec §Components) → Task 2, full API implemented.
- **ResponsiveTable + global table CSS** (spec §Components) → Task 3.
- **Type scale** — Task 2 sets title 18px mobile / 16px desktop / subtitle 13px. The broader "standardize levels 2/3/4 across the app" happens as each screen adopts PageHeader in later phases; Tasks 4–5 remove the ad-hoc `<Title level={4} nowrap>`.
- **Phase 2 = project screens** → Tasks 4 (detail), 5 (list header), 6 (list cards). The 21 section files under `projects/components/sections/` are section *content*, not page headers; they are not in Phase 2's header scope and get touched only if a later phase or a 375px test surfaces a break.
- **Deferred to later phases (own plans):** todos/team/tickets cards (Phase 3), time/invoices/financial/reports headers (Phase 4), settings/profile/vault/library/notifications/activity/admin headers (Phase 5). Row/Col grids fixed only on observed break.

**On the `⋯` overflow using `dropdownRender`:** the spec said "Dropdown menu items derived from actions." Introspecting an opaque `ReactNode` into antd `MenuItem`s is unreliable, so the plan renders the `actions` node directly inside `dropdownRender`. This keeps the `actions` prop a plain node (every call site stays simple) at the cost of the overflow being a floating panel of buttons rather than a native menu list. If a native menu is wanted later, `actions` would need to become a structured array — recorded as a possible refinement, not done here.

## Follow-on plans

Phases 3–5 get their own plans once these land and the primitives are proven on real screens.
