import Link from "next/link";
import { auth0 } from "@/lib/auth0";
import { fetchFromApi } from "@/lib/apiBase";
import SelectedOrgSync from "@/components/SelectedOrgSync";
import { resolveCanOperateServices, resolveCanAdminOrgs } from "@/lib/roleAccess";

async function fetchWithToken(path: string) {
  const { token: accessToken } = await auth0.getAccessToken();

  return fetchFromApi(path, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    cache: "no-store"
  });
}

function toEditorUrl(rawUrl?: string) {
  if (!rawUrl) return "";
  try {
    const parsed = new URL(rawUrl);
    if (!parsed.pathname || parsed.pathname === "/") {
      parsed.pathname = "/home/workflows";
    }
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

export default async function ServiceConsolePage({
  params
}: {
  params: Promise<{ orgId: string; selectionId: string }>;
}) {
  const { orgId, selectionId } = await params;
  const session = await auth0.getSession();
  if (!session?.user) {
    return (
      <main style={{ padding: "2rem", fontFamily: "ui-sans-serif, system-ui" }}>
        <p>Please login first.</p>
        <Link href="/auth/login">Login</Link>
      </main>
    );
  }
  const canOperate = await resolveCanOperateServices(session.user);
  const canAdmin = await resolveCanAdminOrgs(session.user);

  const servicesRes = await fetchWithToken(`/orgs/${orgId}/services`);
  if (!servicesRes.ok) {
    return (
      <main style={{ padding: "2rem", fontFamily: "ui-sans-serif, system-ui" }}>
        <p>Unable to load service console.</p>
        <Link href={`/orgs/${orgId}`}>Back To Organization</Link>
      </main>
    );
  }
  const data = await servicesRes.json();
  const activityRes = await fetchWithToken(`/orgs/${orgId}/selections/${selectionId}/activity`);
  const activityData = activityRes.ok ? await activityRes.json() : { logs: [] };
  const service = (data.services || []).find(
    (s: { selectionId: string | null }) => s.selectionId === selectionId
  );
  const selection = service?.selection || null;

  if (!service || !selection) {
    return (
      <main style={{ padding: "2rem", fontFamily: "ui-sans-serif, system-ui" }}>
        <p>Service selection not found.</p>
        <Link href={`/orgs/${orgId}`}>Back To Organization</Link>
      </main>
    );
  }

  const editorUrl = toEditorUrl(selection.editorUrl || selection.endpointUrl || "");

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "2.5rem clamp(1.5rem, 3vw, 4rem) 3rem",
        display: "grid",
        gap: "1.25rem"
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
          Vishu Systems · {data.org?.name || "Organization"}
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
          display: "grid",
          gap: "0.85rem",
          maxWidth: "880px"
        }}
      >
        <h1 style={{ margin: 0 }}>Service Console</h1>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          {service.name} for {data.org?.name || "Organization"}
        </p>
        <p style={{ margin: 0 }}>
          Status: <strong>{selection.status}</strong>
        </p>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          Capacity: {selection.capacityOption} · Replicas: {selection.instances}
        </p>
        {selection.endpointUrl ? (
          <p style={{ margin: 0 }}>
            Runtime endpoint:{" "}
            <a href={selection.endpointUrl} target="_blank" rel="noreferrer">
              {selection.endpointUrl}
            </a>
          </p>
        ) : null}

        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginTop: "0.4rem" }}>
          {canOperate ? (
            <>
              {selection.status !== "active" ? (
                <form
                  action={`/api/orgs/${orgId}/selections/${selectionId}/activate?next=/orgs/${orgId}/services/${selectionId}`}
                  method="post"
                >
                  <button
                    type="submit"
                    style={{
                      border: "1px solid var(--accent)",
                      background: "#e7fbf8",
                      color: "#135f5a",
                      padding: "0.45rem 0.85rem",
                      borderRadius: "999px",
                      cursor: "pointer"
                    }}
                  >
                    Start Service
                  </button>
                </form>
              ) : canAdmin ? (
                <form
                  action={`/api/orgs/${orgId}/selections/${selectionId}/remove?next=/orgs/${orgId}/services/${selectionId}`}
                  method="post"
                >
                  <button
                    type="submit"
                    style={{
                      border: "1px solid #c76373",
                      background: "#ffe6ea",
                      color: "#8d2132",
                      padding: "0.45rem 0.85rem",
                      borderRadius: "999px",
                      cursor: "pointer"
                    }}
                  >
                    Stop & Remove
                  </button>
                </form>
              ) : (
                <form
                  action={`/api/orgs/${orgId}/selections/${selectionId}/deactivate?next=/orgs/${orgId}/services/${selectionId}`}
                  method="post"
                >
                  <button
                    type="submit"
                    style={{
                      border: "1px solid #c76373",
                      background: "#ffe6ea",
                      color: "#8d2132",
                      padding: "0.45rem 0.85rem",
                      borderRadius: "999px",
                      cursor: "pointer"
                    }}
                  >
                    Stop Service
                  </button>
                </form>
              )}

              {editorUrl ? (
                <form action={editorUrl} method="get" target="_blank">
                  <button
                    type="submit"
                    style={{
                      border: "1px solid var(--accent)",
                      background: "#e7fbf8",
                      color: "#135f5a",
                      padding: "0.45rem 0.85rem",
                      borderRadius: "999px",
                      cursor: "pointer"
                    }}
                  >
                    Open Workflow Editor
                  </button>
                </form>
              ) : null}
            </>
          ) : (
            <span style={{ color: "var(--muted)" }}>
              Viewer access: service control and workflow editing are disabled.
            </span>
          )}
        </div>
      </section>

      <section
        style={{
          border: "1px solid var(--stroke)",
          background: "var(--card)",
          borderRadius: "16px",
          padding: "1.25rem",
          display: "grid",
          gap: "0.75rem",
          maxWidth: "880px"
        }}
      >
        <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Service Activity</h2>
        {activityData.logs?.length ? (
          <div style={{ display: "grid", gap: "0.6rem" }}>
            {activityData.logs.map(
              (log: { _id: string; message: string; eventType: string; createdAt: string }) => (
                <div
                  key={log._id}
                  style={{
                    border: "1px solid var(--stroke)",
                    borderRadius: "10px",
                    padding: "0.7rem 0.8rem",
                    background: "#ffffff"
                  }}
                >
                  <strong style={{ display: "block" }}>{log.message}</strong>
                  <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                    {log.eventType} · {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              )
            )}
          </div>
        ) : (
          <p style={{ margin: 0, color: "var(--muted)" }}>
            No activity yet. Activity appears when you enroll, start, stop, or update service status.
          </p>
        )}
      </section>

      <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
        <form action={`/orgs/${orgId}`} method="get">
          <button
            type="submit"
            style={{
              border: "1px solid var(--stroke)",
              background: "var(--card)",
              color: "var(--text)",
              padding: "0.45rem 0.9rem",
              borderRadius: "999px",
              cursor: "pointer",
              fontWeight: 600
            }}
          >
            Back To Organization
          </button>
        </form>
      </div>
    </main>
  );
}
