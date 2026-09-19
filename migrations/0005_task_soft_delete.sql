-- Task deletion is intentionally recoverable: files, audit history and delivery
-- packages remain retained while deleted tasks disappear from the task center.
ALTER TABLE tasks ADD COLUMN deleted_at TEXT;
CREATE INDEX IF NOT EXISTS idx_tasks_owner_deleted_created_at ON tasks(owner_id, deleted_at, created_at DESC);
