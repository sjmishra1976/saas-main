"use client";

import { useEffect } from "react";

export default function SelectedOrgSync({ orgId }: { orgId: string }) {
  useEffect(() => {
    void fetch(`/api/orgs/select/${orgId}`, {
      method: "POST",
      cache: "no-store"
    });
  }, [orgId]);

  return null;
}
