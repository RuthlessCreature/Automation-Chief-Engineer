CREATE TABLE IF NOT EXISTS task_inputs (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  uploaded_by TEXT NOT NULL REFERENCES users(id),
  original_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
  storage_key TEXT NOT NULL UNIQUE,
  sha256 TEXT NOT NULL,
  intake_status TEXT NOT NULL CHECK (intake_status IN ('STAGED_FORMAT_VALIDATED', 'REJECTED')),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_task_inputs_task_id ON task_inputs(task_id, created_at);
