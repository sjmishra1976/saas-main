import { NextResponse } from "next/server";
import { toAppUrl } from "@/lib/appUrl";
import { auth0 } from "@/lib/auth0";
import { fetchFromApi } from "@/lib/apiBase";

export async function POST(
  req: Request,
  context: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await context.params;
  const formData = await req.formData();
  const serviceId = formData.get("serviceId");
  const packageId = formData.get("packageId");
  const instances = formData.get("instances");
  const capacityOption = formData.get("capacityOption");

  const { token: accessToken } = await auth0.getAccessToken();

  const res = await fetchFromApi(`/orgs/${orgId}/enroll`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
    },
    body: JSON.stringify({
      serviceId,
      packageId,
      instances: Number(instances || 1),
      capacityOption: capacityOption || "standard"
    })
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to enroll" }, { status: 400 });
  }

  return NextResponse.redirect(toAppUrl(`/orgs/${orgId}`, req));
}
