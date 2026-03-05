import { auth0 } from "@/lib/auth0";
import { fetchFromApi } from "@/lib/apiBase";
import { canAdminOrgs, canOperateServices } from "@/lib/roles";

type UserLike = Record<string, unknown> | null | undefined;

async function fetchTokenUser() {
  try {
    const { token: accessToken } = await auth0.getAccessToken();
    const res = await fetchFromApi("/me", {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      cache: "no-store"
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data?.user || null) as UserLike;
  } catch {
    return null;
  }
}

export async function resolveCanAdminOrgs(sessionUser: UserLike) {
  if (canAdminOrgs(sessionUser)) return true;
  const tokenUser = await fetchTokenUser();
  return canAdminOrgs(tokenUser);
}

export async function resolveCanOperateServices(sessionUser: UserLike) {
  if (canOperateServices(sessionUser)) return true;
  const tokenUser = await fetchTokenUser();
  return canOperateServices(tokenUser);
}
