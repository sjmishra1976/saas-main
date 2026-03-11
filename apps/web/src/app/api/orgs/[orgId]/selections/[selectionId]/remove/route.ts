import { NextResponse } from "next/server";
import { toAppUrl } from "@/lib/appUrl";
import { auth0 } from "@/lib/auth0";
import { fetchFromApi } from "@/lib/apiBase";

export async function POST(
  req: Request,
  context: { params: Promise<{ orgId: string; selectionId: string }> }
) {
  const { orgId, selectionId } = await context.params;
  const { token: accessToken } = await auth0.getAccessToken();
  const url = new URL(req.url);
  const backTo = url.searchParams.get("next") || `/orgs/${orgId}`;

  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};

  const deactRes = await fetchFromApi(
    `/orgs/${orgId}/selections/${selectionId}/deactivate`,
    { method: "POST", headers }
  );

  if (!deactRes.ok && deactRes.status !== 404) {
    const err = await deactRes.json().catch(() => ({}));
    return NextResponse.json(
      { error: "Failed to stop service", details: err.details || err.error || "Unknown error" },
      { status: deactRes.status }
    );
  }

  const delRes = await fetchFromApi(`/orgs/${orgId}/selections/${selectionId}`, {
    method: "DELETE",
    headers
  });

  if (!delRes.ok) {
    const err = await delRes.json().catch(() => ({}));
    return NextResponse.json(
      { error: "Failed to remove selection", details: err.details || err.error || "Unknown error" },
      { status: delRes.status }
    );
  }

  const safeBackTo = backTo.startsWith("/") ? backTo : `/orgs/${orgId}`;
  return NextResponse.redirect(toAppUrl(safeBackTo, req), { status: 303 });
}

export async function GET(
  req: Request,
  context: { params: Promise<{ orgId: string; selectionId: string }> }
) {
  const { orgId } = await context.params;
  const url = new URL(req.url);
  const backTo = url.searchParams.get("next") || `/orgs/${orgId}`;
  const safeBackTo = backTo.startsWith("/") ? backTo : `/orgs/${orgId}`;
  return NextResponse.redirect(toAppUrl(safeBackTo, req), { status: 303 });
}
