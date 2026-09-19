CREATE TABLE IF NOT EXISTS workflow_incidents (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('WARNING', 'ERROR')),
  source TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'ACKNOWLEDGED', 'RESOLVED')),
  detail_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  acknowledged_at TEXT,
  acknowledged_by TEXT REFERENCES users(id),
  resolved_at TEXT,
  resolution_note TEXT
);

CREATE INDEX IF NOT EXISTS idx_workflow_incidents_status_created
  ON workflow_incidents(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_incidents_task_created
  ON workflow_incidents(task_id, created_at DESC);
