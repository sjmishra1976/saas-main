import { cookies } from "next/headers";

type OrgLike = { id?: string; _id?: string; name?: string };

export async function getSelectedOrgId() {
  const store = await cookies();
  return store.get("selected_org_id")?.value || null;
}

export function pickSelectedOrg<T extends OrgLike>(orgs: T[], selectedOrgId: string | null) {
  if (!orgs?.length) return null;
  if (!selectedOrgId) return orgs[0];
  return (
    orgs.find((org) => (org.id || org._id || "") === selectedOrgId) || orgs[0]
  );
}
