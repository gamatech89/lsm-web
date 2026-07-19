---
name: verify
description: Launch and drive the LSM Platform locally to verify changes end-to-end in the browser.
---

# Verifying lsm-web

There is **no test harness** in this repo — no `test` script, no runner. Verification means running the app. `npm run typecheck && npm run build && npm run lint` are gates, not evidence.

## Launch

Backend and frontend are separate repos under `LSMPlatform/`. Both must run.

```bash
cd ../lsm-api && php artisan serve          # 127.0.0.1:8000, sqlite at database/database.sqlite
cd ../lsm-web && npm run dev                # localhost:3000  (NOT 3001, despite .agent/workflows)
```

Stop with `lsof -ti :3000 | xargs kill` / `lsof -ti :8000 | xargs kill`.

**If the change touches `packages/api-client` or `packages/types`, rebuild it first** — `dist/` is gitignored, untracked, and there is no `prepare` script, so `npm install` will NOT produce it and `vite build` does not build workspace packages:

```bash
cd packages/api-client && npm run build
```

## Logging in

`.agent/workflows/test-credentials.md` is **partly stale** — `bojan@example.com` does not exist; the real seeded user is `bojanmark89@gmail.com`. Verify against the DB before trusting it:

```bash
cd ../lsm-api && php artisan tinker --execute="echo \App\Models\User::pluck('email')->implode(', ');"
```

Known-good: `daniel@example.com` / `password` (manager, but has **0 projects** — useless for project-detail flows), `stefan@example.com` / `password` (developer).

`/login` is rate-limited. A few wrong attempts triggers "Too Many Attempts" and locks you out for a minute — don't brute-force credentials over curl; check the DB instead.

## Driving it — Chrome DevTools MCP gotchas

Two traps cost real time here. Both look like app bugs and are not.

**1. `click` often doesn't reach antd button handlers.** The synthetic click lands but React state never flips, with no console error. Use a programmatic click instead:

```js
[...document.querySelectorAll('button')].find(b => b.innerText.trim() === 'Change Password').click()
```

**2. `fill_form` does not update antd `Form`'s internal store.** The DOM input shows the value but `Form` still sees empty, so submit fails validation and no request fires. Set through React's native setter:

```js
const setVal = (id, v) => {
  const el = document.getElementById(id);
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v);
  el.dispatchEvent(new Event('input', { bubbles: true }));
};
```

Also: the browser profile is single-instance. If `new_page` errors with "already running", `pkill -f "chrome-devtools-mcp/chrome-profile"` first.

## Reading cache state directly

For anything about React Query freshness or invalidation, read the live `QueryClient` rather than inferring from the network panel:

```js
const root = document.getElementById('root');
const k = Object.keys(root).find(x => x.startsWith('__reactContainer'));
let qc = null; const stack = [root[k]];
while (stack.length) {
  const n = stack.pop(); if (!n) continue;
  const dep = n.dependencies?.firstContext?.memoizedValue;
  if (dep?.getDefaultOptions) { qc = dep; break; }
  if (n.memoizedProps?.client?.getDefaultOptions) { qc = n.memoizedProps.client; break; }
  if (n.child) stack.push(n.child); if (n.sibling) stack.push(n.sibling);
}
qc.getDefaultOptions().queries;              // resolved global defaults
qc.getQueryCache().getAll().map(q => q.queryKey);
```

To test whether an invalidation reaches a key, check `query.state.isInvalidated`. **Do not use `isStaleByTime(0)`** — it returns true for everything and will make any invalidation look like it hit the whole cache.

## Freshness expectations

Global defaults live in `src/main.tsx`: `staleTime` 30s, `refetchOnWindowFocus: true`, `refetchOnReconnect: true`. Query keys all come from `src/lib/queryKeys.ts` and nest project-owned data under `['projects', id, …]`, so invalidating a project refreshes everything belonging to it and nothing else.

Consequence when testing: **a freshly loaded query will not refetch on refocus** — it isn't stale yet. Wait past 30s or you'll read correct behaviour as a failure. Synthetic `visibilitychange`/`focus` events do not reliably drive TanStack's focusManager; a real tab switch does, or read the config off the live client as above.

Always-on polling to expect in the network panel, unrelated to your change: notifications unread-count every 10s, `timer/current` every 60s, projects list and dashboards every 60s.

## Flows worth driving

- **Change password** — `/profile` → Change Password. Wrong current password must surface the server's message and keep the form open; correct one must succeed and leave the current session valid. Needs `lsm-api` branch `fix/change-password-endpoint` (`PUT /user/password`).
- **Credential access modal** — open one credential's access dialog, close, open another; the checkboxes must never show the previous credential's users.
- **Cross-feature invalidation** — complete a todo on a project, then check the developer dashboard's "My Tasks" without reloading.

If you change a seeded user's password while testing, change it back.
