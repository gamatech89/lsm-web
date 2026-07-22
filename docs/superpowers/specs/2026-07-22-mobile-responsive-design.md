# Mobile Responsive — Design

**Date:** 2026-07-22
**Repo:** `lsm-web`
**Branch:** `feat/mobile-responsive`

## Problem

On a phone the app is unusable in places. The clearest symptom: on the project detail screen the title "Zimmermann Druck" wraps one letter per line vertically, and the header action buttons overflow off-screen. The user's words: "mnogo loše na mob, očaj."

The cause is not the shell. `AuthenticatedLayout` is already responsive — `useMediaQuery`, `isMobile`/`isTablet`, sidebar collapses to a Drawer, viewport meta is set. The problem is the **content of individual pages**, written desktop-only:

- **43 screens** each have their own *inline* `justifyContent: 'space-between'` header (title on the left, action buttons on the right, one row, no wrap). There is **no shared header component**. On a narrow viewport the buttons hold their width, the title container collapses to ~1 character, and antd `Space` refuses to let its children shrink cleanly, so the title breaks letter-by-letter.
- Header markup is inconsistent across those 43: some use `<div style={space-between}>`, some `<Row justify="space-between">`, some `<Title>` at level 2, others 3 or 4, chosen at random. `ProjectsPage` even sets `whiteSpace: 'nowrap'` (actively forcing the break); `InvoicesPage` is the only one that already did `flexWrap: 'wrap'`.
- **27 tables, only 11** set horizontal scroll → 16 tables stretch the layout wider than the screen.

Zero files use Tailwind responsive prefixes (`sm:`/`md:`/`lg:`) despite Tailwind being installed; zero use antd `useBreakpoint`. Responsive logic exists only in the shell, ad-hoc.

## Goal

The user first asked for "usable, doesn't break," then raised the bar to "make it look top." So the target is not merely wrapping safely — it is a deliberate mobile layout that looks intentional, built **within the existing purple theme**, not a rebrand.

## Existing theme — bind to it exactly

From `src/styles/theme.ts`, do not invent new values:

| Token | Value |
|---|---|
| Primary | Vivid Violet `#7C3AED` (hover `#8B5CF6`, active `#6D28D9`) |
| Brand gradient | `linear-gradient(135deg, #6B21A8 0%, #A855F7 100%)` |
| Accent | Lavender `#A16ECC → #C084FC` |
| Success / CTA | Emerald `#10B981` |
| Warning / Error / Info | `#F59E0B` / `#EF4444` / `#3B82F6` |
| Font | Inter (weights 400/500/600/700) |
| Radius | `borderRadius: 12`, LG 16, SM 8 |
| Control height | 44 (LG 52, SM 36) — already touch-friendly |
| Breakpoint | `isMobile = max-width: 767px` |

**Note on `useMediaQuery`:** it is currently *not* shared — it is defined locally inside `AuthenticatedLayout.tsx:54` and copy-pasted into 4 other pages (ProjectsPage, LibraryResourcesPage, NotificationsPage, VaultPage). Phase 1 extracts it to a shared `src/hooks/useMediaQuery.ts` exporting `useMediaQuery(query)` and a convenience `useIsMobile()`, and points those 5 existing call sites plus `PageHeader`/`ResponsiveTable` at it. One breakpoint definition, one source.

## Design decisions

| Decision | Choice | Rationale |
|---|---|---|
| Header | One shared `<PageHeader>` component, adopted by all 43 screens | Fixes the root, standardizes the chaos, future screens inherit it. |
| Mobile action pattern | Primary action stays visible; the rest collapse into a `⋯` overflow menu (antd `Dropdown`) | Wrapping every button into a new row reads cheap and crowded. Collapse is the Linear/Notion/Gmail pattern — clean, uncrowded, 44px touch targets. **This is the signature move; everything else stays quiet.** |
| Header on scroll | Sticky, compact on mobile | Title and primary action stay reachable while scrolling a long page. |
| Type scale | Standardize: mobile title 18px/600, subtitle 13px/secondary, desktop title per one fixed scale | Ends the random level 2/3/4 chaos; one hierarchy across the app. |
| Tables | Horizontal scroll for all 27 (safety net) **plus** card layout on mobile for 4 key lists: projects, todos, team, tickets | Scrolling a wide table on a phone is "usable," not "top." The lists users live in become cards; rarely-viewed tables (financial, logs) stay scroll. |
| Row/Col grids | Not touched systematically — fixed only where a real break is observed on the 375px viewport | antd `Col` mostly wraps on its own. YAGNI over rewriting 58 files blind. |

