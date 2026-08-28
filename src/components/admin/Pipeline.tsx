"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/admin/Shell";
import {
  Badge,
  Btn,
  Card,
  Monogram,
  ProgressBar,
  Rise,
  EmptyNote,
} from "@/components/admin/ui";
import { useConsole } from "@/components/admin/useConsole";

/**
 * The onboarding pipeline: submissions arriving from client consoles,
 * each promoted into an account with one click. Inviting a brand-new
 * company (before any submission exists) lives on the Clients page —
 * this page is the inbound side.
 */
export function Pipeline() {
  const { data, post } = useConsole();

  if (!data) {
    return <p className="py-16 text-center text-[0.8125rem] text-slate-400">Loading.</p>;
  }

  const waiting = data.submissions.filter((s) => !s.processed_at).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Onboarding"
        blurb="A submission is the work order a new account is set up from."
        aside={
          <Link
            href="/admin/clients"
            className="text-[0.8125rem] font-medium text-indigo-600 hover:text-indigo-800"
          >
            Invite a new company →
          </Link>
        }
      />

      <Rise>
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 className="text-[0.9375rem] font-semibold text-slate-900">
              Submissions
            </h2>
            <Badge tone={waiting > 0 ? "amber" : "emerald"} dot>
              {waiting > 0 ? `${waiting} waiting` : "Clear"}
            </Badge>
          </div>
          {data.submissions.length === 0 ? (
            <EmptyNote>
              Nothing waiting. New submissions land here when a client sends
              their onboarding console to us.
            </EmptyNote>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.submissions.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-6 py-4"
                >
                  <span className="flex min-w-0 flex-1 items-center gap-3">
                    <Monogram name={s.client_name} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.8125rem] font-semibold text-slate-900">
                        {s.client_name}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        {s.store_estimate ? (
                          <span className="flex items-center gap-2">
                            <ProgressBar
                              value={(s.row_count ?? 0) / s.store_estimate}
                              className="w-28"
                            />
                            <span className="tnum whitespace-nowrap text-[0.6875rem] text-slate-400">
                              {s.row_count ?? 0}/{s.store_estimate} roster rows
                            </span>
                          </span>
                        ) : (
                          <span className="tnum text-[0.6875rem] text-slate-400">
                            {s.row_count ?? 0} roster rows
                          </span>
                        )}
                        <span className="text-[0.6875rem] text-slate-400">
                          {new Date(s.submitted_at).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                      </span>
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    {!s.org_exists ? (
                      <Btn
                        onClick={() =>
                          void post({ action: "org_create", submissionId: s.id })
                        }
                      >
                        Create the account
                      </Btn>
                    ) : s.processed_at ? (
                      <>
                        <Badge tone="emerald" dot>
                          Set up
                        </Badge>
                        <Link
                          href={`/admin/clients/${s.org_slug}`}
                          className="inline-flex items-center gap-1 text-[0.75rem] font-semibold text-indigo-600 hover:text-indigo-800"
                        >
                          Board <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </>
                    ) : (
                      <Btn
                        variant="secondary"
                        onClick={() =>
                          void post({ action: "submission_processed", id: s.id })
                        }
                      >
                        Mark set up
                      </Btn>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </Rise>
    </div>
  );
}
