import Link from "next/link";
import { auth0 } from "@/lib/auth0";
import { fetchFromApi } from "@/lib/apiBase";
import OrgCardActions from "@/components/OrgCardActions";
import { getSelectedOrgId, pickSelectedOrg } from "@/lib/selectedOrg";
import { deriveOwnerPrefix } from "@/lib/ownerPrefix";

async function fetchOrgs() {
  try {
    const { token: accessToken } = await auth0.getAccessToken();

    const res = await fetchFromApi("/orgs", {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      cache: "no-store"
    });
    if (!res.ok) return { orgs: [] };
    return res.json();
  } catch {
    const res = await fetchFromApi("/orgs", { cache: "no-store" });
    if (!res.ok) return { orgs: [] };
    return res.json();
  }
}

async function ensureDefaultOrg(ownerPrefix: string) {
  const { token: accessToken } = await auth0.getAccessToken();
  const res = await fetchFromApi("/orgs", {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    cache: "no-store"
  });
  if (!res.ok) return { orgs: [] };
  const data = await res.json();
  if (data.orgs?.length) return data;

  const createRes = await fetchFromApi("/orgs/default", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
    },
    body: JSON.stringify({ name: "Default Organization", ownerPrefix })
  });
  if (!createRes.ok) return data;
  return await fetchOrgs();
}

export default async function OrgsPage() {
  const session = await auth0.getSession();
  if (!session?.user) {
    return (
      <main style={{ padding: "2rem", fontFamily: "ui-sans-serif, system-ui" }}>
        <p>Please login first.</p>
        <Link href="/auth/login">Login</Link>
      </main>
    );
  }

  const ownerPrefix = deriveOwnerPrefix(session.user);
  const data = await ensureDefaultOrg(ownerPrefix);
  const selectedOrgId = await getSelectedOrgId();
  const primaryOrg = pickSelectedOrg(data.orgs || [], selectedOrgId);

  return (
    <main style={{ padding: "2rem", fontFamily: "ui-sans-serif, system-ui" }}>
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.5rem"
        }}
      >
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.6rem",
            fontWeight: 700,
            letterSpacing: "0.02em",
            fontSize: "1.2rem"
          }}
        >
          <span
            style={{
              width: "1.8rem",
              height: "1.8rem",
              borderRadius: "10px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(140deg, var(--accent), #23a79b)",
              color: "#04221f",
              fontSize: "0.75rem",
              fontWeight: 800
            }}
          >
            VS
          </span>
          Vishu Systems{primaryOrg?.name ? ` · ${primaryOrg.name}` : ""}
        </Link>
        <Link
          href="/auth/logout"
          style={{
            border: "1px solid var(--stroke)",
            padding: "0.45rem 0.9rem",
            borderRadius: "999px",
            background: "var(--card)",
            color: "#7a2733"
          }}
        >
          Logout
        </Link>
      </nav>
      <h1>Your Organizations</h1>
      <br />
      <p>Logged in as {session.user.email}</p>
      <br />

      <section
        style={{
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))"
        }}
      >
        {data.orgs?.map((org: { id?: string; _id?: string; name: string }) => {
          const orgId = org.id || org._id || "";
          return (
            <div
              key={orgId}
              style={{
                border: "1px solid var(--stroke)",
                background: "var(--card)",
                padding: "1rem",
                borderRadius: "14px",
                display: "grid",
                gap: "0.5rem"
              }}
            >
              <strong>{org.name}</strong>
              <span style={{ color: "var(--muted)" }}>
                Open services and manage subscriptions
              </span>
              <OrgCardActions orgId={orgId} orgName={org.name} />
            </div>
          );
        })}
      </section>

      <form
        action="/api/orgs/create"
        method="post"
        style={{
          marginTop: "1.5rem",
          display: "grid",
          gap: "0.75rem",
          maxWidth: "480px",
          padding: "1rem",
          borderRadius: "14px",
          border: "1px dashed var(--stroke)",
          background: "rgba(255, 255, 255, 0.88)"
        }}
      >
        <label style={{ fontWeight: 600 }}>Create a new organization</label>
        <input
          name="name"
          placeholder="e.g. Vishu Systems Growth"
          required
          style={{
            padding: "0.7rem 0.9rem",
            borderRadius: "10px",
            border: "1px solid var(--stroke)",
            background: "#ffffff",
            color: "var(--text)"
          }}
        />
        <button
          type="submit"
          style={{
            background: "var(--accent)",
            color: "#ffffff",
            padding: "0.7rem 1rem",
            borderRadius: "999px",
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
            width: "fit-content"
          }}
        >
          Create org and pick services
        </button>
      </form>

      <div style={{ marginTop: "1rem" }}>
        <Link
          href="/"
          style={{
            border: "1px solid var(--stroke)",
            background: "var(--card)",
            padding: "0.6rem 1rem",
            borderRadius: "999px",
            display: "inline-block",
            color: "var(--text)"
          }}
        >
          Back to Main Page
        </Link>
      </div>

    </main>
  );
}
