---
name: admin-data-page
description: Add a new data-management page to this admin panel (backend Yii3 API + Vue3 SPA in frontend/) — a list/table of items plus a detail view. Use whenever asked to add an admin page for managing some entity/catalog/registry, add a CRUD screen, add a list with filters, or add a detail/edit modal in this project. The list side is always the same (list-framework); the detail side has several valid shapes and this skill helps pick the right one instead of defaulting to copy-pasting the nearest existing page.
---

# Adding a new admin data-management page

## Context: this is a framework demo, not a one-off screen

This repo (`backend/` = Yii3 PHP API, `frontend/` = Vue3 + Vite SPA) is a reusable admin-panel scaffold — see the "Демо-модуль каркасу" note on `/data-registry` in `frontend/src/config/menu.json` and the "фейкові дані" comments in `AdminStoController.php`. New pages here double as reference implementations of the framework's `list-framework`, so consistency with the existing patterns matters more than in a typical one-off app: a sloppy one-off page here becomes the example the next page copies.

There are two generations of list page in this codebase:
- **Legacy, hand-rolled** (`pages/catalog/CarBrands.vue`, `pages/geography/Countries.vue`, etc.) — each page duplicates its own fetch/sort/paginate logic and opens edit modals via global `CustomEvent`s. This predates `list-framework`.
- **Current, config-driven** (`pages/StoRegistry.vue` using `list-framework/DataListPage.vue`) — this is the intended direction. **Build new pages this way**, even if an older page looks like the closest existing example. If the user points at an old-style page as "copy this", flag that a `list-framework`-based page is the current convention and confirm before copying the old pattern.

## Part 1 — the list (always present, always `list-framework`)

Every new page needs three small JSON configs plus a thin `.vue` file:

- **`{entity}.config.json`** — `apiList` / `apiUpdate` / `apiDelete`, `viewPermission` / `deletePermission`, and `actions` (row buttons — `{ type: 'detail', icon, label, tab? }` and `{ type: 'delete', ... }`). See `shared/page-configs/sto-registry.config.json` — page configs live **outside** both
  frontends and are read by Vue and React alike through the `@configs` alias; see
  `shared/page-configs/README.md` before adding a new flag.
