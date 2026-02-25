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

-- -----------------------------
-- Phase 2: Jobs
-- -----------------------------

CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  ref_id text NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','draft')),
  location text NULL,
  basis text NULL,
  seniority text NULL,
  description text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_title_trgm ON jobs USING gin (title gin_trgm_ops);

-- Optional: enforce unique job ref per company when ref_id is provided
CREATE UNIQUE INDEX IF NOT EXISTS uq_jobs_company_ref
ON jobs(company_id, ref_id)
WHERE ref_id IS NOT NULL AND ref_id <> '';

DROP TRIGGER IF EXISTS trg_jobs_updated_at ON jobs;
CREATE TRIGGER trg_jobs_updated_at
BEFORE UPDATE ON jobs
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- Keep companies.total_jobs aligned with OPEN jobs count
CREATE OR REPLACE FUNCTION sync_company_total_jobs()
RETURNS trigger AS $$
DECLARE
  new_company uuid;
  old_company uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    new_company := NEW.company_id;
    UPDATE companies
      SET total_jobs = (SELECT COUNT(*)::int FROM jobs WHERE company_id = new_company AND status = 'open')
    WHERE id = new_company;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    new_company := NEW.company_id;
    old_company := OLD.company_id;
    UPDATE companies
      SET total_jobs = (SELECT COUNT(*)::int FROM jobs WHERE company_id = new_company AND status = 'open')
    WHERE id = new_company;
    IF old_company IS DISTINCT FROM new_company THEN
      UPDATE companies
        SET total_jobs = (SELECT COUNT(*)::int FROM jobs WHERE company_id = old_company AND status = 'open')
      WHERE id = old_company;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    old_company := OLD.company_id;
    UPDATE companies
      SET total_jobs = (SELECT COUNT(*)::int FROM jobs WHERE company_id = old_company AND status = 'open')
    WHERE id = old_company;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_jobs_sync_company_total ON jobs;
CREATE TRIGGER trg_jobs_sync_company_total
AFTER INSERT OR UPDATE OR DELETE ON jobs
FOR EACH ROW
EXECUTE FUNCTION sync_company_total_jobs();
