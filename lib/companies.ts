import { db } from "@/lib/db";

export type CompanyListItem = {
  id: string;
  ref_id: string;
  name: string;
  is_active: boolean;
  total_jobs: number;
  has_logo: boolean;
};

export type CompanyDetail = {
  id: string;
  ref_id: string;
  name: string;
  description: string | null;
  industry: string | null;
  website: string | null;
  is_active: boolean;
  total_jobs: number;
  logo_mime: string | null;
  has_logo: boolean;
  contact: {
    first_name: string;
    last_name: string;
    email: string;
    role: string | null;
    phone: string | null;
  } | null;
};

export async function listCompanies(params: { search?: string; status?: "all" | "active" | "inactive" }) {
  const pool = db();

  const search = (params.search ?? "").trim();
  const status = params.status ?? "all";

  const where: string[] = [];
  const values: any[] = [];

  if (search) {
    values.push(`%${search}%`);
    where.push(`(c.name ILIKE $${values.length} OR c.ref_id ILIKE $${values.length})`);
  }

  if (status === "active") where.push(`c.is_active = true`);
  if (status === "inactive") where.push(`c.is_active = false`);

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const sql = `
    SELECT
      c.id,
      c.ref_id,
      c.name,
      c.is_active,
      c.total_jobs,
      (c.logo_bytes IS NOT NULL) AS has_logo
    FROM companies c
    ${whereSql}
    ORDER BY c.name ASC
    LIMIT 200;
  `;

  const res = await pool.query(sql, values);
  return res.rows as CompanyListItem[];
}

export async function getCompany(id: string) {
  const pool = db();
  const res = await pool.query(
    `
    SELECT
      c.id,
      c.ref_id,
      c.name,
      c.description,
      c.industry,
      c.website,
      c.is_active,
      c.total_jobs,
      c.logo_mime,
      (c.logo_bytes IS NOT NULL) AS has_logo,
      cc.first_name,
      cc.last_name,
      cc.email,
      cc.role AS contact_role,
      cc.phone AS contact_phone
    FROM companies c
    LEFT JOIN LATERAL (
      SELECT * FROM company_contacts
      WHERE company_id = c.id AND is_primary = true
      ORDER BY created_at ASC
      LIMIT 1
    ) cc ON true
    WHERE c.id = $1
    `,
    [id]
  );

  if (res.rowCount === 0) return null;

  const r = res.rows[0];
  const detail: CompanyDetail = {
    id: r.id,
    ref_id: r.ref_id,
    name: r.name,
    description: r.description,
    industry: r.industry,
    website: r.website,
    is_active: r.is_active,
    total_jobs: r.total_jobs,
    logo_mime: r.logo_mime,
    has_logo: r.has_logo,
    contact: r.email
      ? {
          first_name: r.first_name,
          last_name: r.last_name,
          email: r.email,
          role: r.contact_role,
          phone: r.contact_phone,
        }
      : null,
  };

  return detail;
}

export async function createCompany(args: {
  refId: string;
  name: string;
  description?: string | null;
  industry?: string | null;
  website?: string | null;
  isActive?: boolean;
  logoMime?: string | null;
  logoBytes?: Buffer | null;

  contactFirstName: string;
  contactLastName: string;
  contactEmail: string;
  contactRole?: string | null;
  contactPhone?: string | null;
}) {
  const pool = db();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const c = await client.query(
      `
      INSERT INTO companies (ref_id, name, description, industry, website, is_active, logo_mime, logo_bytes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING id;
      `,
      [
        args.refId,
        args.name,
        args.description ?? null,
        args.industry ?? null,
        args.website ?? null,
        args.isActive ?? true,
        args.logoMime ?? null,
        args.logoBytes ?? null,
      ]
    );

    const companyId = c.rows[0].id as string;

    await client.query(
      `
      INSERT INTO company_contacts (company_id, first_name, last_name, email, role, phone, is_primary)
      VALUES ($1,$2,$3,$4,$5,$6,true);
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
  companyId: string,
  args: {
    refId: string;
    name: string;
    description?: string | null;
    industry?: string | null;
    website?: string | null;
    isActive?: boolean;

    // if provided (not undefined), update logo; if undefined, keep existing
    logoMime?: string | undefined;
    logoBytes?: Buffer | undefined;

    contactFirstName: string;
    contactLastName: string;
    contactEmail: string;
    contactRole?: string | null;
    contactPhone?: string | null;
  }
) {
  const pool = db();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const sets: string[] = [];
    const values: any[] = [];

    const pushSet = (sqlFrag: string, val: any) => {
      values.push(val);
      sets.push(`${sqlFrag} $${values.length}`);
    };

    pushSet("ref_id =", args.refId);
    pushSet("name =", args.name);
    pushSet("description =", args.description ?? null);
    pushSet("industry =", args.industry ?? null);
    pushSet("website =", args.website ?? null);
    pushSet("is_active =", args.isActive ?? true);

    // Only update logo if a new file was uploaded
    if (typeof args.logoBytes !== "undefined") {
      values.push(args.logoMime ?? "image/png");
      sets.push(`logo_mime = $${values.length}`);
      values.push(args.logoBytes);
      sets.push(`logo_bytes = $${values.length}`);
    }

    values.push(companyId);

    await client.query(
      `
      UPDATE companies
      SET ${sets.join(", ")}
      WHERE id = $${values.length}
      `,
      values
    );

    // Update primary contact (or create if missing)
    const existing = await client.query(
      `SELECT id FROM company_contacts WHERE company_id = $1 AND is_primary = true LIMIT 1`,
      [companyId]
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
        INSERT INTO company_contacts (company_id, first_name, last_name, email, role, phone, is_primary)
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
    }

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function getCompanyLogo(id: string) {
  const pool = db();
  const res = await pool.query(
    `SELECT logo_mime, logo_bytes FROM companies WHERE id = $1`,
    [id]
  );
  if (res.rowCount === 0) return null;
  const r = res.rows[0];
  if (!r.logo_bytes) return null;
  return { mime: (r.logo_mime as string) || "image/png", bytes: r.logo_bytes as Buffer };
}
