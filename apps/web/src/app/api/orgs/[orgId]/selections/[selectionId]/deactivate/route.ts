import { NextResponse } from "next/server";
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

  const res = await fetchFromApi(
    `/orgs/${orgId}/selections/${selectionId}/deactivate`,
    {
      method: "POST",
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
      }
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return NextResponse.json(
      { error: "Failed to deactivate", details: err.details || err.error || "Unknown error" },
      { status: res.status }
    );
  }

  return NextResponse.redirect(new URL(backTo, req.url));
}
