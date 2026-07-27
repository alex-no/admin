---
name: admin-optimistic-locking
description: Guard against two admins silently overwriting each other's edits to the same record. Use when asked to add "concurrent edit" protection, prevent lost updates, detect stale saves, or add real-time "someone else is editing this" indicators. Covers two tiers — a cheap version-check (recommended default) and an expensive realtime-presence variant — and how to decide between them; don't reach for the realtime tier unless the cheap one has actually proven insufficient in practice.
---

# Guarding against concurrent edits

## Context: this doesn't exist here yet, and most resources can't support it as-is

None of the demo's SQLite tables carry a version or timestamp column (`backend/data/seed.php`'s table definitions have no `updated_at`/`version` — see `CREATE TABLE sto (...)`), so **the first step for any resource is adding one**, not just adding a check. There are two tiers to this feature; start with the first and only escalate if explicitly asked to.

## Tier 1 (default): optimistic concurrency via a version check

**The idea:** the client remembers which version of a record it loaded; on save, it sends that version along; the server only writes if nothing else has saved in between, otherwise it refuses with a conflict instead of silently overwriting.

**Step 1 — add a version column** to the resource's table:
```sql
ALTER TABLE sto ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
```
Prefer a plain incrementing integer over reusing/adding `updated_at` for the comparison — a timestamp has real-world resolution and clock issues (two writes in the same second look identical), while `version = version + 1` is unambiguous. Nothing stops a resource from having both (`version` for conflict detection, `updated_at` purely for display).

**Check for migration tooling before hand-editing schema.** This demo has none — no `migrations/` folder, no migration package in `vendor/`, so an inline `ALTER TABLE` in `seed.php` matches how every other table here is defined. If applying this skill to a project with real migrations (e.g. allsto's `www_app/migrations`, Yii-style `M<timestamp><Name>.php` classes, one per change), add a proper migration there instead of hand-patching the schema — don't default to raw SQL just because that's what this demo does. Same applies to Tier 2's `edit_locks` table if that gets built.

**Step 2 — return `version` from `list()`/`show()`.** It's already part of the fetched row — no new query, just include it in `format()`.

**Step 3 — the frontend sends it back.** The detail modal already loads the full row before rendering; keep the `version` it saw alongside the rest of the form state, and send it in the `PATCH` body (`{ ...fields, expected_version: modalData.version }`), not just the edited fields.

**Step 4 — the backend checks it**, extending `AdminStoController::update()`'s pattern (`backend/src/Admin/Controller/AdminStoController.php:194-241`):
```php
$expectedVersion = (int) ($data['expected_version'] ?? 0);

$stmt = $this->pdo->prepare(
    'UPDATE sto SET ' . implode(', ', $sets) . ', version = version + 1
     WHERE id = :id AND version = :expected_version'
);
$stmt->execute([...$params, 'expected_version' => $expectedVersion]);

if ($stmt->rowCount() === 0) {
    $current = $this->fetchRow($id);
    if ($current === false) {
        return $this->json(['status' => 'error', 'message' => 'STO not found'], 404);
    }
    // Row exists but the WHERE didn't match — someone else saved first.
    return $this->json([
        'status'  => 'error',
        'message' => 'Запис змінено іншим адміністратором',
        'code'    => 'version_conflict',
        'data'    => $this->format($current),
    ], 409);
}
```
Returning the current row alongside the 409 lets the frontend show what actually changed, not just "try again blind."

**Step 5 — the frontend handles 409.** In the tabbed-modal's save handler (same place the existing unsaved-changes `confirm()` guard lives — see `admin-data-page` skill Part 2 option 4), catch `code === 'version_conflict'` and `notify()` (not a blocking `alert`/`confirm` — this project already moved off those) with an action button "Перезавантажити", which re-fetches the record and either re-opens the form with fresh data or, if the user's own edits would be lost, asks first via the same unsaved-changes-guard pattern.

This is the entire feature for one resource — no new infrastructure, one migration, a handful of lines per controller. Repeat per-resource like the audit-log skill; the version-check shape is the same each time, only table/field names change.

## Tier 2 (only if explicitly asked): realtime "someone is editing this" presence

Only worth building if actual conflicts are happening in practice and a post-save conflict toast (Tier 1) isn't good enough — i.e. admins want to know *before* they start typing, not after they try to save. Confirm this is genuinely wanted before starting; it's a real infrastructure addition, not just a code pattern.

**Why it's a bigger lift here specifically:** the backend runs as PHP-FPM/Apache — each request is its own process with no shared memory, so "who's currently editing what" can't just live in a PHP variable. It needs a shared store:
- A `edit_locks` table (`table_name, record_id, user_id, acquired_at`) that the frontend refreshes with a heartbeat (`POST /api/admin/edit-locks` every few seconds while a modal is open, `DELETE` on close) and polls on an interval — cheap, no new service, works with what's already here.
- Or a real push channel (SSE endpoint the frontend subscribes to via `EventSource`, backed by Redis pub/sub or similar) if actual real-time (not poll-interval) latency matters — this is a genuine new service dependency, not just new code.

Start with the polling `edit_locks` table if this tier gets built at all — it reuses the existing PDO/SQLite setup and gets "someone else is editing this" banners without adding infrastructure. Only reach for a push channel if polling latency (a few seconds) is actually reported as a problem.

## Notes on judgment

- **Always build Tier 1 first, and often stop there.** It solves the actual damage (lost writes) at a fraction of the cost of Tier 2, which only adds an early warning, not protection by itself — Tier 1's version check should stay in place even if Tier 2 is also built.
- **Don't add `version` to every table speculatively.** Add it to the specific resource(s) someone's actually worried about; it's a per-resource migration + a few controller lines, same cost profile as the audit-log skill's per-resource wiring.
- **Tier 2 is infrastructure, not a feature toggle.** Treat proposing it the way the `admin-data-page` skill treats picking a detail-modal shape — work out which tier actually fits before writing code, don't default to the fancier one just because it's what react-admin does out of the box.
