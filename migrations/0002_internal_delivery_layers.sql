-- Artifacts are never assumed to be customer-visible merely because a stage passed.
ALTER TABLE artifacts ADD COLUMN visibility TEXT NOT NULL DEFAULT 'INTERNAL'
  CHECK (visibility IN ('INTERNAL', 'PREVIEW_DERIVATIVE', 'CUSTOMER_DELIVERY'));

CREATE TABLE IF NOT EXISTS delivery_packages (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL UNIQUE REFERENCES tasks(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('ASSEMBLING', 'FROZEN', 'REJECTED')),
  manifest_key TEXT NOT NULL,
  zip_key TEXT,
  sha256 TEXT,
  approved_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  frozen_at TEXT
);

CREATE TABLE IF NOT EXISTS artifact_derivatives (
  id TEXT PRIMARY KEY,
  source_artifact_id TEXT NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('OFFICE_PREVIEW', 'PDF_PREVIEW', 'IMAGE_PREVIEW', 'TEXT_PREVIEW')),
  storage_key TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(source_artifact_id, kind)
);
