const ROLE_CLAIM = "https://vishusystems.com/roles";

type UserLike = {
  [key: string]: unknown;
  roles?: unknown;
  app_metadata?: {
    roles?: unknown;
  };
};

export function getUserRoles(user?: UserLike | null) {
  if (!user) return [] as string[];
  const namespaced = user[ROLE_CLAIM];
  const plain = user.roles;
  const appMetadataRoles = user.app_metadata?.roles;
  const raw = Array.isArray(namespaced)
    ? namespaced
    : Array.isArray(plain)
      ? plain
      : Array.isArray(appMetadataRoles)
        ? appMetadataRoles
        : [];
  return raw.map((r) => String(r).trim().toLowerCase());
}

export function canOperateServices(user?: UserLike | null) {
  const roles = getUserRoles(user);
  return roles.includes("org_admin") || roles.includes("org_operator");
}

export function canAdminOrgs(user?: UserLike | null) {
  const roles = getUserRoles(user);
  return roles.includes("org_admin");
}
