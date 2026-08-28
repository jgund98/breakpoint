"use client";

import { useState } from "react";
import { PageHeader } from "@/components/admin/Shell";
import { Badge, Btn, Card, Rise, EmptyNote, SearchInput } from "@/components/admin/ui";
import { useConsole, KIND_LABEL } from "@/components/admin/useConsole";

/**
 * Every request from every client's workspace, newest open first.
 * While the service is people, this queue IS the product's back half:
 * a request marked handled here is a promise kept.
 */
export function RequestsQueue() {
  const { data, post } = useConsole();
  const [query, setQuery] = useState("");

  if (!data) {
    return <p className="py-16 text-center text-[0.8125rem] text-slate-400">Loading.</p>;
  }

  const q = query.trim().toLowerCase();
  const shown = q
    ? data.requestsAll.filter((r) =>
        [r.org_name, r.center_name, r.store_name, r.location_ref, KIND_LABEL[r.kind]]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q),
      )
    : data.requestsAll;
  const open = data.requestsAll.filter((r) => !r.handled_at).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Requests"
        blurb="Everything clients have filed from their workspaces, across every account."
      />

      <Rise>
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
            <span className="flex items-center gap-3">
              <h2 className="text-[0.9375rem] font-semibold text-slate-900">Queue</h2>
              <Badge tone={open > 0 ? "amber" : "emerald"} dot>
                {open > 0 ? `${open} open` : "Clear"}
              </Badge>
            </span>
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Find a request…"
            />
          </div>
          {shown.length === 0 ? (
            <EmptyNote>Nothing filed yet.</EmptyNote>
          ) : (
            <ul className="divide-y divide-slate-100">
              {shown.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-start justify-between gap-3 px-6 py-4"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.8125rem] text-slate-800">
                      <span className="font-semibold">
                        {KIND_LABEL[r.kind] ?? r.kind}
                      </span>
                      {r.center_name ? ` · ${r.center_name}` : ""}
                      {r.store_name ? ` · ${r.store_name}` : ""}
                      {r.location_ref && (
                        <span className="ml-1.5 text-slate-400">{r.location_ref}</span>
                      )}
                    </span>
                    {r.body && (
                      <span className="mt-0.5 block text-[0.75rem] leading-snug text-slate-500">
                        {r.body}
                      </span>
                    )}
                    <span className="mt-0.5 block text-[0.6875rem] text-slate-400">
                      {r.org_name ?? r.org_slug}
                      {" · "}
                      {new Date(r.created_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                      {r.observed_on ? ` · observed ${r.observed_on.slice(0, 10)}` : ""}
                    </span>
                  </span>
                  {r.handled_at ? (
                    <Badge tone="emerald" dot>
                      Handled
                    </Badge>
                  ) : (
                    <Btn
                      variant="secondary"
                      onClick={() =>
                        void post({
                          action: "request_handled",
                          org: r.org_slug,
                          id: r.id,
                        })
                      }
                    >
                      Mark handled
                    </Btn>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </Rise>
    </div>
  );
}
