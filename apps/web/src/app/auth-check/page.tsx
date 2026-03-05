import Link from "next/link";
import { auth0 } from "@/lib/auth0";
import { fetchFromApi } from "@/lib/apiBase";
import { getSelectedOrgId, pickSelectedOrg } from "@/lib/selectedOrg";

async function fetchPrimaryOrgName() {
  try {
    const selectedOrgId = await getSelectedOrgId();
    const { token: accessToken } = await auth0.getAccessToken();
    const res = await fetchFromApi("/orgs", {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      cache: "no-store"
    });
    if (!res.ok) return null;
    const data = await res.json();
    const selected = pickSelectedOrg(data.orgs || [], selectedOrgId);
    return selected?.name || null;
  } catch {
    return null;
  }
}

export default async function AuthCheckPage() {
  const session = await auth0.getSession();
  const primaryOrgName = session?.user ? await fetchPrimaryOrgName() : null;
  if (!session?.user) {
    return (
      <main style={{ padding: "2rem", fontFamily: "ui-sans-serif, system-ui" }}>
        <p>Please login first.</p>
        <Link href="/auth/login">Login</Link>
      </main>
    );
  }

  let me: unknown = null;
  let error: string | null = null;

  try {
    const { token: accessToken } = await auth0.getAccessToken();

    const res = await fetchFromApi("/me", {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      cache: "no-store"
    });

    if (!res.ok) {
      error = `API error: ${res.status}`;
    } else {
      me = await res.json();
    }
  } catch (err) {
    error = "Failed to fetch /me";
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "2.5rem clamp(1.5rem, 3vw, 4rem) 3rem",
        fontFamily: "ui-sans-serif, system-ui"
      }}
    >
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
          Vishu Systems{primaryOrgName ? ` · ${primaryOrgName}` : ""}
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
          maxWidth: "900px",
          display: "grid",
          gap: "1rem"
        }}
      >
        <h1 style={{ margin: 0 }}>Auth Check</h1>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          Logged in as {session.user.email}
        </p>

        {error ? (
          <p style={{ color: "#9c1f2d", margin: 0 }}>{error}</p>
        ) : (
          <pre
            style={{
              background: "#f5fbff",
              color: "#16324d",
              border: "1px solid var(--stroke)",
              padding: "1rem",
              borderRadius: "10px",
              overflowX: "auto"
            }}
          >
            {JSON.stringify(me, null, 2)}
          </pre>
        )}
      </section>

      <div style={{ marginTop: "1rem" }}>
        <Link
          href="/orgs"
          style={{
            border: "1px solid var(--stroke)",
            background: "var(--card)",
            color: "var(--text)",
            padding: "0.45rem 0.9rem",
            borderRadius: "999px",
            display: "inline-block"
          }}
        >
          Back To Organization
        </Link>
      </div>
    </main>
  );
}
