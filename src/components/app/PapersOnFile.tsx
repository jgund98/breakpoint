"use client";

import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { Panel, PanelHead } from "./ui";

/**
 * What Breakpoint holds for this location, visible to the client.
 * Read-only by design: papers arrive through onboarding and the team,
 * but a vault the client cannot see into reads as one-way.
 */

type Doc = {
  id: string;
  kind: string;
  filename: string;
  byte_size: number;
  created_at: string;
};

const fmtSize = (n: number) =>
  n >= 1024 * 1024
    ? `${(n / 1048576).toFixed(1)} MB`
    : `${Math.max(1, Math.round(n / 1024))} KB`;

export function PapersOnFile({ locationId }: { locationId: string }) {
  const [docs, setDocs] = useState<Doc[] | null>(null);

  useEffect(() => {
    let alive = true;
    void fetch(`/app/api/documents?location=${encodeURIComponent(locationId)}`, {
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d) setDocs(d.documents ?? []);
      });
    return () => {
      alive = false;
    };
  }, [locationId]);

  return (
    <Panel>
      <PanelHead
        title="Papers on file"
        hint="The lease and its amendments, as we hold them. This location's clause record is read from these."
      />
      <ul className="mt-4 space-y-1.5">
        {(docs ?? []).map((d) => (
          <li
            key={d.id}
            className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <FileText className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[0.8125rem] font-medium text-slate-800">
                  {d.filename}
                </span>
                <span className="block text-[0.6875rem] text-slate-400">
                  <span className="mr-1.5 rounded-md bg-slate-100 px-1.5 py-0.5 text-[0.625rem] font-bold uppercase text-slate-500">
                    {d.kind}
                  </span>
                  {fmtSize(d.byte_size)} ·{" "}
                  {new Date(d.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </span>
            </span>
            <a
              href={`/app/api/documents?id=${d.id}`}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 text-[0.75rem] font-semibold text-indigo-600 hover:text-indigo-800"
            >
              View
            </a>
          </li>
        ))}
        {docs !== null && docs.length === 0 && (
          <li className="rounded-xl border border-dashed border-slate-200 px-3 py-2.5 text-[0.75rem] text-slate-400">
            No papers digitized for this location yet. They arrive through
            onboarding and appear here the day they are filed.
          </li>
        )}
      </ul>
    </Panel>
  );
}
