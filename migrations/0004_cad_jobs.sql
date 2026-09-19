CREATE TABLE IF NOT EXISTS cad_jobs (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  input_id TEXT NOT NULL REFERENCES task_inputs(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('G02_STEP_INSPECTION')),
  status TEXT NOT NULL CHECK (status IN ('QUEUED', 'RUNNING', 'SUCCEEDED', 'BLOCKED', 'FAILED')),
  report_storage_key TEXT,
  normalized_brep_key TEXT,
  error_code TEXT,
  engine_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_cad_jobs_task_created_at ON cad_jobs(task_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS ux_cad_jobs_input_kind_active ON cad_jobs(task_id, input_id, kind)
  WHERE status IN ('QUEUED', 'RUNNING', 'SUCCEEDED', 'BLOCKED');