- **`{entity}.columns.json`** — one entry per column: `key`, `label`, `type` (resolved via `list-framework/cellTypes.js`: `text` | `select` | `boolean` | `number` | `phone-list`, or a custom type registered with `registerCellType`), plus `sortable`, `editable`, `align`, `width`, and type-specific options (`options` for `select`, `min`/`max`/`step` for `number`). `editable: true` + `apiUpdate` gets you inline cell editing for free — no modal required for that field.
- **`{entity}.filter.json`** — one entry per filter: `key`, `type` (`text` | `select` | `checkbox`, via `filterTypes.js`), `label`, and either static `options` or `optionsUrl`/`optionsValueKey`/`optionsLabelKey` for a remote-loaded select (cached per-URL by `useRemoteOptions`, so reusing the same `optionsUrl` elsewhere — e.g. the same lookup inside the detail modal — doesn't cost a second request).
- **The page component** — wrap `list-framework/DataListPage.vue` in `components/ListPageWrapper.vue`, pass the three configs, and handle `@row-action` for anything not built-in (`detail`; `delete` is handled internally by `DataListPage` already). See `pages/StoRegistry.vue` lines 1–15 for the minimal shell.

Don't hand-write pagination, sorting, or the fetch loop — that's exactly what got duplicated across the legacy pages and is now centralized in `DataListPage.vue`.

## Part 2 — the detail: pick a shape, don't default to one

This is the part that genuinely varies. Work out which of these fits *before* writing code — retrofitting from the wrong shape is more work than choosing right the first time.

**Decide using these questions, in order:**

1. **Does the item need a detail view at all?** If every field a user would want to change is short and belongs in the table itself (a handful of scalar fields, no long text, no nested lists), inline-editable columns (`editable: true` in `columns.json`) may be the whole story — no modal needed beyond maybe a small create form. Don't build a detail modal nobody will open.
2. **Is it read-mostly, rich, computed/log-like data** (a stack trace, a feedback message, an analytics breakdown) rather than a form the user edits? Use the **content-component + thin-modal-wrapper split**: a dumb `Xxx­Detail.vue` that just renders the data, plus a `XxxDetailModal.vue` that puts it inside `BaseModal`. Reference: `ErrorLogDetail.vue` + `ErrorLogDetailModal.vue`, `FeedbackDetail.vue` + `FeedbackDetailModal.vue`. This split keeps the rendering reusable/testable separately from the modal chrome.
3. **Does one item have few enough fields to fit one simple form**, with create and edit sharing that form? Use a **single-purpose `BaseModal`** with a `modalMode: 'create' | 'edit'` — see `CarBrandModal.vue`. Opened today via a global `CustomEvent` from the (legacy-style) list page; fine to keep that trigger convention for a small reference-data modal even on an otherwise list-framework-based page.
4. **Does one item have enough fields/sections to need grouping** (general info, contacts, description, plus maybe a read-only computed section like a rating), or do you want row actions that jump straight to one section? Use the **tabbed detail modal** — this is the richest and currently most-featured pattern, and the one to prefer for anything non-trivial. Reference implementation: `StoRegistry.vue` + `components/ModalTabs.vue`. It gives you, largely for free:
   - `BaseModal`'s built-in floating / docked-right / docked-bottom modes (user-switchable, persisted in `localStorage` — you don't design a layout for this, it's automatic).
   - Row actions that open a specific tab directly (`{ type: 'detail', tab: 'contacts' }` in `config.json`'s `actions`).
   - A `TAB_FIELDS` map deciding which fields belong to which tab — an empty array marks a view-only tab (its Save buttons hide automatically). Read-only computed data (e.g. a rating) is a tab with `[]`.
   - "Save" (current tab only) vs "Save & Close" (all tabs) — send only `TAB_FIELDS[activeTab]` vs the union of all of them.
   - An unsaved-changes guard: `watch(detailOpen)` compares the live form to a snapshot taken on open, and `confirm()`s before letting the modal close if they differ (needed because `BaseModal`'s ✕/backdrop/ESC all just flip `visible` — see `MODAL_WINDOWS.md`'s note that ESC goes through the same `handleClose()`).
   - Deep-linkable state via `useUrlFilters`'s `detail` option (`{ id, onOpen }`) — the open record's id and active tab live in the URL, so a saved/shared link reopens the same record on the same tab. Needs a backend `GET /{id}` endpoint to hydrate from a cold URL load.
5. **Is the detail itself a workflow or too large for any modal** (a review/approval queue, a multi-step process, something that wants its own breadcrumb or sub-navigation)? Use a **dedicated route/page** instead of a modal — the exception, not the default. References: `pages/geography/CityTmpReview.vue`, `pages/StoApplications.vue`. Only reach for this when a docked-modal genuinely can't hold the content or the workflow needs its own URL structure beyond `?detail=<id>`.

When unsure between options 3 and 4, count fields: roughly more than ~6–8 fields, or fields that naturally split into named groups, tips toward tabs.

## Part 3 — the backend pairing

For each new page, add `backend/src/Admin/Controller/Admin{Entity}Controller.php` (`final readonly class`, constructor-injects `AdminAuth`, `PDO`, `ResponseFactoryInterface`, uses `JsonResponseTrait`). Mirror `AdminStoController.php`:

- `list()` — guard with `$this->auth->guard($request, '{entity}.view')`; read `page`/`per_page` (clamp `per_page` to a sane max like 250)/`search`/entity-specific filters/`sort_by`+`sort_dir` (comma-separated for multi-column sort, in priority order — matches the frontend's Ctrl+click-to-add-sort-column behavior); return `{ status, data, pagination: { page, per_page, total, total_pages } }`.
- `show()` — `GET /{id}`, guarded by the same `.view` permission; needed for the tabbed-modal deep-link case (Part 2, option 4) even if nothing else uses it.
- `update()` — `PATCH /{id}`, guarded by `'{entity}.edit'`; accept a **partial** body (iterate an `EDITABLE` allow-list constant, only set fields present via `array_key_exists`) — this is what makes both inline cell-editing and per-tab "Save" work without the frontend ever sending a full-entity payload.
- `delete()` — guarded by `'{entity}.edit'`/`'{entity}.delete'` as appropriate.
- Keep the `OA\*` attributes on every method (this project auto-generates its API docs from them — see `ApiDocController.php` / the "Dev Tools → API Docs" menu entry) — copy the shape from `AdminStoController.php` rather than skipping them.
- Permission strings must line up 1:1 with the frontend's `config.json` (`viewPermission`/`deletePermission`) and the `menu.json` entry's `permission`.

Ask (don't assume) whether the new page's data is meant to be another demo/fake dataset (SQLite, reseeded from a CSV under `backend/data/`, like `sto`) or a real data source — that changes how carefully `update()`/`delete()` need to guard against destructive mistakes.

## Part 4 — wiring it in

- Add the route in `frontend/src/router/index.js` (grouped with its siblings — `Geography`/`Catalog`/etc. sections are already comment-delimited).
- Add a menu entry in `frontend/src/config/menu.json` under the right section (`items[]`), with matching `permission` and `roles`. `TopNav.vue` filters sections/items by these automatically — nothing else to wire for the nav to pick it up.
- Match existing UI copy conventions: labels/menu text are Ukrainian (`"Марки авто"`, `"Реєстр даних"`, etc.) — write new labels the same way rather than introducing English or another locale.

## Notes on judgment

- **Don't copy the nearest file blindly.** The nearest existing page might be legacy-style (Part 1) or might use the wrong detail shape for the new entity's actual field count (Part 2) — walk both decisions explicitly even when an obviously-similar page exists.
- **Read `docs/BASE_MODAL_USAGE.md` and `docs/MODAL_WINDOWS.md`** before hand-writing any modal chrome — the floating/docked/resize/persistence behavior is meant to come from `BaseModal`/`useModalWindow`, not be reimplemented.
- **The tabbed-modal pattern (Part 2 option 4) is the one to reach for by default** for anything that isn't clearly trivial (option 1) or clearly read-only (option 2) — it's the newest, most complete pattern, and under-using it just means the next page has to duplicate what it already solved (unsaved-changes guard, deep-linking, tab-scoped save).
