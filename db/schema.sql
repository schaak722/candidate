-- Company Profiles Admin - schema
-- Run this once in Neon/Supabase SQL editor.
-- Safe to re-run: IF NOT EXISTS guards are included where possible.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NULL,
  industry text NULL,
  website text NULL,
  is_active boolean NOT NULL DEFAULT true,
  -- store logo in DB as bytes
  logo_mime text NULL,
  logo_bytes bytea NULL,
  total_jobs integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_companies_name_trgm ON companies USING gin (name gin_trgm_ops);
-- if pg_trgm not available, comment above and enable extension below:
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS company_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  role text NULL,
  phone text NULL,
  is_primary boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure only one primary contact per company
CREATE UNIQUE INDEX IF NOT EXISTS uq_company_primary_contact
ON company_contacts(company_id)
WHERE is_primary = true;

-- updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_companies_updated_at ON companies;
CREATE TRIGGER trg_companies_updated_at
BEFORE UPDATE ON companies
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
