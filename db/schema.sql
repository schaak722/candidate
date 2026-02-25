-- db/schema.sql
-- Phase 2 delta updates (safe to run in Supabase SQL editor)

-- Ensure companies is_active defaults to false (optional but recommended)
ALTER TABLE companies
  ALTER COLUMN is_active SET DEFAULT false;

-- Make existing rows consistent (recommended)
UPDATE companies
SET is_active = (total_jobs > 0);

-- Jobs enhancements
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS closing_date date NULL;

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS seniority text NULL;

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS salary_bands text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS categories text[] NOT NULL DEFAULT '{}'::text[];

-- Default new jobs to Draft
ALTER TABLE jobs
  ALTER COLUMN status SET DEFAULT 'draft';

CREATE INDEX IF NOT EXISTS idx_jobs_closing_date ON jobs(closing_date);

-- Update sync trigger to also set companies.is_active based on open jobs
CREATE OR REPLACE FUNCTION sync_company_total_jobs()
RETURNS trigger AS $$
DECLARE
  new_company uuid;
  old_company uuid;
  cnt int;
BEGIN
  IF TG_OP = 'INSERT' THEN
    new_company := NEW.company_id;
    SELECT COUNT(*)::int INTO cnt FROM jobs WHERE company_id = new_company AND status = 'open';
    UPDATE companies
      SET total_jobs = cnt,
          is_active = (cnt > 0)
    WHERE id = new_company;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    new_company := NEW.company_id;
    old_company := OLD.company_id;

    SELECT COUNT(*)::int INTO cnt FROM jobs WHERE company_id = new_company AND status = 'open';
    UPDATE companies
      SET total_jobs = cnt,
          is_active = (cnt > 0)
    WHERE id = new_company;

    IF old_company IS DISTINCT FROM new_company THEN
      SELECT COUNT(*)::int INTO cnt FROM jobs WHERE company_id = old_company AND status = 'open';
      UPDATE companies
        SET total_jobs = cnt,
            is_active = (cnt > 0)
      WHERE id = old_company;
    END IF;

    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    old_company := OLD.company_id;
    SELECT COUNT(*)::int INTO cnt FROM jobs WHERE company_id = old_company AND status = 'open';
    UPDATE companies
      SET total_jobs = cnt,
          is_active = (cnt > 0)
    WHERE id = old_company;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
