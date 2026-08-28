"use client";

import { useMemo, useState } from "react";
import { ClipboardList, MessageSquareDot, Radar, ShieldQuestion } from "lucide-react";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/admin/Shell";
import {
  Badge,
  Btn,
  Card,
  Rise,
  EmptyNote,
  SearchInput,
  Segmented,
} from "@/components/admin/ui";
import { useConsole, KIND_LABEL } from "@/components/admin/useConsole";

/**
 * Every request from every client's workspace, newest open first.
 * While the service is people, this queue IS the product's back half:
 * a request marked handled here is a promise kept.
 */

const KIND_ICON: Record<string, React.ReactNode> = {
  manual_scan: <Radar className="h-4 w-4" />,
  closure_report: <ClipboardList className="h-4 w-4" />,
  estoppel_review: <ShieldQuestion className="h-4 w-4" />,
};

type Filter = "all" | "open" | "handled";

export function RequestsQueue() {
  const { data, post } = useConsole();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(() => {
    const all = data?.requestsAll ?? [];
    return {
      all: all.length,
      open: all.filter((r) => !r.handled_at).length,
      handled: all.filter((r) => r.handled_at).length,
    };
  }, [data]);

  if (!data) {
    return <p className="py-16 text-center text-[0.8125rem] text-slate-400">Loading.</p>;
  }

  const q = query.trim().toLowerCase();
  const shown = data.requestsAll
    .filter((r) =>
      filter === "all" ? true : filter === "open" ? !r.handled_at : Boolean(r.handled_at),
    )
    .filter((r) =>
      q
        ? [r.org_name, r.center_name, r.store_name, r.location_ref, KIND_LABEL[r.kind]]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(q)
        : true,
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Requests"
        blurb="Everything clients have filed from their workspaces, across every account."
        aside={
          <>
            {data.avgHandleSeconds !== null && (
              <Badge tone="slate">
                Median response {(data.avgHandleSeconds / 3600).toFixed(1)}h
              </Badge>
            )}
            <Badge tone={counts.open > 0 ? "amber" : "emerald"} dot>
              {counts.open > 0 ? `${counts.open} open` : "Clear"}
            </Badge>
          </>
        }
      />

      <Rise>
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
            <Segmented<Filter>
              className="w-fit min-w-72"
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: "All", count: counts.all },
                { value: "open", label: "Open", count: counts.open },
                { value: "handled", label: "Handled", count: counts.handled },
              ]}
            />
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Find a request…"
            />
          </div>
          {shown.length === 0 ? (
            <EmptyNote>
              {counts.all === 0
                ? "Nothing filed yet. Client requests land here the moment they are made."
                : "Nothing matches."}
            </EmptyNote>
          ) : (
            <ul className="divide-y divide-slate-100">
              {shown.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-start justify-between gap-3 px-6 py-4"
                >
                  <span className="flex min-w-0 flex-1 items-start gap-3">
                    <span
                      className={cn(
                        "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                        r.handled_at
                          ? "bg-slate-100 text-slate-400"
                          : "bg-indigo-50 text-indigo-600",
                      )}
                    >
                      {KIND_ICON[r.kind] ?? <MessageSquareDot className="h-4 w-4" />}
                    </span>
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
