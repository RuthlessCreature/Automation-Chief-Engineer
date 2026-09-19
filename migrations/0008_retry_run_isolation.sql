-- A manual quality rework starts a new workflow run for the same task. Retry
-- attempt numbers are scoped to that run; the old UNIQUE(task_id, attempt)
-- constraint incorrectly made a later rework collide with historical retries.
ALTER TABLE workflow_retry_attempts RENAME TO workflow_retry_attempts_v1;
CREATE TABLE workflow_retry_attempts (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  attempt INTEGER NOT NULL,
  previous_workflow_id TEXT,
  workflow_id TEXT,
  error_code TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('SCHEDULED', 'STARTED', 'EXHAUSTED')),
  created_at TEXT NOT NULL,
  UNIQUE(task_id, attempt, workflow_id)
);
INSERT INTO workflow_retry_attempts (id, task_id, attempt, previous_workflow_id, workflow_id, error_code, status, created_at)
  SELECT id, task_id, attempt, previous_workflow_id, workflow_id, error_code, status, created_at FROM workflow_retry_attempts_v1;
DROP TABLE workflow_retry_attempts_v1;
CREATE INDEX IF NOT EXISTS idx_workflow_retry_task_created ON workflow_retry_attempts(task_id, created_at DESC);