## Components

### `<PageHeader>` — `src/components/common/PageHeader.tsx`

The single header used by every page. API covers every real case sampled (project detail with back+avatar+tags, list pages with title+search+add, etc.):

```tsx
interface PageHeaderProps {
  title: React.ReactNode;              // string or node
  subtitle?: React.ReactNode;          // e.g. the site URL
  prefix?: React.ReactNode;            // back button, avatar, icon
  tags?: React.ReactNode;              // status tags shown beside the title
  actions?: React.ReactNode;           // action buttons (desktop: inline; mobile: primary + ⋯)
  primaryAction?: React.ReactNode;     // the one action that stays visible on mobile
  sticky?: boolean;                    // default true
}
```

Behavior:
- **Desktop (`> 767px`):** `prefix · title/subtitle · tags` on the left, `actions` on the right, single row, `space-between`.
- **Mobile (`≤ 767px`):** vertical stack — row 1 `prefix · title · [primaryAction | ⋯]`; row 2 `subtitle`; row 3 `tags`. Title uses `overflow-wrap: anywhere` (wraps by words, never letters). Sticky, compact padding.
- Actions passed via `actions` render inline on desktop. On mobile, `primaryAction` stays; the remaining `actions` move into a `Dropdown` triggered by a `⋯` `MoreOutlined` button. When there is no `primaryAction`, all actions collapse into `⋯`.

### `<ResponsiveTable>` — `src/components/common/ResponsiveTable.tsx`

Wraps antd `Table`. Desktop renders the table unchanged. On mobile:
- Default: the table inside an `overflow-x: auto` container (the safety net, replaces the 16 missing `scroll={{x}}`).
- When given a `renderCard` prop: on mobile renders each row via `renderCard(record)` as a stacked card instead of the table. Used by the 4 key lists.

```tsx
interface ResponsiveTableProps<T> extends TableProps<T> {
  renderCard?: (record: T) => React.ReactNode;  // mobile-only card renderer
}
```

A global CSS block in `src/styles/index.css` gives every remaining raw antd `Table` the `overflow-x: auto` safety net too, so tables not migrated to `ResponsiveTable` still don't break the layout.

## Scope and phasing

All 43 screens, in feature groups, so each group is independently reviewable and testable on the real viewport.

1. **Foundations** — extract shared `useMediaQuery`/`useIsMobile` hook (repointing the 5 existing copies), `PageHeader`, `ResponsiveTable`, global table CSS, the standardized type scale. No page-header migrated yet.
2. **Project screens** — detail (the reported break), list, all sections. Projects list → cards.
3. **Todos, team, tickets** — the three remaining card lists.
4. **Time, invoices, financial, reports** — headers; tables stay scroll.
5. **Settings, profile, vault, library, notifications, activity, admin** — remaining headers.

## Verification

`lsm-web` has no test harness. The gate per group is `npm run typecheck && npm run build && npm run lint`, all exit 0. But the real verification is **visual, on a 375px mobile viewport in Chrome DevTools**, on every migrated screen: nothing wraps letter-by-letter, nothing overflows off-screen, every control is reachable and ≥44px, the `⋯` overflow opens, card lists render. A screenshot per feature group is the evidence.

## Out of scope

- Tablet-specific layout beyond what falls out of the mobile/desktop split (`isTablet` exists but this pass targets phone).
- Card layouts for financial/log/settings tables (scroll is fine there).
- Any change to the shell (`AuthenticatedLayout`) — it already works.
- Theme/color changes — bind to the existing tokens exactly.
