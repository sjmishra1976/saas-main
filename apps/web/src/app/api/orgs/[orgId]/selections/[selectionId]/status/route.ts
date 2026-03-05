import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { fetchFromApi } from "@/lib/apiBase";

export async function POST(
  req: Request,
  context: { params: Promise<{ orgId: string; selectionId: string }> }
) {
  const { orgId, selectionId } = await context.params;
  const formData = await req.formData();
  const status = formData.get("status");

  const { token: accessToken } = await auth0.getAccessToken();

  const res = await fetchFromApi(
    `/orgs/${orgId}/selections/${selectionId}/status`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
      },
      body: JSON.stringify({ status })
    }
  );

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to update status" }, { status: 400 });
  }

  return NextResponse.redirect(new URL(`/orgs/${orgId}`, req.url));
}
