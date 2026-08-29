"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * The console's HQ payload, shared by every company-level page:
 * registry, submissions, canon, the cross-client request queue, and
 * coverage counts. One fetch shape, one post helper.
 */

export type OrgRow = {
  slug: string;
  name: string;
  status: "onboarding" | "live" | "paused";
  descriptor: string | null;
  created_at: string;
  open_requests: number;
  locations: number | null;
  centers: number | null;
  account_manager: string | null;
  contract_renewal: string | null;
  demo_mode: boolean;
};

export type StaffRow = {
  id: string;
  email: string;
  name: string;
  title: string | null;
  disabled_at: string | null;
  created_at: string;
};

export type Submission = {
  id: string;
  org_slug: string;
  client_name: string;
  store_estimate: number | null;
  row_count: number | null;
  submitted_at: string;
  processed_at: string | null;
  org_exists: boolean;
};

export type Directive = {
  id: string;
  scope: string;
  topic: string;
  body: string;
  active: boolean;
};

export type RequestRow = {
  id: string;
  org_slug: string;
  org_name: string | null;
  location_ref: string | null;
  center_name: string | null;
  kind: string;
  store_name: string | null;
  observed_on: string | null;
  body: string | null;
  created_at: string;
  handled_at: string | null;
};

export type Coverage = {
  withPlaceByOrg: { org_slug: string; with_place: string | number }[];
  centersWithDirectory: number;
};

export type ConsoleData = {
  orgs: OrgRow[];
  pipelinePending: number;
  avgHandleSeconds: number | null;
  submissions: Submission[];
  directives: Directive[];
  requestsAll: RequestRow[];
  coverage: Coverage;
  staff: StaffRow[];
};

export function useConsole() {
  const [data, setData] = useState<ConsoleData | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/admin/api", { cache: "no-store" });
    if (!res.ok) return;
    setData(await res.json());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const post = useCallback(
    async (payload: Record<string, unknown>) => {
      const res = await fetch("/admin/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) await load();
      return res.ok
        ? { ok: true as const, data: null }
        : {
            ok: false as const,
            data: await res.json().catch(() => null),
          };
    },
    [load],
  );

  return { data, post, reload: load };
}

export const KIND_LABEL: Record<string, string> = {
  manual_scan: "Scan now",
  closure_report: "Closure report",
  estoppel_review: "Estoppel review",
  field_verification: "Field verification",
};

/** The onboarding console link we send a client. */
export function inviteLink(name: string, stores?: number | null): string {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://breakpoint.epicdevsolutions.com";
  const q = new URLSearchParams({ client: name });
  if (stores) q.set("stores", String(stores));
  return `${origin}/onboarding?${q.toString()}`;
}
