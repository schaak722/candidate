import { NextResponse } from "next/server";
import { CreateCompanySchema } from "@/lib/validation";
import { getCompany, updateCompany } from "@/lib/companies";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const company = await getCompany(id);
  if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ company });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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

  // Optional logo update
  const logo = fd.get("logo");
  let logoBytes: Buffer | undefined;
  let logoMime: string | undefined;

  if (logo instanceof File && logo.size > 0) {
    const ab = await logo.arrayBuffer();
    logoBytes = Buffer.from(ab);
    logoMime = logo.type || "application/octet-stream";
  }

  try {
    // IMPORTANT: isActive is no longer set here (derived from open jobs count)
    await updateCompany(id, {
      ...parsed.data,
      logoBytes,
      logoMime,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Update failed", detail: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
