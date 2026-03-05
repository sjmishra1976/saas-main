import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { fetchFromApi } from "@/lib/apiBase";
import { deriveOwnerPrefix } from "@/lib/ownerPrefix";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const session = await auth0.getSession();
  const ownerPrefix =
    typeof body.ownerPrefix === "string" && body.ownerPrefix.trim()
      ? body.ownerPrefix
      : deriveOwnerPrefix(session?.user);
  const { token: accessToken } = await auth0.getAccessToken();

  const res = await fetchFromApi("/orgs/default", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
    },
    body: JSON.stringify({ ...body, ownerPrefix })
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to create default org" }, { status: 400 });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
