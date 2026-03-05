import Link from "next/link";
import { auth0 } from "@/lib/auth0";
import { fetchFromApi } from "@/lib/apiBase";
import SelectedOrgSync from "@/components/SelectedOrgSync";

async function fetchOrgName(orgId: string) {
  try {
    const { token: accessToken } = await auth0.getAccessToken();
    const res = await fetchFromApi(`/orgs/${orgId}/services`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      cache: "no-store"
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.org?.name || null;
  } catch {
    return null;
  }
}

export default async function EnrollPage({
  params,
  searchParams
}: {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<{ serviceId?: string; packageId?: string }>;
}) {
  const { orgId } = await params;
  const resolvedSearch = await searchParams;
  const orgName = await fetchOrgName(orgId);
  const session = await auth0.getSession();
  if (!session?.user) {
    return (
      <main style={{ padding: "2rem", fontFamily: "ui-sans-serif, system-ui" }}>
        <p>Please login first.</p>
        <Link href="/auth/login">Login</Link>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "2.5rem clamp(1.5rem, 3vw, 4rem) 3rem",
        display: "grid",
        gap: "2rem"
      }}
    >
      <SelectedOrgSync orgId={orgId} />
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        <Link href="/" style={{ fontWeight: 700 }}>
          Vishu Systems{orgName ? ` · ${orgName}` : ""}
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

      <section
        style={{
          border: "1px solid var(--stroke)",
          background: "var(--card)",
          borderRadius: "16px",
          padding: "1.5rem",
          maxWidth: "720px"
        }}
      >
        <h1 style={{ marginTop: 0 }}>Enroll Service</h1>
        <p style={{ color: "var(--muted)" }}>
          Configure your deployment settings before activating this service.
        </p>

        <form
          action={`/api/orgs/${orgId}/enroll`}
          method="post"
          style={{ display: "grid", gap: "1rem", marginTop: "1.5rem" }}
        >
          <input type="hidden" name="serviceId" value={resolvedSearch.serviceId || ""} />
          <input type="hidden" name="packageId" value={resolvedSearch.packageId || ""} />

          <label style={{ display: "grid", gap: "0.5rem" }}>
            <span style={{ fontWeight: 600 }}>Instances</span>
            <input
              name="instances"
              type="number"
              defaultValue={1}
              min={1}
              style={{
                padding: "0.7rem 0.9rem",
                borderRadius: "10px",
                border: "1px solid var(--stroke)",
                background: "#ffffff",
                color: "var(--text)"
              }}
            />
          </label>

          <label style={{ display: "grid", gap: "0.5rem" }}>
            <span style={{ fontWeight: 600 }}>Capacity tier</span>
            <select
              name="capacityOption"
              defaultValue="standard"
              style={{
                padding: "0.7rem 0.9rem",
                borderRadius: "10px",
                border: "1px solid var(--stroke)",
                background: "#ffffff",
                color: "var(--text)"
              }}
            >
              <option value="standard">Standard</option>
              <option value="professional">Professional</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </label>

          <button
            type="submit"
            style={{
              background: "var(--accent)",
              color: "#ffffff",
              padding: "0.75rem 1.2rem",
              borderRadius: "999px",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              width: "fit-content"
            }}
          >
            Confirm Enrollment
          </button>
        </form>
      </section>

      <div>
        <Link href={`/orgs/${orgId}`} style={{ color: "var(--muted)" }}>
          Back to org
        </Link>
      </div>
    </main>
  );
}
