-- v0.1.0 runtime completion: STL CADCore, quality comparisons, and retry audit.
ALTER TABLE tasks ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tasks ADD COLUMN last_error_code TEXT;

CREATE TABLE IF NOT EXISTS workflow_retry_attempts (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  attempt INTEGER NOT NULL,
  previous_workflow_id TEXT,
  workflow_id TEXT,
  error_code TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('SCHEDULED', 'STARTED', 'EXHAUSTED')),
  created_at TEXT NOT NULL,
  UNIQUE(task_id, attempt)
);
CREATE INDEX IF NOT EXISTS idx_workflow_retry_task_created ON workflow_retry_attempts(task_id, created_at DESC);

CREATE TABLE IF NOT EXISTS quality_comparisons (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  artifact_id TEXT NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  candidate_provider TEXT NOT NULL,
  candidate_model TEXT NOT NULL,
  minimax_score INTEGER NOT NULL,
  gpt_sol_score INTEGER,
  gpt_sol_status TEXT NOT NULL CHECK (gpt_sol_status IN ('REFERENCE_BASELINE', 'LIVE_EVALUATED', 'NOT_CONFIGURED')),
  rubric_version TEXT NOT NULL,
  details_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_quality_comparison_task_created ON quality_comparisons(task_id, created_at DESC);

-- Expand CAD job kinds without losing existing production rows.
DROP INDEX IF EXISTS idx_cad_jobs_task_created_at;
DROP INDEX IF EXISTS ux_cad_jobs_input_kind_active;
ALTER TABLE cad_jobs RENAME TO cad_jobs_v1;
CREATE TABLE cad_jobs (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  input_id TEXT NOT NULL REFERENCES task_inputs(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('G02_STEP_INSPECTION', 'G02_STL_INSPECTION')),
  status TEXT NOT NULL CHECK (status IN ('QUEUED', 'RUNNING', 'SUCCEEDED', 'BLOCKED', 'FAILED')),
  report_storage_key TEXT,
  normalized_brep_key TEXT,
  error_code TEXT,
  engine_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT
);
INSERT INTO cad_jobs (id, task_id, input_id, kind, status, report_storage_key, normalized_brep_key, error_code, engine_json, created_at, started_at, completed_at)
  SELECT id, task_id, input_id, kind, status, report_storage_key, normalized_brep_key, error_code, engine_json, created_at, started_at, completed_at FROM cad_jobs_v1;
DROP TABLE cad_jobs_v1;
CREATE INDEX IF NOT EXISTS idx_cad_jobs_task_created_at ON cad_jobs(task_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS ux_cad_jobs_input_kind_active ON cad_jobs(task_id, input_id, kind)
  WHERE status IN ('QUEUED', 'RUNNING', 'SUCCEEDED', 'BLOCKED');
