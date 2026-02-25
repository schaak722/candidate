import { NextResponse } from "next/server";
import { CreateJobSchema, JobStatus } from "@/lib/validation";
import { createJob, listJobs } from "@/lib/jobs";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const statusRaw = (searchParams.get("status") ?? "all") as any;
  const companyId = searchParams.get("companyId") ?? "";

  const statusParsed = JobStatus.safeParse(statusRaw);
  const status = statusParsed.success ? statusParsed.data : "all";

  const rows = await listJobs({ search, status, companyId });
  return NextResponse.json({ jobs: rows });
}

export async function POST(req: Request) {
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
    const id = await createJob({
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

    return NextResponse.json({ id }, { status: 201 });
  } catch (e: any) {
    if (e?.code === "23505") {
      return NextResponse.json(
        { error: "Job Ref ID already exists for this company" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Create failed", detail: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
