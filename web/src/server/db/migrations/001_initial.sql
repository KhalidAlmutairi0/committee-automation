CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'team' CHECK (role IN ('team', 'committee_member', 'committee_lead')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash char(64) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS login_attempts (
  key_hash char(64) PRIMARY KEY,
  attempts integer NOT NULL DEFAULT 0,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  blocked_until timestamptz
);

CREATE SEQUENCE IF NOT EXISTS project_number_seq START 1;

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id text NOT NULL UNIQUE,
  owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  name text NOT NULL,
  lead_name text NOT NULL,
  lead_phone text NOT NULL,
  deputy_name text NOT NULL DEFAULT '',
  deputy_phone text NOT NULL DEFAULT '',
  formats text[] NOT NULL,
  other_format text NOT NULL DEFAULT '',
  attendance integer NOT NULL CHECK (attendance > 0),
  budget numeric(14,2) NOT NULL CHECK (budget >= 0),
  duration text NOT NULL,
  stakeholders text[] NOT NULL DEFAULT '{}',
  resources text[] NOT NULL DEFAULT '{}',
  proposed_size text CHECK (proposed_size IN ('صغير', 'متوسط', 'كبير', 'تقني')),
  approved_size text CHECK (approved_size IN ('صغير', 'متوسط', 'كبير', 'تقني')),
  intake_status text NOT NULL CHECK (intake_status IN ('auto_approved', 'pending_lead', 'lead_approved')),
  intake_reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS projects_owner_idx ON projects(owner_user_id);

CREATE TABLE IF NOT EXISTS timeline_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  milestones jsonb NOT NULL,
  prep_activities jsonb NOT NULL DEFAULT '[]'::jsonb,
  checks jsonb NOT NULL,
  calculated_decision text NOT NULL CHECK (calculated_decision IN ('approved', 'approved_with_warnings', 'resubmit')),
  lead_decision text CHECK (lead_decision IN ('approved', 'approved_with_warnings', 'resubmit')),
  lead_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS timeline_project_idx ON timeline_plans(project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  original_name text,
  mime_type text,
  file_size integer NOT NULL DEFAULT 0 CHECK (file_size >= 0 AND file_size <= 10485760),
  file_data bytea,
  pasted_text text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'reviewing', 'ready', 'sent', 'send_failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS proposals_project_idx ON proposals(project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL UNIQUE REFERENCES proposals(id) ON DELETE CASCADE,
  criteria jsonb NOT NULL,
  total integer NOT NULL DEFAULT 0 CHECK (total >= 0 AND total <= 38),
  calculated_decision text NOT NULL CHECK (calculated_decision IN ('approved', 'approved_with_changes', 'resubmit')),
  lead_decision text CHECK (lead_decision IN ('approved', 'approved_with_changes', 'resubmit')),
  lead_reason text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'sending', 'sent', 'send_failed')),
  reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deduplication_key text NOT NULL UNIQUE,
  recipient text NOT NULL,
  subject text NOT NULL,
  text_body text NOT NULL,
  html_body text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS email_outbox_pending_idx ON email_outbox(status, next_attempt_at);

CREATE TABLE IF NOT EXISTS audit_logs (
  id bigserial PRIMARY KEY,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_project_idx ON audit_logs(project_id, created_at DESC);
