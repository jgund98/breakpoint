"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronDown, FileSearch } from "lucide-react";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/admin/Shell";
import { Badge, Btn, Card, IconChip, Rise, EmptyNote } from "@/components/admin/ui";

/**
 * THE EXTRACTION REVIEW QUEUE
 *
 * The human-in-the-loop moment the product's credibility rests on: the
 * model reads the lease, a person approves the record before it goes
 * live. Each item shows the operative language beside the extracted
 * fields; approval puts the location back under watch and tells the
 * client a person signed off.
 *
 * Items arrive when an amendment lands (marking a lease updated on a
 * client board queues its record here) and, once portfolios ingest
 * from submissions, on every fresh abstraction.
 */

type Item = {
  org_slug: string;
  org_name: string | null;
  location_ref: string;
  stage: string;
  extracted: {
    cite?: string;
    tests?: { label: string; cite: string }[];
    remedy?: string | null;
    preconditions?: number;
  } | null;
  source_excerpt: string | null;
  confidence: number | null;
  note: string | null;
  created_at: string;
};

export function ExtractionQueue() {
  const [queue, setQueue] = useState<Item[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/admin/api?pipeline=1", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setQueue(data.queue ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const approve = async (item: Item) => {
    const res = await fetch("/admin/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "pipeline_approve",
        org: item.org_slug,
        locationRef: item.location_ref,
      }),
    });
    if (res.ok) void load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Extraction review"
        blurb="The model reads the lease; a person approves the record before it goes live. Nothing enters the watch without this desk."
        aside={
          queue !== null && (
            <Badge tone={queue.length > 0 ? "amber" : "emerald"} dot>
              {queue.length > 0 ? `${queue.length} awaiting review` : "Queue clear"}
            </Badge>
          )
        }
      />

      <Rise>
        <Card className="overflow-hidden">
          {queue === null ? (
            <EmptyNote>Loading.</EmptyNote>
          ) : queue.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <IconChip color="emerald" size="lg" className="mx-auto">
                <CheckCircle2 className="h-6 w-6" />
              </IconChip>
              <p className="mt-3 text-[0.9375rem] font-semibold text-slate-900">
                Nothing awaiting review
              </p>
              <p className="mx-auto mt-1 max-w-md text-[0.8125rem] leading-relaxed text-slate-500">
                Records queue here when an amendment lands: mark a lease
                updated on a client board and its record returns for
                re-approval. Fresh abstractions join the queue when portfolios
                ingest from submissions.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {queue.map((item) => {
                const key = `${item.org_slug}:${item.location_ref}`;
                const isOpen = open === key;
                return (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : key)}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 px-6 py-4 text-left transition-colors",
                        isOpen ? "bg-indigo-50/60" : "hover:bg-slate-50",
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <IconChip color="amber">
                          <FileSearch className="h-5 w-5" />
                        </IconChip>
                        <span className="min-w-0">
                          <span className="block text-[0.8125rem] font-semibold text-slate-900">
                            {item.location_ref}
                            <span className="ml-2 font-normal text-slate-400">
                              {item.org_name ?? item.org_slug}
                            </span>
                          </span>
                          <span className="block text-[0.6875rem] text-slate-400">
                            {item.note ?? "Awaiting approval"}
                          </span>
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-3">
                        {item.confidence !== null && (
                          <Badge
                            tone={item.confidence >= 90 ? "emerald" : "amber"}
                            dot
                          >
                            {item.confidence}% confidence
                          </Badge>
                        )}
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 text-slate-300 transition-transform",
                            isOpen && "rotate-180",
                          )}
                        />
                      </span>
                    </button>

                    {isOpen && (
                      <div className="grid gap-5 border-t border-slate-100 bg-slate-50/60 px-6 py-5 lg:grid-cols-2">
                        <div>
                          <p className="text-[0.75rem] font-semibold text-slate-700">
                            The operative language
                          </p>
                          <p className="mt-2 rounded-xl border border-slate-200 bg-white p-3.5 font-mono text-[0.75rem] leading-relaxed text-slate-700">
                            {item.source_excerpt ?? "No source text on the draft."}
                          </p>
                        </div>
                        <div className="space-y-3">
                          <p className="text-[0.75rem] font-semibold text-slate-700">
                            The extracted record
                          </p>
                          <dl className="space-y-2 text-[0.8125rem]">
                            {item.extracted?.cite && (
                              <div className="flex justify-between gap-4">
                                <dt className="text-slate-400">Clause</dt>
                                <dd className="font-mono text-[0.75rem] text-slate-800">
                                  {item.extracted.cite}
                                </dd>
                              </div>
                            )}
                            {(item.extracted?.tests ?? []).map((t) => (
                              <div key={t.cite + t.label} className="flex justify-between gap-4">
                                <dt className="text-slate-400">Test</dt>
                                <dd className="text-right text-slate-800">
                                  {t.label}{" "}
                                  <span className="font-mono text-[0.6875rem] text-slate-400">
                                    {t.cite}
                                  </span>
                                </dd>
                              </div>
                            ))}
                            {item.extracted?.remedy && (
                              <div className="flex justify-between gap-4">
                                <dt className="text-slate-400">Remedy</dt>
                                <dd className="text-slate-800">{item.extracted.remedy}</dd>
                              </div>
                            )}
                            {item.extracted?.preconditions !== undefined && (
                              <div className="flex justify-between gap-4">
                                <dt className="text-slate-400">Preconditions</dt>
                                <dd className="tnum text-slate-800">
                                  {item.extracted.preconditions}
                                </dd>
                              </div>
                            )}
                          </dl>
                          <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
                            <Btn onClick={() => void approve(item)}>
                              <CheckCircle2 className="h-4 w-4" /> Approve, put it
                              under watch
                            </Btn>
                            <Link
                              href={`/admin/clients/${item.org_slug}`}
                              className="text-[0.75rem] font-semibold text-indigo-600 hover:text-indigo-800"
                            >
                              Open the board →
                            </Link>
                          </div>
                          <p className="text-[0.6875rem] leading-snug text-slate-400">
                            Approving records your sign-off, returns the
                            location to live watch, and notifies the client
                            that a person reviewed it.
                          </p>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </Rise>
    </div>
  );
}
