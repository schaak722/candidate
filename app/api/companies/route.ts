import { NextResponse } from "next/server";
import { CreateCompanySchema, CompanyStatus } from "@/lib/validation";
import { createCompany, listCompanies } from "@/lib/companies";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const statusRaw = (searchParams.get("status") ?? "all") as any;

  const statusParsed = CompanyStatus.safeParse(statusRaw);
  const status = statusParsed.success ? statusParsed.data : "all";

  const companies = await listCompanies({ search, status });
  return NextResponse.json({ companies });
}

export async function POST(req: Request) {
  const fd = await req.formData();

  const payload = {
    refId: String(fd.get("refId") ?? "").trim(),
    name: String(fd.get("name") ?? "").trim(),
    description: String(fd.get("description") ?? "").trim(),
    industry: String(fd.get("industry") ?? "").trim(),
    website: String(fd.get("website") ?? "").trim(),

    contactFirstName: String(fd.get("contactFirstName") ?? "").trim(),
    contactLastName: String(fd.get("contactLastName") ?? "").trim(),
    contactEmail: String(fd.get("contactEmail") ?? "").trim(),
    contactRole: String(fd.get("contactRole") ?? "").trim(),
    contactPhone: String(fd.get("contactPhone") ?? "").trim(),
  };

  const parsed = CreateCompanySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const logo = fd.get("logo");
  let logoBytes: Buffer | undefined;
  let logoMime: string | undefined;

  if (logo instanceof File && logo.size > 0) {
    const ab = await logo.arrayBuffer();
    logoBytes = Buffer.from(ab);
    logoMime = logo.type || "application/octet-stream";
  }

  try {
    const id = await createCompany({
      ...parsed.data,
      logoBytes,
      logoMime,
      // Active/Inactive is derived later from open jobs (starts inactive = no jobs)
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (e: any) {
    if (e?.code === "23505") {
      return NextResponse.json({ error: "Company Ref ID already exists" }, { status: 409 });
    }
    return NextResponse.json(
      { error: "Create failed", detail: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
