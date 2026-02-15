import { NextResponse } from "next/server";
import { getCompanyLogo } from "@/lib/companies";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const { id } = ctx.params;
  const logo = await getCompanyLogo(id);

  if (!logo) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(logo.bytes, {
    status: 200,
    headers: {
      "Content-Type": logo.mime,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
