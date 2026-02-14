# Company Profiles Admin

Shopify-admin-inspired internal UI for holding **company profiles** in a Postgres DB, with:

- Left sidebar (logo + "Companies")
- Companies list page:
  - Search bar
  - Status dropdown (All / Active / Inactive)
  - **+ New Company** button
  - Table columns: Ref ID, Company Name, Logo (30×30), Total Jobs
- New company form:
  - Ref ID, Company Name, Mini logo (70×70), Description, Industry, Website
  - Primary contact: First/Last Name, Email, Role, Contact Number

## Tech

- Next.js (App Router) + Tailwind
- Postgres (Neon or Supabase)
- Logos stored in DB (bytea)

---

## 1) Database setup (Neon or Supabase)

Open your DB SQL editor and run:

- `db/schema.sql`

This creates:
- `companies`
- `company_contacts`

> **Note:** `schema.sql` enables `pgcrypto` + `pg_trgm`. Both exist on Neon and Supabase by default.

---

## 2) Configure environment variable

Set this environment variable in Koyeb (and locally if needed):

- `DATABASE_URL` = your Postgres connection string

Neon URLs typically look like:
`postgresql://USER:PASSWORD@HOST/DB?sslmode=require`

---

## 3) Run locally (optional)

```bash
npm i
npm run dev
```

---

## 4) Deploy on Koyeb

- Build command: `npm run build`
- Start command: `npm start`
- Set env var: `DATABASE_URL`

---

## 5) Add your sidebar logo

Replace this file:

- `public/brand-logo.png`

(You can drop your provided logo in there. Any PNG/JPG works.)

---

## Notes / Next steps

- `total_jobs` is currently a stored integer. Later, when you introduce Jobs, we can compute it from a `jobs` table or via a view.
- No authentication is included yet (as requested). We can add invite-only auth later (Supabase Auth, or custom).
