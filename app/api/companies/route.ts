import { NextResponse } from "next/server";
import { CreateCompanySchema, CompanyStatus } from "@/lib/validation";
import { createCompany, listCompanies } from "@/lib/companies";

export const runtime = "nodejs";

function parseBool(v: FormDataEntryValue | null): boolean | undefined {
  if (typeof v !== "string") return undefined;
  if (v === "true") return true;
  if (v === "false") return false;
  return undefined;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const statusRaw = (searchParams.get("status") ?? "all") as any;

  const statusParsed = CompanyStatus.safeParse(statusRaw);
  const status = statusParsed.success ? statusParsed.data : "all";

  const rows = await listCompanies({ search, status });

  return NextResponse.json({ companies: rows });
}

export async function POST(req: Request) {
  const fd = await req.formData();

  const payload = {
    refId: String(fd.get("refId") ?? ""),
    name: String(fd.get("name") ?? ""),
    description: String(fd.get("description") ?? ""),
    industry: String(fd.get("industry") ?? ""),
    website: String(fd.get("website") ?? ""),
    isActive: parseBool(fd.get("isActive")),

    contactFirstName: String(fd.get("contactFirstName") ?? ""),
    contactLastName: String(fd.get("contactLastName") ?? ""),
    contactEmail: String(fd.get("contactEmail") ?? ""),
    contactRole: String(fd.get("contactRole") ?? ""),
    contactPhone: String(fd.get("contactPhone") ?? ""),
  };

  const parsed = CreateCompanySchema.safeParse({
    ...payload,
    isActive: payload.isActive ?? true,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const file = fd.get("logo");
  let logoBytes: Buffer | null = null;
  let logoMime: string | null = null;

  if (file && typeof file !== "string") {
    const f = file as unknown as Blob; // FormData file is Blob-compatible in Next.js node runtime
    const anyF = file as any;
  
    const size = typeof anyF.size === "number" ? anyF.size : 0;
    if (size > 0) {
      const ab = await f.arrayBuffer();
      logoBytes = Buffer.from(ab);
      logoMime = typeof anyF.type === "string" && anyF.type ? anyF.type : "image/png";
    }
  }

  try {
    const id = await createCompany({
      ...parsed.data,
      isActive: parsed.data.isActive ?? true,
      logoBytes,
      logoMime,
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    // Handle unique ref_id violation (Postgres code 23505)
    if (e?.code === "23505") {
      return NextResponse.json({ error: "Ref ID already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Create failed", detail: msg }, { status: 500 });
  }
}
