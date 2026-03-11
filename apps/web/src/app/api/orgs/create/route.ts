import { NextResponse } from "next/server";
import { toAppUrl } from "@/lib/appUrl";
import { auth0 } from "@/lib/auth0";
import { fetchFromApi } from "@/lib/apiBase";
import { deriveOwnerPrefix } from "@/lib/ownerPrefix";

export async function POST(req: Request) {
  const formData = await req.formData();
  const name = formData.get("name");

  try {
    const session = await auth0.getSession();
    const { token: accessToken } = await auth0.getAccessToken();
    const ownerPrefix = deriveOwnerPrefix(session?.user);

    const res = await fetchFromApi("/orgs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
      },
      body: JSON.stringify({ name, ownerPrefix })
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to create org" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Auth required" }, { status: 401 });
  }

  return NextResponse.redirect(toAppUrl("/orgs", req));
}
