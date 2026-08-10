# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A reusable admin-panel **framework/scaffold**, not a product. The demo entity ("СТО" / `sto`)
and its fake Yii3+SQLite backend exist only to prove out and demonstrate the reusable pieces —
`list-framework` (config-driven list+filter+pagination) and `BaseModal` (universal detail
window). Two frontends live side by side on purpose: `frontend/` (Vue 3, **the reference
implementation** — when Vue and React disagree, Vue is correct) and `frontend-react/` (React 18,
a full port proving the framework isn't Vue-specific). Both hit the same Yii3 backend and share
code via `shared/` (see below). The project's own root `README.md` is extensive (Ukrainian) and
is the deepest source of truth for how to extend the framework — read it before README-adjacent
work; this file only orients you and avoids repeating it.

The backend is intentionally fake: SQLite is dropped and reseeded from `backend/data/csv/*.csv`
(plus procedurally generated analytics data) on **every container start**. Never treat data in it
as durable.

## Repository layout

```
backend/          Yii3 (PHP 8.2+) API — raw PDO, no ORM, SQLite reseeded from CSV on boot
frontend/          Vue 3 + Vite SPA — the reference frontend
frontend-react/     React 18 + TS + Vite SPA — full port, mirrors frontend/ 1:1 where possible
shared/core/        Framework-agnostic TS logic used by BOTH frontends (no vue/react imports)
shared/page-configs/  JSON page configs (columns/filter/config) read by BOTH frontends
shared/locales/      i18n JSON (uk/en/ru) read by BOTH frontends
tasks/react-admin-parity/  Historical task tracker for bringing React to parity with Vue (mostly done — see STATUS.md)
.claude/skills/      Project-specific Claude Code skills (see below)
```

`shared/` is deliberately a sibling of both frontends, not nested inside one — both `vite.config`
resolve `@core` → `shared/core`, `@configs` → `shared/page-configs`, `@locales` → `shared/locales`.
**Don't duplicate anything from `shared/` into a frontend** — that's exactly the mistake this
layout was created to prevent (see `shared/page-configs/README.md` for the incident where a Vue
and a React copy of the same config silently diverged).

## Commands

### Whole stack (Docker — the normal way to run this)

```bash
docker compose up -d --build      # first run: installs npm deps, composer create-project, seeds SQLite
docker compose restart frontend         # Vue picked up no edits (Windows+Docker Desktop file-watcher gap)
docker compose restart frontend-react   # same, for React
docker compose restart backend          # PHP is re-read per request, but new composer deps/namespaces need this
```
- Vue dev server: http://localhost:5173 — React dev server: http://localhost:5174 — API: http://localhost:8080
- Swagger UI: http://localhost:5173/api/admin/doc
- Login: `admin`/`admin123` (superadmin) or `manager`/`manager123` (restricted) — see `backend/data/csv/users.csv`
- Edit `backend/data/csv/*.csv` → `docker compose restart backend` to reseed with new demo data.

### Frontend (Vue) — `frontend/`
```bash
npm run dev / build / preview     # no lint/test scripts defined here
```

### Frontend (React) — `frontend-react/`
```bash
npm run dev
npm run build                      # tsc && vite build — treat tsc errors as build failures
npm run lint                       # eslint --max-warnings 0
docker exec admin_frontend_react npx tsc --noEmit    # type-check only, inside the running container
docker exec admin_frontend_react npx vite build      # production build check, inside the container
```

### Shared core logic — `shared/core/`
```bash
cd shared/core && npm install && npm test     # vitest, framework-independent
```
Any new function here needs a `*.test.ts` next to it (see its `README.md` rule 3).

### Backend — `backend/` (Yii3, PHP)
```bash
composer test                      # codecept run — full suite (Unit/Functional/Web/Console under tests/)
vendor/bin/codecept run Unit        # single suite
vendor/bin/codecept run tests/Unit/SomeTest.php   # single test file
vendor/bin/psalm                    # static analysis (config: psalm.xml)
vendor/bin/php-cs-fixer fix          # code style (config: .php-cs-fixer.php)
vendor/bin/rector process            # automated refactoring checks (config: rector.php)
```
These normally run inside `admin_backend` (`docker exec admin_backend ...`) since that's where
`vendor/` and the PHP 8.2 runtime actually live.

## Architecture

### list-framework (the core reusable mechanism)

A JSON-driven list page: columns, filters, and endpoint/permission wiring are data, not markup.
- Vue: `frontend/src/list-framework/DataListPage.vue` + `cellTypes.js`/`filterTypes.js` registries
- React: `frontend-react/src/list-framework/components/DataTable.tsx` + `useTableState.ts` +
  `cellTypes.ts`/`filterTypes.ts`
- Both are driven by the **same three JSON files** per entity in `shared/page-configs/`:
  `{entity}.columns.json`, `{entity}.filter.json`, `{entity}.config.json`. See
  `shared/page-configs/README.md` for the full field contract (bulk actions, CSV import, field
  permissions) before adding a new page or a new config flag.
- Cell/filter `type` strings resolve through a shared `Map`-based registry
  (`cellTypes.js`/`.ts`, `filterTypes.js`/`.ts`). New keys are additive and safe; changing an
  *existing* type's behavior affects every page already using it — grep
  `pages/**/*.{columns,filter}.json` for the type first. See the `list-framework-type` skill.
- Pagination, bulk operations, the column-visibility selector, and one-minute live polling are
  built into `DataListPage.vue`/`DataTable.tsx` unconditionally — they are **not** config flags.
- The gold-standard example page tying all of this together: `frontend/src/pages/StoRegistry.vue`
  + `shared/page-configs/sto-registry.*.json` (Vue), `frontend-react/src/pages/DataRegistry.tsx`
  (React). Use it as the template for new list+detail pages, not any hand-rolled page.

### BaseModal (the other core reusable mechanism)

The **only** modal in the project — three display modes (floating / docked-right /
docked-bottom), drag/resize, localStorage-persisted mode, closes on Escape/backdrop/X. Never
hand-roll modal markup; wrap `<BaseModal>` (Vue: `frontend/src/components/BaseModal.vue` +
`useModalWindow.js`) or its React equivalent (`BaseModal.tsx` + `useModalWindow.ts`) and pass
content via slots/props. Details and gotchas (e.g. closing must be driven by watching `visible`,
not by a page's own `close()` function): README section 4.4 and `frontend/docs/BASE_MODAL_USAGE.md`.

### Backend controllers (`backend/src/Admin/Controller/`)

Raw PDO, no ORM — `final readonly class` per resource. `AdminStoController.php` is the reference
pattern for a full list-framework-backed resource: `list()`/`show()`/`create()`/`update()`/
`delete()`/`import()`/`bulk()`, with:
- `EDITABLE` — allow-list of PATCH-able fields
- `FIELD_PERMISSIONS` — per-field permission overrides beyond the coarse `{resource}.edit`
  (server is intentionally stricter than the frontend's `can()`, which only understands
  wildcards like `module.*`)
- `BULK_EDITABLE` / `BULK_ACTIONS` — whitelist for bulk update vs. named one-click bulk actions
  (the action name comes from the client; the field+value it maps to is decided server-side only)
- Multi-column sort with `sort_by`/`sort_dir` (comma-separated, order = priority); a column whose
  DB value is a code but displayed as a label needs a `CASE...WHEN` substitution in `ORDER BY`
  (see `sortExpr()`) rather than sorting on the raw code.
- `#[OA\...]` attributes (`zircote/swagger-php`) for Swagger — follow this style for new endpoints.
- No ORM hooks means no generic audit/history mechanism exists — see the `admin-audit-log` skill
  if asked to add one. No `version`/`updated_at` columns exist anywhere — see
  `admin-optimistic-locking` skill if asked to guard against concurrent edits.

### `shared/core/` — framework-agnostic logic

Pure TS, **zero** imports from `vue`/`react`/`@angular/*` (only vanilla browser APIs like `Blob`
in `csv.ts` are allowed). Holds business logic that both frontends need identically: permission
matching, URL/query building, sort cycling, bulk request bodies, undo-mutation stores, etc. Its
`README.md` documents real Vue/React behavioral divergences found while porting (canonical
behavior is Vue's, unless explicitly noted otherwise) — read it before assuming the two
frontends behave the same for anything sort/URL/modal-margin related. Rule: only things *already*
duplicated across both frontends belong here — no speculative "future reuse."

### Where Vue and React intentionally diverge

Documented in README section 6 ("Де реалізації свідомо розходяться") — page↔modal communication
style, `useUrlFilters` state ownership, route permission gating (React has `RequirePermission.tsx`,
Vue's router only checks token presence), i18n scope (Vue's `useI18n()` is per-component unless
`{ useScope: 'global' }`; React's `useTranslation()` is always global), and the docked-modal
content-margin mechanism (Vue wraps every list page in `ListPageWrapper.vue`; React applies it
once globally in `BaseLayout.tsx` — don't wrap a React page in a margin handler a second time,
the offset would double).

### Legacy pages still in the repo

`frontend/src/pages/StoList.vue` (Vue) is old hand-rolled list code kept deliberately as a
**yardstick** (same data/columns as `StoRegistry.vue`) — not a pattern to copy. `Analytics*`,
`ErrorLogStats.vue`, `FeedbackStats.vue` etc. are dashboard-style pages ported as-is from the
production AllSTO project, predate `list-framework`, and are explicitly *not* the structural
example for new dashboard pages (there is no clean gold-standard for that page type yet — see
the `admin-dashboard-page` skill). ~46 other hand-rolled catalog/geography pages were deleted
2026-08-07; if a stale doc or request references one, treat that as the doc being outdated, not
as something to recreate.

## Claude Code skills in this repo

`.claude/skills/` — these trigger automatically on matching requests, no special phrasing needed:
- `admin-integrate` — bootstrap this framework into another project (file copying, `@core` alias)
- `admin-data-page` — add a new list+detail page; picks the right detail-view shape (tabs / thin
  read-only wrapper / simple create-edit form / separate workflow page)
- `admin-dashboard-page` — add a stats/analytics-style page (different shape from list+detail)
- `list-framework-type` — add a new cell/filter type to the shared registries
- `admin-audit-log` — add change-history tracking to a resource (not built in; per-resource work)
- `admin-optimistic-locking` — add concurrent-edit protection (not built in; per-resource work)

## Conventions worth knowing before editing

- Page configs (`shared/page-configs/*.json`) are plain JSON — **no comments allowed in them**;
  put explanations in `shared/page-configs/README.md` instead.
- A new list-framework config flag must be understood identically by **both** renderers — verify
  Vue and React both read it, not just one.
- i18n: a config label is either plain text or a translation key (`"table.name"`) — the renderer
  distinguishes by the presence of a dot, no separate flag needed.
- Empty cell values render as "—" by default; `emptyLabel` overrides this when blank is
  semantically meaningful (supported by `text`/`number`/`select`/`badge`/`link`, not `phone-list`).
- Windows + Docker Desktop file-watching is unreliable on non-system drives — if edits don't show
  up live, restart the relevant container rather than assuming the change is broken.
- `DEPLOY.md` and `deploy-staging.ps1` are gitignored (contain real host/path info) — deployment
  process is internal, not part of this repo's public contract.
