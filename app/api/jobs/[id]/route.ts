import { NextResponse } from "next/server";
import { CreateJobSchema } from "@/lib/validation";
import { deleteJob, getJob, updateJob } from "@/lib/jobs";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const job = await getJob(id);
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ job });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const parsed = CreateJobSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const res = await updateJob(id, {
      companyId: parsed.data.companyId,
      refId: parsed.data.refId?.trim() ? parsed.data.refId.trim() : null,
      title: parsed.data.title,
      status: parsed.data.status,
      location: parsed.data.location?.trim() ? parsed.data.location.trim() : null,
      basis: parsed.data.basis?.trim() ? parsed.data.basis.trim() : null,
      seniority: parsed.data.seniority?.trim() ? parsed.data.seniority.trim() : null,
      description: parsed.data.description?.trim()
        ? parsed.data.description.trim()
        : null,
    });

    if (res.notFound) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.code === "23505") {
      return NextResponse.json(
        { error: "Job Ref ID already exists for this company" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Update failed", detail: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const res = await deleteJob(id);
    if (res.notFound) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Delete failed", detail: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
