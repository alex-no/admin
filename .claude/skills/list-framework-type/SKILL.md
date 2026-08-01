---
name: list-framework-type
description: Add a new reusable cell type or filter type to frontend/src/list-framework itself (cellTypes.js / filterTypes.js), as opposed to just consuming an existing type in a new page's JSON config (that's the admin-data-page skill). Use when the built-in types (text/select/boolean/number/datetime/badge/link/image/phone-list for cells; text/select/date/checkbox for filters) can't represent a column or filter a new page needs — e.g. a new structured value, a custom widget, a new remote-loaded control. Higher-stakes than adding a page: these registries are shared by every existing page through DataListPage.vue.
---

# Extending list-framework's cell/filter type registry

## Context: this is shared, framework-level surface

`frontend/src/list-framework/cellTypes.js` and `filterTypes.js` are `Map`-based registries that every page's `DataListPage.vue` resolves column/filter `type` strings through. Adding a **new** key is additive and safe. Changing or removing behavior of an **existing** key affects every page already using it — before touching an existing type, grep `frontend/src/pages/**/*.{columns,filter}.json` for its `"type"` value and check every hit still works with your change.

## Step 1 — decide: page-local one-off, or a real new framework type?

- **Used by exactly one page, no reuse expected**: use the built-in `custom` escape hatch — no registry edit needed.
  ```json
  { "key": "my_field", "type": "custom", "component": "my-widget", ... }
  ```
  ```vue
  <DataListPage :custom-cell-types="{ 'my-widget': MyWidgetCell }" ... />
  <!-- or :custom-filter-types for a filter -->
  ```
  See `DataListPage.vue`'s `resolveCellComponent`/`resolveFilterComponent`: `type === 'custom'` looks the component up in the `customCellTypes`/`customFilterTypes` prop by `field.component`, bypassing the shared registry entirely.
- **Genuinely reusable across pages/entities**: register it in the shared registry instead —
  ```js
  import { registerCellType } from '@/list-framework/cellTypes'   // or registerFilterType from filterTypes
  registerCellType('my-type', MyTypeCell)
  ```
  Check where existing registrations happen (app bootstrap, e.g. `main.js`) before picking a spot — don't scatter `registerCellType` calls inside random page components. After this, any page's JSON can just say `"type": "my-type"`.

## Step 2 — the exact component contract

**Cell components** (`list-framework/cells/*.vue` — see `TextCell.vue`, `NumberCell.vue`, `PhoneListCell.vue` as references):

| | |
|---|---|
| Props | `field: Object` (required — the whole column-config entry from JSON, so type-specific options like `min`/`max`/`options` ride along), `modelValue` (type matches your data shape), `readonly: Boolean` (default `true`), `row: Object` (default `{}` — the full row) |
| Emits | `update:modelValue` |
| Must render | both branches: `v-if="readonly"` → plain display (`{{ modelValue ?? '—' }}`); `v-else` → the editable control |
| Must tolerate | `row` being `{}` — `DataListPage`'s bulk-edit panel renders your cell with `:row="{}"` (there's no "current row" when bulk-applying one value to many), so don't destructure fields off `row` unconditionally |

**Filter components** (`list-framework/filters/*.vue` — see `FilterSelect.vue`): simpler — just `field: Object` (required) and `modelValue`, emitting `update:modelValue`. No `readonly`/`row` (filters are always interactive).

For a remote-loaded option list (filter or a select-like cell), branch on `field.optionsUrl` vs static `field.options` and go through `useRemoteOptions(url, { valueKey, labelKey, placeholderOption })` (`list-framework/composables/useRemoteOptions.js`) rather than writing a new fetch — it caches by URL at module scope, so the same lookup reused elsewhere (another column, another page, a detail-modal dropdown) costs no extra request.

For a **structured/compound value** (array, object — see `PhoneListCell.vue`): keep a local editing buffer (`ref`) synced from `modelValue` via `watch(() => props.modelValue, ..., { immediate: true })`, and guard against your own `emit('update:modelValue', ...)` re-triggering that same watcher mid-edit (a `selfUpdate` boolean flag flipped right before emitting, checked and cleared at the top of the watcher — copy this from `PhoneListCell.vue` rather than re-deriving it). Do "pretty" display formatting inside the cell; do lossy/canonicalizing normalization (e.g. E.164 phone format) only once, at actual save time in the *page*, not inside the cell.

## Step 3 — bulk-edit support is automatic, don't build it separately

`DataListPage.vue`'s bulk-actions panel resolves the field's cell type through the exact same `resolveCellComponent()` used for inline editing — any column with `"editable": true` becomes bulk-editable for free as long as your component honors the contract above (especially the `row: {}` tolerance). Don't write a second "bulk edit" widget for a new type.

## Step 4 — keep the docs in sync

The root `README.md` §4.3 ("Власний (кастомний) елемент фільтра або колонки") documents the `custom`/`registerCellType` mechanism and enumerates the built-in types. If you add a genuinely new **built-in** (registered, reusable) type, add it to that enumeration; a one-off `custom` type used by a single page doesn't need a README mention.

## Notes on judgment

- **Additive is cheap, behavioral change is not.** A brand-new `type` key can't break anything. Changing what an existing `type` renders or emits can silently break every page's config that already references it — grep before you touch one.
- **This is not the same task as `admin-data-page`.** If the ask is "add a page for entity X" and the existing cell/filter types already cover its fields, you don't need this skill at all — just use the types that exist.
