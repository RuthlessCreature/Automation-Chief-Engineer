-- Fault injection is staging/local-only. Production code hard-disables it.
CREATE TABLE IF NOT EXISTS fault_injection_marks (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  stage_id TEXT NOT NULL,
  scenario TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(task_id, stage_id, scenario)
);
