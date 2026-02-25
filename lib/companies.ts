import { db } from "@/lib/db";

export type CompanyListItem = {
  id: string;
  ref_id: string;
  name: string;
  description: string | null;
  industry: string | null;
  website: string | null;
  total_jobs: number;
  is_active: boolean;
};

export type CompanyDetail = CompanyListItem & {
  contact_first_name: string | null;
  contact_last_name: string | null;
  contact_email: string | null;
  contact_role: string | null;
  contact_phone: string | null;
};

export async function listCompanies(params: {
  search?: string;
  status?: "all" | "active" | "inactive";
}) {
  const pool = db();

  const search = (params.search ?? "").trim();
  const status = params.status ?? "all";

  const where: string[] = [];
  const values: any[] = [];

  if (status === "active") {
    where.push(`c.total_jobs > 0`);
  } else if (status === "inactive") {
    where.push(`c.total_jobs = 0`);
  }

  if (search) {
    values.push(`%${search}%`);
    where.push(`(c.name ILIKE $${values.length} OR c.ref_id ILIKE $${values.length})`);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const res = await pool.query(
    `
    SELECT
      c.id, c.ref_id, c.name, c.description, c.industry, c.website,
      c.total_jobs, c.is_active
    FROM companies c
    ${whereSql}
    ORDER BY c.created_at DESC
    LIMIT 500
    `,
    values
  );

  return res.rows as CompanyListItem[];
}

export async function getCompany(id: string) {
  const pool = db();
  const res = await pool.query(
    `
    SELECT
      c.id, c.ref_id, c.name, c.description, c.industry, c.website,
      c.total_jobs, c.is_active,
      cc.first_name AS contact_first_name,
      cc.last_name AS contact_last_name,
      cc.email AS contact_email,
      cc.role AS contact_role,
      cc.phone AS contact_phone
    FROM companies c
    LEFT JOIN company_contacts cc
      ON cc.company_id = c.id AND cc.is_primary = true
    WHERE c.id = $1
    `,
    [id]
  );

  if (res.rowCount === 0) return null;
  return res.rows[0] as CompanyDetail;
}

export async function getCompanyLogo(id: string) {
  const pool = db();
  const res = await pool.query(
    `SELECT logo_mime, logo_bytes FROM companies WHERE id = $1`,
    [id]
  );
  if (res.rowCount === 0) return null;
  return res.rows[0] as { logo_mime: string | null; logo_bytes: Buffer | null };
}

export async function createCompany(args: {
  refId: string;
  name: string;
  description?: string;
  industry?: string;
  website?: string;

  contactFirstName: string;
  contactLastName: string;
  contactEmail: string;
  contactRole?: string;
  contactPhone?: string;

  logoBytes?: Buffer;
  logoMime?: string;
}) {
  const pool = db();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const ins = await client.query(
      `
      INSERT INTO companies (
        ref_id, name, description, industry, website,
        is_active, total_jobs,
        logo_mime, logo_bytes
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING id
      `,
      [
        args.refId,
        args.name,
        args.description ?? null,
        args.industry ?? null,
        args.website ?? null,
        false, // starts inactive until it has open jobs
        0,
        args.logoMime ?? null,
        args.logoBytes ?? null,
      ]
    );

    const companyId = ins.rows[0].id as string;

    await client.query(
      `
      INSERT INTO company_contacts (
        company_id, first_name, last_name, email, role, phone, is_primary
      )
      VALUES ($1,$2,$3,$4,$5,$6,true)
      `,
      [
        companyId,
        args.contactFirstName,
        args.contactLastName,
        args.contactEmail,
        args.contactRole ?? null,
        args.contactPhone ?? null,
      ]
    );

    await client.query("COMMIT");
    return companyId;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function updateCompany(
  id: string,
  args: {
    refId: string;
    name: string;
    description?: string;
    industry?: string;
    website?: string;

    contactFirstName: string;
    contactLastName: string;
    contactEmail: string;
    contactRole?: string;
    contactPhone?: string;

    // Optional: if undefined => keep existing logo
    logoBytes?: Buffer;
    logoMime?: string;
  }
) {
  const pool = db();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const sets: string[] = [
      `ref_id = $1`,
      `name = $2`,
      `description = $3`,
      `industry = $4`,
      `website = $5`,
    ];

    const values: any[] = [
      args.refId,
      args.name,
      args.description ?? null,
      args.industry ?? null,
      args.website ?? null,
    ];

    // Only update logo if a new one is provided
    if (args.logoBytes && args.logoMime) {
      values.push(args.logoMime, args.logoBytes);
      sets.push(`logo_mime = $${values.length - 1}`);
      sets.push(`logo_bytes = $${values.length}`);
    }

    values.push(id);

    await client.query(
      `
      UPDATE companies
      SET ${sets.join(", ")}
      WHERE id = $${values.length}
      `,
      values
    );

    // Upsert primary contact
    const existing = await client.query(
      `SELECT id FROM company_contacts WHERE company_id = $1 AND is_primary = true`,
      [id]
    );

    if (existing.rowCount > 0) {
      const contactId = existing.rows[0].id as string;
      await client.query(
        `
        UPDATE company_contacts
        SET first_name = $1,
            last_name = $2,
            email = $3,
            role = $4,
            phone = $5
        WHERE id = $6
        `,
        [
          args.contactFirstName,
          args.contactLastName,
          args.contactEmail,
          args.contactRole ?? null,
          args.contactPhone ?? null,
          contactId,
        ]
      );
    } else {
      await client.query(
        `
        INSERT INTO company_contacts (
          company_id, first_name, last_name, email, role, phone, is_primary
        )
        VALUES ($1,$2,$3,$4,$5,$6,true)
        `,
        [
          id,
          args.contactFirstName,
          args.contactLastName,
          args.contactEmail,
          args.contactRole ?? null,
          args.contactPhone ?? null,
        ]
      );
    }

    await client.query("COMMIT");
    return true;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
