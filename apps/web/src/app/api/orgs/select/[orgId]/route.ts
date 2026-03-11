import { NextResponse } from "next/server";
import { toAppUrl } from "@/lib/appUrl";

function withSelectedOrgCookie(res: NextResponse, orgId: string) {
  res.cookies.set("selected_org_id", orgId, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30
  });
  return res;
}

export async function GET(
  req: Request,
  context: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await context.params;
  const nextUrl = new URL(req.url).searchParams.get("next") || `/orgs/${orgId}`;

  const safeNext = nextUrl.startsWith("/") ? nextUrl : `/orgs/${orgId}`;
  const res = NextResponse.redirect(toAppUrl(safeNext, req));
  return withSelectedOrgCookie(res, orgId);
}

export async function POST(
  _req: Request,
  context: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await context.params;
  const res = NextResponse.json({ ok: true, orgId });
  return withSelectedOrgCookie(res, orgId);
}
