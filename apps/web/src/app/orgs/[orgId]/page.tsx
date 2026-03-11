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

export default async function OrgServicesPage({
  params
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
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
  const services = servicesRes.ok
    ? await servicesRes.json()
    : { services: [], org: null };

  return (
    <main style={{ padding: "2rem", fontFamily: "ui-sans-serif, system-ui" }}>
      <SelectedOrgSync orgId={orgId} />
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.5rem"
        }}
      >
        <Link href="/" style={{ fontWeight: 700 }}>
          Vishu Systems · {services.org?.name || "Organization"}
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
      <h1>Organization - Services</h1>
      <br />
      <p>
        Organization: {services.org?.name || "Unknown"} ({orgId})
      </p>
      <br />

      <section
        style={{
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))"
        }}
      >
        {services.services.map(
          (service: {
            id: string;
            name: string;
            description: string;
            packages: { id: string; name: string }[];
            status: string;
            selectionId: string | null;
            selection: {
              _id: string;
              status: string;
              instances: number;
              capacityOption: string;
              endpointUrl?: string;
              editorUrl?: string;
              deploymentStatus?: string;
            } | null;
          }) => {
            const primaryPackage = service.packages[0];
            const status = service.status || "not_enrolled";
            const selectionId = service.selectionId;

            return (
              <div
                key={service.id}
                style={{
                  border: "1px solid var(--stroke)",
                  borderRadius: "14px",
                  padding: "1rem",
                  background: "var(--card)",
                  display: "grid",
                  gap: "0.75rem"
                }}
              >
                <div>
                  <h3 style={{ margin: 0 }}>{service.name}</h3>
                  <p style={{ margin: 0, color: "var(--muted)" }}>
                    {service.description}
                  </p>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem"
                  }}
                >
                  {status === "not_enrolled" ? (
                    canOperate ? (
                      <Link
                        href={`/orgs/${orgId}/enroll?serviceId=${service.id}&packageId=${primaryPackage?.id || ""}`}
                        style={{
                          padding: "0.2rem 0.6rem",
                          borderRadius: "999px",
                          fontSize: "0.8rem",
                          border: "1px solid var(--stroke)",
                          background: "#ffffff",
                          color: "var(--text)"
                        }}
                      >
                        not enrolled
                      </Link>
                    ) : (
                      <span
                        style={{
                          padding: "0.2rem 0.6rem",
                          borderRadius: "999px",
                          fontSize: "0.8rem",
                          border: "1px solid var(--stroke)",
                          background: "#ffffff",
                          color: "var(--muted)"
                        }}
                      >
                        not enrolled (viewer)
                      </span>
                    )
                  ) : (
                    <span
                      style={{
                        padding: "0.2rem 0.6rem",
                        borderRadius: "999px",
                        fontSize: "0.8rem",
                        border: "1px solid var(--stroke)",
                        background: "#ffffff",
                        color: "var(--text)"
                      }}
                    >
                      {status.replace("_", " ")}
                    </span>
                  )}
                  {service.selection && (
                    <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                      {service.selection.instances} inst · {service.selection.capacityOption}
                    </span>
                  )}
                </div>

                {selectionId ? (
                  <Link
                    href={`/orgs/${orgId}/services/${selectionId}`}
                    style={{ color: "var(--accent)" }}
                  >
                    Open Service Console
                  </Link>
                ) : null}

                {status !== "not_enrolled" && canOperate ? (
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    {status !== "active" && selectionId ? (
                      <form
                        action={`/api/orgs/${orgId}/selections/${selectionId}/activate`}
                        method="post"
                      >
                        <button
                          type="submit"
                          style={{
                            border: "1px solid var(--accent)",
                            background: "#e7fbf8",
                            color: "#135f5a",
                            padding: "0.35rem 0.75rem",
                            borderRadius: "999px",
                            cursor: "pointer"
                          }}
                        >
                          Activate
                        </button>
                      </form>
                    ) : null}

                    {status === "active" && selectionId && canAdmin ? (
                      <form
                        action={`/api/orgs/${orgId}/selections/${selectionId}/remove`}
                        method="post"
                      >
                        <button
                          type="submit"
                          style={{
                            border: "1px solid #c76373",
                            background: "#ffe6ea",
                            color: "#8d2132",
                            padding: "0.35rem 0.75rem",
                            borderRadius: "999px",
                            cursor: "pointer"
                          }}
                        >
                          Stop & Remove
                        </button>
                      </form>
                    ) : null}

                    {status === "active" && selectionId && !canAdmin ? (
                      <form
                        action={`/api/orgs/${orgId}/selections/${selectionId}/deactivate`}
                        method="post"
                      >
                        <button
                          type="submit"
                          style={{
                            border: "1px solid #c76373",
                            background: "#ffe6ea",
                            color: "#8d2132",
                            padding: "0.35rem 0.75rem",
                            borderRadius: "999px",
                            cursor: "pointer"
                          }}
                        >
                          Stop Service
                        </button>
                      </form>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          }
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
