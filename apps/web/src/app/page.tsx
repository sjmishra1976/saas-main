import Link from "next/link";
import { auth0 } from "@/lib/auth0";
import { fetchFromApi } from "@/lib/apiBase";
import ServiceCatalogCards from "@/components/ServiceCatalogCards";
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

export default async function Home() {
  const session = await auth0.getSession();
  const primaryOrgName = session?.user ? await fetchPrimaryOrgName() : null;

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "2.5rem clamp(1.5rem, 3vw, 4rem) 3rem",
        display: "grid",
        gap: "3rem"
      }}
    >
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
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
            fontSize: "1.35rem"
          }}
        >
          <span
            style={{
              width: "1.9rem",
              height: "1.9rem",
              borderRadius: "10px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(140deg, var(--accent), #23a79b)",
              color: "#04221f",
              fontSize: "0.8rem",
              fontWeight: 800
            }}
          >
            VS
          </span>
          Vishu Systems{primaryOrgName ? ` · ${primaryOrgName}` : ""}
        </Link>

        {session?.user ? (
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <Link
              href="/orgs"
              style={{
                border: "1px solid var(--stroke)",
                padding: "0.45rem 0.9rem",
                borderRadius: "999px",
                background: "var(--card)",
                color: "var(--text)"
              }}
            >
              Organizations
            </Link>
            <Link
              href="/auth-check"
              style={{
                border: "1px solid var(--stroke)",
                padding: "0.45rem 0.9rem",
                borderRadius: "999px",
                background: "var(--card)",
                color: "var(--text)"
              }}
            >
              Auth
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
          </div>
        ) : (
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <Link
              href="/auth/login"
              style={{
                border: "1px solid var(--stroke)",
                background: "var(--card)",
                color: "var(--text)",
                padding: "0.45rem 0.9rem",
                borderRadius: "999px",
                fontWeight: 600
              }}
            >
              Login
            </Link>
            <Link
              href="/auth/login?screen_hint=signup"
              style={{
                border: "1px solid var(--stroke)",
                background: "var(--card)",
                color: "var(--text)",
                padding: "0.45rem 0.9rem",
                borderRadius: "999px",
                fontWeight: 600
              }}
            >
              Create account
            </Link>
          </div>
        )}
      </nav>

      <header
        style={{
          display: "grid",
          gap: "0.85rem",
          maxWidth: "900px"
        }}
      >
        <h1
          style={{
            fontSize: "clamp(0.95rem, 1.8vw, 1.1rem)",
            lineHeight: 1.05,
            margin: 0
          }}
        >
          AI as a Service for modern AI Automation teams
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "1.1rem", margin: 0 }}>
          Create an organization, pick intelligent service packages, and deploy
          tenant-ready assistants in minutes.
        </p>

      </header>

      <section
        style={{
          border: "1px solid var(--stroke)",
          borderRadius: "18px",
          padding: "1.25rem",
          background: "rgba(255, 255, 255, 0.86)",
          display: "grid",
          gap: "1rem"
        }}
      >
        <div style={{ display: "grid", gap: "0.3rem" }}>
          <p
            style={{
              margin: 0,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              fontSize: "0.72rem",
              color: "var(--muted)"
            }}
          >
            Service Catalog
          </p>
        </div>
        <div
          style={{
            display: "grid",
            gap: "1rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))"
          }}
        >
          <ServiceCatalogCards cards={[
            {
              title: "Sales Assistant",
              body:
                "Lead qualification, pipeline summaries, outreach drafts, and next-best actions."
            },
            {
              title: "Customer Service Assistant",
              body:
                "Ticket triage, knowledge base answers, SLA reminders, and escalation routing."
            },
            {
              title: "Revenue Ops Copilot",
              body:
                "Forecast hygiene checks, CRM enrichment, and automated pipeline nudges."
            },
            {
              title: "Onboarding Concierge",
              body:
                "Guided onboarding, playbooks, and product adoption checklists."
            }
          ]} />
        </div>
      </section>

      <section
        style={{
          border: "1px solid var(--stroke)",
          borderRadius: "18px",
          padding: "1.25rem",
          background: "rgba(255, 255, 255, 0.88)",
          display: "grid",
          gap: "1rem"
        }}
      >
        <div style={{ display: "grid", gap: "0.3rem" }}>
          <p
            style={{
              margin: 0,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              fontSize: "0.72rem",
              color: "var(--muted)"
            }}
          >
            Platform Features
          </p>
        </div>
        <div
          style={{
            display: "grid",
            gap: "1rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))"
          }}
        >
          <div
            style={{
              padding: "1.25rem",
              borderRadius: "14px",
              border: "1px solid var(--stroke)",
              background:
                "linear-gradient(120deg, rgba(59,215,198,0.22), rgba(255,255,255,0.95))"
            }}
          >
            <h3 style={{ marginTop: 0 }}>Tenant Ready</h3>
            <p style={{ margin: 0, color: "var(--muted)" }}>
              Each service package carries org-aware config, env defaults, and
              isolated runtime settings.
            </p>
          </div>
          <div
            style={{
              padding: "1.25rem",
              borderRadius: "14px",
              border: "1px solid var(--stroke)",
              background:
                "linear-gradient(120deg, rgba(241,176,68,0.26), rgba(255,255,255,0.95))"
            }}
          >
            <h3 style={{ marginTop: 0 }}>Deploy Ready</h3>
            <p style={{ margin: 0, color: "var(--muted)" }}>
              Activation produces queue-mode n8n deployment specs with instance
              and capacity settings.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
