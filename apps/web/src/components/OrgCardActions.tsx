"use client";

import Link from "next/link";

type Props = {
  orgId: string;
  orgName: string;
};

export default function OrgCardActions({ orgId, orgName }: Props) {
  return (
    <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
      <Link
        href={`/api/orgs/select/${orgId}?next=/orgs/${orgId}`}
        style={{
          border: "1px solid var(--stroke)",
          padding: "0.45rem 0.9rem",
          borderRadius: "999px",
          background: "var(--card)",
          color: "var(--text)",
          display: "inline-block"
        }}
      >
        Select
      </Link>
      <form
        action={`/api/orgs/${orgId}/delete`}
        method="post"
        onSubmit={(e) => {
          const ok = window.confirm(
            `Remove organization '${orgName}'? This will delete all enrolled services and deployed instances.`
          );
          if (!ok) e.preventDefault();
        }}
      >
        <button
          type="submit"
          style={{
            border: "1px solid #c76373",
            background: "#ffe6ea",
            color: "#8d2132",
            padding: "0.45rem 0.9rem",
            borderRadius: "999px",
            width: "fit-content",
            cursor: "pointer"
          }}
        >
          Remove Org
        </button>
      </form>
    </div>
  );
}
