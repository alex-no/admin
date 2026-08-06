---
name: admin-integrate
description: Bootstrap this admin panel (list-framework + BaseModal + shared/core) into ANOTHER, already-existing project, from within this `admin` repo with the target project also accessible on disk. Use when asked to "add/integrate/embed/port this admin panel into project X" or similar. Covers only the deterministic, repo-fixed part — picking exactly one frontend (Vue or React) so the unused one's toolchain never gets installed, copying the matching file set together with the mandatory `shared/core/`, and wiring the `@core` Vite alias in the target project. Does NOT invent the target's entity fields, API contract, or UI kit — hands that off to README section 4 / a page-by-page conversation once the scaffold builds cleanly.
---

# Bootstrapping this admin panel into another project

## Scope: this skill ends where judgment calls begin

This is the "Крок 0–2" part of `README.md` section 2 — choosing a frontend and
copying files — done mechanically, so nothing gets forgotten. It deliberately
stops before backend contract adaptation, entity JSON configs, or UI-kit
restyling (README section 2 steps 3–5) — those need a real conversation about
the target project, not a checklist. Say so explicitly when you finish, and
point at README section 4 (or the `admin-data-page` skill's approach, if the
target project ends up with its own copy of it) as the next step.

## Step 1 — pick exactly one frontend, don't copy both

Read the target project's `package.json`:
- `vue` in `dependencies` → target is Vue, use `frontend/`.
- `react` in `dependencies` → target is React, use `frontend-react/`.
- Both, neither, or no `package.json` yet (fresh project) → ask the user
  **one** question ("Vue 3 or React 18?"), defaulting the recommendation to
  Vue — it's this repo's reference implementation (README section 6: "Vue-версія
  лишається еталоном. При розбіжності правильною вважається поведінка Vue").

Never copy files from both `frontend/` and `frontend-react/` into the same
target — the second implementation buys nothing there and drags in a whole
separate npm toolchain (`react`/`react-dom`/`react-router-dom`/`react-i18next`
vs `vue`/`vue-router`/`vue-i18n`) that will never run.

## Step 2 — copy the frontend-specific files

**Vue** (`frontend/` → target, same relative paths under target's `src/`):
- `src/list-framework/` (whole directory)
- `src/components/BaseModal.vue`, `Pagination.vue`, `SortIcon.vue`, `ListPageWrapper.vue`
- `src/composables/useModalWindow.js`, `usePageLayout.js`, `useUrlFilters.js`, `useAuth.js`
- `src/config/menu.json` (a structural example — the user replaces the entries, don't invent menu items for their domain)

**React** (`frontend-react/` → target):
- `src/list-framework/` (whole directory — `Pagination.tsx`/`SortIcon.tsx` already live inside `list-framework/components/` here, unlike Vue's top-level `components/`)
- `src/components/BaseModal.tsx`
- `src/hooks/useModalWindow.ts`, `usePageLayout.ts`, `useUrlFilters.ts`
- `src/contexts/AuthContext.tsx` (React's equivalent of `useAuth.js` — different shape, same contract: exposes `can()`)
- `src/config/menu.json`
- **React-only extra step:** Vue wraps each list page individually in
  `ListPageWrapper.vue` to react to the docked-modal margin event; React wires
  `usePageLayout` once, globally, in `layouts/BaseLayout.tsx` instead (there is
  no `ListPageWrapper.tsx` — see `shared/core/README.md`'s "Що свідомо лишилось
  поза ядром" and README section 6). If the target React project doesn't have
  an equivalent root layout yet, that wiring has to be added there, not per-page.

Before writing: check whether any of these filenames already exist in the
target project (a prior partial integration, or an unrelated same-named file).
If so, stop and ask how to proceed rather than silently overwriting — this is
someone else's project, not a scratch scaffold.

## Step 3 — copy `shared/core/` — mandatory regardless of Step 1's answer

Both frontends' files from Step 2 import directly from `@core` (`useModalWindow`
→ `@core/modalWindow`, `useUrlFilters` → `@core/urlState`, `useAuth`/`AuthContext`
→ `@core/permissions`, `DataListPage`/`DataTable` → bare `@core`). Skipping this
step means the target build fails immediately on `Failed to resolve import
"@core/..."` — it is not an optional enhancement.

1. Copy every `shared/core/*.ts` file **except** `*.test.ts`, `package.json`,
   `package-lock.json`, `tsconfig.json`, `vitest.config.ts`, `README.md`, and
   `node_modules/` into `src/core/` inside the target frontend. (`shared/core`
   sits *outside* both frontends in this repo only because two frontends here
   both consume it — a target with a single frontend has no such reason to
   keep it external; folding it into `src/core/` is simpler and still valid if
   the user later adds a second frontend, since it stays framework-agnostic TS.)
2. Add the `@core` alias to the target's `vite.config`:
   ```js
   resolve: {
     alias: {
       '@core': fileURLToPath(new URL('./src/core', import.meta.url)), // Vue-style
       // or, in a React/CJS-style vite.config.ts: '@core': path.resolve(__dirname, './src/core'),
     },
   },
   ```
   Merge into whatever `resolve.alias` block already exists in the target —
   don't overwrite an existing `'@'` entry.
3. No new npm dependency is needed for this step: `shared/core/*.ts` (outside
   `*.test.ts`) imports nothing from npm — verify this still holds with
   `grep -rn "^import .* from '[^.]" shared/core/*.ts | grep -v test` in this
   repo before relying on it, in case core has grown a real dependency since
   this skill was written.

`shared/page-configs/` and its `@configs` alias are **not** part of this
step — that split exists in this repo only to share one JSON config between
two frontends. A target project keeping a single frontend has nothing to
share; its entity JSON configs (Step in README section 4) can just live under
its own `src/config/` or similar, no external alias needed.

## Step 4 — sanity-check before handing off

- Confirm the target's `package.json` already has (or add) the frontend
  library itself — Vue: `vue`, `vue-router`, `vue-i18n`, `bootstrap`; React:
  `react`, `react-dom`, `react-router-dom`, `react-i18next`, `i18next`,
  `bootstrap-icons`. `shared/core` needs none of these; the copied
  components/composables/hooks do.
- Run the target's dev server (or `vite build`) and confirm there's no
  unresolved `@core/...` import left — that's the one failure mode this
  bootstrap step is specifically for avoiding.
- Report back in plain language what was copied, where, and what's
  deliberately *not* done yet (backend contract, entity config, styling —
  README section 2 steps 3–5), so the user knows the scaffold compiles but
  shows no real page yet.

## Notes on judgment

- **One frontend, always.** If the user explicitly asks for both (e.g. they
  want to offer a choice to their own users), that's a valid but different,
  larger request — confirm it's really intended before doubling the copied
  file set and dependency footprint.
- **Don't guess the target project's path.** If it's not already clear from
  what's open/mentioned, ask for it before writing anything — this skill
  writes into a project other than the one it lives in.
- **Stop at Step 4.** Continuing on to invent columns/filters/API calls for a
  specific entity without being asked turns a predictable bootstrap into a
  guess about the target's domain — that's exactly the part README section 2
  (steps 3–5) and section 3 leave to a normal conversation on purpose.
