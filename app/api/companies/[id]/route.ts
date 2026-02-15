import { NextResponse } from "next/server";
import { CreateCompanySchema } from "@/lib/validation";
import { getCompany, updateCompany } from "@/lib/companies";

export const runtime = "nodejs";

function parseBool(v: FormDataEntryValue | null): boolean | undefined {
  if (typeof v !== "string") return undefined;
  if (v === "true") return true;
  if (v === "false") return false;
  return undefined;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const company = await getCompany(id);
  if (!company) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ company });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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
  let logoBytes: Buffer | undefined = undefined;
  let logoMime: string | undefined = undefined;

  // If a logo file is present, update it. If not present, keep existing.
  if (file && typeof file !== "string") {
    const f = file as unknown as Blob;
    const anyF = file as any;
    const size = typeof anyF.size === "number" ? anyF.size : 0;

    if (size > 0) {
      const ab = await f.arrayBuffer();
      logoBytes = Buffer.from(ab);
      logoMime = typeof anyF.type === "string" && anyF.type ? anyF.type : "image/png";
    }
  }

  try {
    await updateCompany(id, {
      ...parsed.data,
      isActive: parsed.data.isActive ?? true,
      logoBytes,
      logoMime,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.code === "23505") {
      return NextResponse.json({ error: "Ref ID already exists" }, { status: 409 });
    }
    return NextResponse.json(
      { error: "Update failed", detail: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
