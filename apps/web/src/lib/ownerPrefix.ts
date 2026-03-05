type SessionUserLike = {
  email?: string | null;
  preferred_username?: string | null;
  nickname?: string | null;
  sub?: string | null;
};

function slugPart(value: string, max = 24) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, max);
}

export function deriveOwnerPrefix(user?: SessionUserLike | null) {
  if (!user) return "user";

  const emailLocal = user.email?.includes("@")
    ? user.email.split("@")[0]
    : "";
  const subTail = user.sub?.includes("|")
    ? user.sub.split("|").pop() || ""
    : user.sub || "";
  const candidate =
    emailLocal || user.preferred_username || user.nickname || subTail || "user";

  const normalized = slugPart(candidate) || "user";
  if (/^[a-f0-9]{10,}$/i.test(normalized)) return "user";
  return normalized;
}
