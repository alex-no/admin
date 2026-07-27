---
name: admin-audit-log
description: Add an audit log (who changed which field, from what to what, and when) to one or more resources in this admin panel — a new `audit_log` table plus explicit before/after diff recording added to that resource's controller, and a way to browse the history (dedicated page, or a tab in a tabbed detail modal). Use when asked to add change history / audit trail / revision tracking / "who changed X" to an entity. Not the same thing as `AdminErrorLogController`/`ErrorLogs.vue`, which log application errors, not data changes.
---

# Adding an audit log to a resource

## Context: no ORM, so there's no hook to piggyback on

Every controller here (`AdminStoController.php` etc.) is a `final readonly class` doing raw PDO — `UPDATE ... SET ... WHERE id = :id` built from an `EDITABLE` allow-list, no ORM dirty-tracking, no lifecycle events. There is nowhere to attach a generic "on save" listener; recording history means adding an explicit call in each resource's `update()`/`delete()` (and `create()` if creation events matter too). This is additive work **per resource**, not a one-time framework change — confirm with the user which resource(s) actually need it before wiring all of them; start with one, prove it, then repeat.

Also note: none of the demo tables carry `created_at`/`updated_at` (see `backend/data/seed.php`'s `CREATE TABLE sto (...)` — no timestamp columns at all). The audit log table has its own `created_at`; the *source* tables don't need one for this feature (that's a separate concern — see the `admin-optimistic-locking` skill, which does need one).

## Part 1 — the table

```sql
CREATE TABLE audit_log (
    id          INTEGER PRIMARY KEY,
    table_name  TEXT NOT NULL,
    record_id   INTEGER NOT NULL,
    action      TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
    user_id     INTEGER NOT NULL,
    changes     TEXT,              -- JSON: {"field": ["old", "new"], ...}; for delete, store the full deleted row instead
    created_at  TEXT NOT NULL
)
```

Add it to `seed.php` alongside the other `CREATE TABLE`s. Since this demo's SQLite resets on every container restart (`seed.php` reseeds from CSV), the audit log resets too by default — consistent with the rest of the demo's data model, and fine unless the user specifically wants history to survive a restart (in which case it needs to live outside the reseed step, which is a bigger architectural change worth flagging rather than assuming silently).

**Check for migration tooling before hand-editing schema anywhere else.** This demo genuinely has none — there's no `migrations/` folder and no migration package in `vendor/`, so raw SQL in `seed.php` *is* the project's actual convention, not a shortcut. If this skill is being applied to a project that has real migrations (e.g. allsto's `www_app/migrations`, Yii-style `M<timestamp><Name>.php` classes, one per change), write a proper migration there instead of hand-patching the schema — don't default to inline `CREATE TABLE`/`ALTER TABLE` just because that's what this demo does. Check the target project's actual convention first, the same way Part 3 below reuses whatever this project already has for resolving the current user, rather than inventing a new mechanism.

## Part 2 — a diff helper, written once

```php
final readonly class AuditLogger
{
    public function __construct(private PDO $pdo) {}

    public function record(string $table, int $recordId, string $action, ?array $before, ?array $after, int $userId): void
    {
        $changes = null;
        if ($before !== null && $after !== null) {
            $diff = [];
            foreach ($after as $key => $value) {
                if (($before[$key] ?? null) !== $value) {
                    $diff[$key] = [$before[$key] ?? null, $value];
                }
            }
            if ($diff === []) {
                return; // nothing actually changed — don't write a no-op row
            }
            $changes = json_encode($diff);
        } elseif ($action === 'delete') {
            $changes = json_encode(['_deleted_row' => $before]);
        }

        $this->pdo->prepare(
            'INSERT INTO audit_log (table_name, record_id, action, user_id, changes, created_at)
             VALUES (:table, :id, :action, :user_id, :changes, :now)'
        )->execute([
            'table' => $table, 'id' => $recordId, 'action' => $action,
            'user_id' => $userId, 'changes' => $changes, 'now' => date('c'),
        ]);
    }
}
```

Register it once (wherever `PDO`/`AdminAuth` are already wired for controllers) and constructor-inject it into any controller that needs it, same as `PDO` itself.

## Part 3 — wiring one resource's `update()`/`delete()`

Using `AdminStoController::update()` (`backend/src/Admin/Controller/AdminStoController.php:194-241`) as the concrete shape to extend — `$this->fetchRow($id)` and `$this->format($row)` already exist there for exactly this kind of before/after read:

```php
public function update(ServerRequestInterface $request): ResponseInterface
{
    // ...unchanged: guard, $id, $data, build $sets/$params from EDITABLE...

    $before = $this->fetchRow($id);            // the only available "hook" — read state before the write
    if ($before === false) {
        return $this->json(['status' => 'error', 'message' => 'STO not found'], 404);
    }

    $stmt = $this->pdo->prepare('UPDATE sto SET ' . implode(', ', $sets) . ' WHERE id = :id');
    $stmt->execute($params);

    $after = $this->fetchRow($id);
    $user  = $this->auth->userFromRequest($request);   // already resolves the bearer token to a user row — reuse it
    $this->auditLogger->record('sto', $id, 'update', $before, $after, (int) $user['id']);

    return $this->json(['status' => 'success', 'data' => $this->format($after)]);
}
```

For `delete()`: fetch the row first (`$before = $this->fetchRow($id)`), run the `DELETE`, then `record('sto', $id, 'delete', $before, null, $userId)`. `create()` (if the resource has one) is the same shape with `$before = null`.

## Part 4 — showing it on the frontend

Two shapes, pick based on scope (mirrors the `admin-data-page` skill's "pick a detail shape" judgment call):

- **One resource's history only** → a "Історія" tab inside that resource's tabbed detail modal (see `admin-data-page` skill Part 2 option 4 / `StoRegistry.vue` + `ModalTabs.vue`) — an empty-`TAB_FIELDS` (view-only) tab that fetches `GET /api/admin/audit-log?table=sto&record_id={id}` and renders a simple list (field, old → new, who, when).
- **Cross-resource browsing** (any table, any record, filterable by user/date) → a dedicated page, structurally identical to `ErrorLogs.vue`: `list-framework`-style filters for `table_name`/`user_id`/date range, columns for `record_id`/`action`/`changes`/`user`/`created_at`. New `AdminAuditLogController::list()` guarded by a new permission (e.g. `audit_log.view`, superadmin-only makes sense as a default — this is sensitive data).

## Notes on judgment

- **Don't wire every resource at once.** Prove the pattern on one controller the user actually cares about, then repeat — the diff helper doesn't change between resources, only the `record(...)` call site does.
- **Don't log everything verbatim.** Large free-text fields or anything binary/secret shouldn't go into `changes` unredacted — truncate or exclude fields you wouldn't want sitting in a browsable log.
- **This has no retention/cleanup story by default** — an audit log that grows forever is fine for a demo, but flag it explicitly if this pattern is heading toward a real production table; TTL/archiving is a separate decision this skill doesn't make for you.
