"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ActionButton, Pill, type Tone } from "@/components/app/ui";
import { DirectiveEditor, type Directive } from "@/components/admin/Directives";

/**
 * BREAKPOINT HQ
 *
 * The level above the clients. Three things live here and only here:
 * the client roster, onboarding submissions (a submission exists before
 * its client's board does), and the system-wide agent canon. Anything
 * scoped to one client — schedules, locations, sources, requests, the
 * client's own directives — lives on that client's board, one level
 * down.
 */

export type ClientCard = {
  slug: string;
  name: string;
  locations: number;
  centers: number;
};

type Submission = {
  id: string;
  org_slug: string;
  client_name: string;
  store_estimate: number | null;
  row_count: number | null;
  submitted_at: string;
  processed_at: string | null;
};

type RequestRow = { org_slug?: string; handled_at: string | null };

export function HQBoard({ clients }: { clients: ClientCard[] }) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [directives, setDirectives] = useState<Directive[]>([]);
  const [openRequests, setOpenRequests] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/admin/api", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setSubmissions(data.submissions ?? []);
    setDirectives(
      ((data.directives ?? []) as Directive[]).filter((d) => d.scope === "global"),
    );
    setOpenRequests(
      ((data.requests ?? []) as RequestRow[]).filter((r) => !r.handled_at).length,
    );
    setLoaded(true);
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
      return res.ok;
    },
    [load],
  );

  if (!loaded) {
    return <p className="px-6 py-10 text-[0.8125rem] text-muted">Loading.</p>;
  }

  return (
    <div className="mx-auto max-w-[80rem] space-y-6 px-6 py-6">
      {/* ---- the roster ---- */}
      <section className="overflow-hidden rounded-xl border border-line">
        <div className="border-b border-line px-4 py-3">
          <h2 className="text-[0.875rem] font-semibold text-ink">Clients</h2>
          <p className="mt-0.5 text-[0.75rem] text-muted">
            Each client has its own board: schedules, locations, sources,
            requests, and the rules that apply to them alone.
          </p>
        </div>
        <ul className="divide-y divide-line">
          {clients.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/admin/clients/${c.slug}`}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-sunk"
              >
                <div>
                  <p className="text-[0.875rem] font-semibold text-ink">{c.name}</p>
                  <p className="mt-0.5 text-[0.75rem] text-muted">
                    {c.locations} monitored locations across {c.centers} centers
                    {openRequests > 0 ? ` · ${openRequests} open request${openRequests === 1 ? "" : "s"}` : ""}
                  </p>
                </div>
                <span className="flex items-center gap-1.5 text-[0.75rem] font-medium text-petrol-700">
                  Open the board <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ---- onboarding submissions: clients arriving ---- */}
      <section className="overflow-hidden rounded-xl border border-line">
        <div className="border-b border-line px-4 py-3">
          <h2 className="text-[0.875rem] font-semibold text-ink">
            Onboarding submissions
          </h2>
          <p className="mt-0.5 text-[0.75rem] text-muted">
            A submission is the work order a new account is set up from.
          </p>
        </div>
        {submissions.length === 0 ? (
          <p className="px-4 py-4 text-[0.8125rem] text-muted">
            Nothing waiting. New submissions land here when a client sends
            their onboarding console to us.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {submissions.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-[0.8125rem] font-medium text-ink">
                    {s.client_name}
                  </p>
                  <p className="text-[0.6875rem] text-muted">
                    {s.row_count ?? 0} roster rows
                    {s.store_estimate ? ` of ${s.store_estimate} expected` : ""}
                    {" · "}
                    {new Date(s.submitted_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                {s.processed_at ? (
                  <Pill tone={"open" as Tone} dot>
                    Set up
                  </Pill>
                ) : (
                  <ActionButton
                    variant="secondary"
                    onClick={() => void post({ action: "submission_processed", id: s.id })}
                  >
                    Mark set up
                  </ActionButton>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---- the system-wide canon ---- */}
      <DirectiveEditor
        title="Agent programming · Breakpoint-wide"
        blurb="The system canon. These rules reach every extraction and scan run for every client. Per-client rules are edited on the client's own board."
        scope="global"
        directives={directives}
        onPost={post}
      />

      <p className="text-[0.6875rem] text-faint">
        Internal. Changes persist to the account database and reach the
        agent without a deploy.
      </p>
    </div>
  );
}
