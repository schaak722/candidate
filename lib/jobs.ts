import { db } from "@/lib/db";

export type JobListItem = {
  id: string;
  company_id: string;
  company_name: string;
  company_ref_id: string;
  ref_id: string | null;
  title: string;
  status: "open" | "closed" | "draft";
  created_at: string;
  updated_at: string;
};

export type JobDetail = {
  id: string;
  company_id: string;
  ref_id: string | null;
  title: string;
  status: "open" | "closed" | "draft";
  location: string | null;
  basis: string | null;
  seniority: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
};

async function recomputeCompanyOpenJobs(
  client: { query: (sql: string, values?: any[]) => Promise<any> },
  companyId: string
) {
  await client.query(
    `
    UPDATE companies
    SET total_jobs = (
      SELECT COUNT(*)::int FROM jobs
      WHERE company_id = $1 AND status = 'open'
    )
    WHERE id = $1
    `,
    [companyId]
  );
}

export async function listJobs(params: {
  search?: string;
  status?: "all" | "open" | "closed" | "draft";
  companyId?: string;
}) {
  const pool = db();

  const search = (params.search ?? "").trim();
  const status = params.status ?? "all";
  const companyId = (params.companyId ?? "").trim();

  const where: string[] = [];
  const values: any[] = [];

  if (companyId) {
    values.push(companyId);
    where.push(`j.company_id = $${values.length}`);
  }

  if (status !== "all") {
    values.push(status);
    where.push(`j.status = $${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);
    where.push(
      `(j.title ILIKE $${values.length} OR COALESCE(j.ref_id,'') ILIKE $${values.length} OR c.name ILIKE $${values.length})`
    );
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const sql = `
    SELECT
      j.id,
      j.company_id,
      c.name AS company_name,
      c.ref_id AS company_ref_id,
      j.ref_id,
      j.title,
      j.status,
      j.created_at,
      j.updated_at
    FROM jobs j
    JOIN companies c ON c.id = j.company_id
    ${whereSql}
    ORDER BY j.created_at DESC
    LIMIT 500;
  `;

  const res = await pool.query(sql, values);
  return res.rows as JobListItem[];
}

export async function getJob(id: string) {
  const pool = db();
  const res = await pool.query(
    `
    SELECT
      id,
      company_id,
      ref_id,
      title,
      status,
      location,
      basis,
      seniority,
      description,
      created_at,
      updated_at
    FROM jobs
    WHERE id = $1
    `,
    [id]
  );

  if (res.rowCount === 0) return null;
  return res.rows[0] as JobDetail;
}

export async function createJob(args: {
  companyId: string;
  refId?: string | null;
  title: string;
  status: "open" | "closed" | "draft";
  location?: string | null;
  basis?: string | null;
  seniority?: string | null;
  description?: string | null;
}) {
  const pool = db();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const ins = await client.query(
      `
      INSERT INTO jobs (company_id, ref_id, title, status, location, basis, seniority, description)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING id;
      `,
      [
        args.companyId,
        args.refId ?? null,
        args.title,
        args.status,
        args.location ?? null,
        args.basis ?? null,
        args.seniority ?? null,
        args.description ?? null,
      ]
    );

    await recomputeCompanyOpenJobs(client, args.companyId);

    await client.query("COMMIT");
    return ins.rows[0].id as string;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function updateJob(
  id: string,
  args: {
    companyId: string;
    refId?: string | null;
    title: string;
    status: "open" | "closed" | "draft";
    location?: string | null;
    basis?: string | null;
    seniority?: string | null;
    description?: string | null;
  }
) {
  const pool = db();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const prev = await client.query(`SELECT company_id FROM jobs WHERE id = $1`, [id]);
    if (prev.rowCount === 0) {
      await client.query("ROLLBACK");
      return { notFound: true as const };
    }
    const prevCompanyId = prev.rows[0].company_id as string;

    await client.query(
      `
      UPDATE jobs
      SET company_id = $1,
          ref_id = $2,
          title = $3,
          status = $4,
          location = $5,
          basis = $6,
          seniority = $7,
          description = $8
      WHERE id = $9
      `,
      [
        args.companyId,
        args.refId ?? null,
        args.title,
        args.status,
        args.location ?? null,
        args.basis ?? null,
        args.seniority ?? null,
        args.description ?? null,
        id,
      ]
    );

    // Recompute counts for both old and new companies (in case company changed)
    await recomputeCompanyOpenJobs(client, prevCompanyId);
    if (args.companyId !== prevCompanyId) {
      await recomputeCompanyOpenJobs(client, args.companyId);
    }

    await client.query("COMMIT");
    return { notFound: false as const };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function deleteJob(id: string) {
  const pool = db();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const prev = await client.query(`SELECT company_id FROM jobs WHERE id = $1`, [id]);
    if (prev.rowCount === 0) {
      await client.query("ROLLBACK");
      return { notFound: true as const };
    }
    const companyId = prev.rows[0].company_id as string;

    await client.query(`DELETE FROM jobs WHERE id = $1`, [id]);
    await recomputeCompanyOpenJobs(client, companyId);

    await client.query("COMMIT");
    return { notFound: false as const };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
