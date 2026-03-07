import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

export async function POST(
  req: Request,
  context: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await context.params;
  const formData = await req.formData();
  const serviceId = formData.get("serviceId");
  const packageId = formData.get("packageId");

  try {
    const { token: accessToken } = await auth0.getAccessToken();

    const res = await fetch(`${apiBase}/orgs/${orgId}/selections`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
      },
      body: JSON.stringify({ serviceId, packageId })
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to select package" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Auth required" }, { status: 401 });
  }

  return NextResponse.redirect(new URL(`/orgs/${orgId}`, req.url));
}
