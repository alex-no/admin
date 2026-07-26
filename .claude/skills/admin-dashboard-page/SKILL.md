---
name: admin-dashboard-page
description: Add a stats/dashboard-style admin page (summary cards, top-N breakdowns, charts, optional drill-down) rather than a plain list+detail CRUD page. Use when asked to add analytics/stats/reporting/dashboard screens, or a chart, in this admin panel (backend/ Yii3 API + frontend/ Vue3 SPA). Different from the admin-data-page skill: that one is for entity list+detail management pages; this one is for pre-aggregated, mostly-read-only reporting views. Existing pages named Analytics/AnalyticsStats/AnalyticsCharts/ErrorLogStats are legacy carry-overs from production AllSTO and are explicitly called out as *not* the structural example to copy (see this project's root README) — this skill exists because there is no clean gold-standard reference for this page type the way `admin-data-page` has `StoRegistry.vue`.
---

# Adding a dashboard/analytics-style admin page

## Context: no gold-standard reference for this one — be more careful

For list+detail pages, `StoRegistry.vue` is the clean, current, `list-framework`-based example to copy. For dashboard-style pages, no equivalent exists: `pages/Analytics.vue`, `pages/AnalyticsStats.vue`, `pages/AnalyticsCharts.vue`, `pages/ErrorLogStats.vue`, `pages/FeedbackStats.vue` were **ported as-is from the production AllSTO project**, predate `list-framework`, and the root `README.md` explicitly says to look at `StoRegistry.vue` instead of these for structure. Treat them as **content reference** (what a dashboard typically needs) but not as a structural template to copy wholesale — and say so to the user if a request sounds like "just copy Analytics.vue".

## What to reuse anyway (the parts that are genuinely current)

Even inside the legacy pages, some pieces are still the right building blocks — use them rather than re-deriving your own:

- **`components/BaseModal.vue`** for any drill-down/detail modal. Don't hand-roll backdrop/card markup for a *new* modal — `AnalyticsDetailsModalContent.vue`'s own "Ban IP" confirmation dialog (a raw `.modal-backdrop-simple` + `.card` at the bottom of that file) is the anti-pattern to avoid, not an example to follow, even though it lives inside a page you're referencing for content.
- **`components/ModalTabs.vue`** for tab UI inside a detail modal, instead of hand-rolling `<ul class="nav nav-tabs">` the way `AnalyticsDetailsModal.vue`'s `#subheader` slot does. `ModalTabs` is a two-prop component (`tabs: [{key,label,icon}]`, `modelValue`) — there's no reason to reimplement it for a new dashboard's drill-down modal.
- **The four SVG chart components** — `components/BarChart.vue`, `PieChart.vue`, `TrendChart.vue`, `HourlyChart.vue`. Lightweight, dependency-free (hand-drawn SVG, no charting library) — reuse them rather than pulling in a chart library. **Their prop contracts are not unified — check the actual component before wiring data:**
  - `BarChart` / `PieChart`: `{ data: Array, labelKey: String, valueKey: String, color?/size? }` — generic `[{ [labelKey], [valueKey] }]` rows.
  - `TrendChart`: `{ labels: Array, datasets: [{ label, data, color }], height }` — Chart.js-style multi-series shape, not the same as Bar/Pie.
  - `HourlyChart`: its own bar-per-hour shape.
  Don't assume swapping one for another is a prop-compatible drop-in.
- **`utils/api.js`'s `apiPost`** (or whatever the current shared fetch helper is — check `utils/` before writing a new one) instead of copy-pasting the `authHeaders()` + raw `fetch()` boilerplate that's duplicated across the legacy pages. If a page-local `authHeaders()` is all that exists for a given call shape, at least don't add a fourth near-identical copy — check `composables/useAuth.js` for what's already centralized there.
- **If the dashboard needs a raw, filterable/sortable/paginated record table** (like `Analytics.vue`'s big pageview log, as opposed to pre-aggregated cards) — build that part with `list-framework/DataListPage.vue` (see the `admin-data-page` skill), not by copying `Analytics.vue`'s ~300 lines of hand-written fetch/sort/bulk-select logic. A dashboard can legitimately combine a `list-framework` table with hand-written summary cards above it; it doesn't have to be one or the other.

## What's fine to freehand (no framework primitive exists here, by design)

Summary-card grids, top-N tables, and distribution/progress-bar breakdowns have no reusable component — `AnalyticsStats.vue`'s layout (a `row g-3` of `card`s: totals, top-N tables, per-category breakdown with Bootstrap `.progress` bars, one `TrendChart` at the end) is a reasonable **layout** to imitate for a new stats page. Just don't also copy its per-page duplicated fetch/formatting helper functions if a shared version already exists elsewhere by the time you're doing this.

## Backend: pre-aggregate, don't ship raw rows

Dashboard endpoints return data shaped exactly for the cards, computed with SQL (`GROUP BY`/`COUNT`/window functions), not raw rows for the frontend to aggregate. Reference shape — `GET /api/admin/analytics/stats?days=N&section=X` returns:
```
{ total, unique_visitors, response_time: {avg_time, max_time}, top_pages: [...], top_referers: [...],
  by_device: [...], by_browser: [...], by_os: [...], by_client_type: [...], bot_categories: [...],
  top_bots: [...], trend: [{date, is_bot, count}, ...] }
```
Follow this pattern for a new dashboard: one endpoint, one query per breakdown, pre-grouped — not "fetch everything, aggregate in Vue."

## Drill-down with live actions (not just passive viewing)

If the detail modal needs to trigger real side effects — `AnalyticsDetailsModal.vue`'s ping/traceroute/reverse-DNS/blacklist-check/ban-IP buttons are genuine network calls, not stubs (see `AdminNetworkToolsController.php`) — keep each action as an explicit button with its own `loading`/result state (don't auto-run on modal open), and gate anything destructive (like banning an IP) behind its own nested `BaseModal` confirmation rather than a bare `confirm()`, especially if it also offers to delete related records.

## Notes on judgment

- **Ask before copying structure wholesale** from Analytics.vue/AnalyticsStats.vue — they're explicitly marked legacy in the project's own README, so silently cloning them perpetuates a pattern the project is trying to move away from. Pull out just the still-good primitives (BaseModal, ModalTabs, the chart components, list-framework for any embedded table) and build the rest fresh.
- **Don't force this into the `admin-data-page` shape.** If what's being asked for is genuinely "a table of entities with a detail card," that's the other skill, not this one — this one is for when the page is fundamentally about aggregated numbers/charts, not row-level CRUD.
