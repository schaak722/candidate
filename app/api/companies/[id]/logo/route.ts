import { NextResponse } from "next/server";
import { getCompanyLogo } from "@/lib/companies";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const logo = await getCompanyLogo(id);
  if (!logo || !logo.logo_bytes) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(logo.logo_bytes, {
    status: 200,
    headers: {
      "Content-Type": logo.logo_mime || "application/octet-stream",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
