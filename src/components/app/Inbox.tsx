"use client";

/**
 * THE FLAG INBOX
 *
 * Alerts as an inbox: every flag is a dated row, newest first. A NEW
 * flag reads like an unread message — bold, dotted, tinted — and the
 * two actions on it are the lifecycle: Start review (acknowledged,
 * being worked) and Mark handled (done: the notice went out, or the
 * team decided to pass, on the record either way). A handled flag
 * leaves the queue but not the ledger. If the same location recovers
 * and trips again later, that is a NEW episode and a new dated flag —
 * the counter genuinely resets to zero in between.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Pill } from "@/components/app/ui";
import { Segmented } from "@/components/admin/ui";
import { prettyDate } from "@/lib/clause";

export type FlagRow = {
  id: number;
  location_ref: string;
  center_name: string;
  kind: "triggered" | "election_open" | "confirm_store";
  episode: string;
  headline: string;
  detail: string | null;
  flagged_on: string;
  status: "new" | "in_review" | "handled";
  actor: string | null;
  handled_at: string | null;
  created_at: string;
};

const KIND_PILL: Record<
  FlagRow["kind"],
  { label: string; tone: "brass" | "clay" | "watch" }
> = {
  triggered: { label: "Triggered", tone: "brass" },
  election_open: { label: "Election open", tone: "clay" },
  confirm_store: { label: "Confirm store", tone: "watch" },
};

const STATUS_LABEL: Record<FlagRow["status"], string> = {
  new: "New",
  in_review: "In review",
  handled: "Handled",
};

export function InboxList() {
  const router = useRouter();
  const [flags, setFlags] = useState<FlagRow[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [view, setView] = useState<"open" | "handled" | "all">("open");
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/app/api/findings");
      if (!r.ok) throw new Error();
      const d = await r.json();
      setFlags(d.flags);
      setCounts(d.counts ?? {});
      setError(null);
    } catch {
      setError("The inbox could not be loaded. Refresh to retry.");
      setFlags([]);
    }
  }, []);

  /* Live, not stale: the inbox re-pulls on a cadence while visible, so
     a flag that files while the page is open simply appears. */
  useEffect(() => {
    load();
    const t = setInterval(() => {
      if (document.visibilityState !== "hidden") load();
    }, 45_000);
    return () => clearInterval(t);
  }, [load]);

  const move = async (id: number, action: "start" | "handle" | "reopen") => {
    setBusy(id);
    try {
      const r = await fetch("/app/api/findings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      if (r.ok) await load();
    } finally {
      setBusy(null);
    }
  };

  const visible = (flags ?? []).filter((f) =>
    view === "all"
      ? true
      : view === "handled"
        ? f.status === "handled"
        : f.status !== "handled",
  );

  const openCount = (counts.new ?? 0) + (counts.in_review ?? 0);

  return (
    <div className="rounded-2xl border border-slate-200/60 bg-white shadow-xl shadow-slate-200/50">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-[0.9375rem] font-semibold text-slate-900">
            Flags
          </h2>
          <p className="mt-0.5 text-[0.75rem] text-slate-500">
            {counts.new ?? 0} new · {counts.in_review ?? 0} in review ·{" "}
            {counts.handled ?? 0} handled
          </p>
        </div>
        <Segmented
          value={view}
          onChange={(v) => setView(v as typeof view)}
          options={[
            { value: "open", label: "Open", count: openCount },
            { value: "handled", label: "Handled", count: counts.handled ?? 0 },
            { value: "all", label: "All" },
          ]}
        />
      </div>

      {flags === null ? (
        <div className="space-y-3 p-5 sm:p-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : error ? (
        <p className="px-5 py-6 text-[0.8125rem] text-slate-500 sm:px-6">
          {error}
        </p>
      ) : visible.length === 0 ? (
        <div className="px-5 py-10 text-center sm:px-6">
          <p className="text-[0.875rem] font-semibold text-slate-900">
            {view === "handled" ? "Nothing handled yet" : "Inbox zero"}
          </p>
          <p className="mx-auto mt-1 max-w-md text-[0.8125rem] text-slate-500">
            {view === "handled"
              ? "Flags you mark handled stay here on the record."
              : "No flags need action. New ones arrive here, dated, the moment a scan puts a location over a line."}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {visible.map((f) => {
            const isNew = f.status === "new";
            const kind = KIND_PILL[f.kind];
            return (
              <li
                key={f.id}
                className={`px-5 py-4 sm:px-6 ${isNew ? "bg-indigo-50/40" : ""}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {isNew && (
                        <span className="relative flex h-2 w-2 shrink-0">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-60" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-600" />
                        </span>
                      )}
                      <Link
                        href={`/app/locations/${f.location_ref}`}
                        className={`text-[0.875rem] text-slate-900 hover:text-indigo-700 ${
                          isNew ? "font-bold" : "font-semibold"
                        }`}
                      >
                        {f.center_name}
                      </Link>
                      <span className="text-[0.75rem] text-slate-400">
                        {f.location_ref}
                      </span>
                      <Pill tone={kind.tone} dot>
                        {kind.label}
                      </Pill>
                      {f.status === "in_review" && (
                        <Pill tone="petrol">In review</Pill>
                      )}
                    </div>
                    <p
                      className={`mt-1 text-[0.8125rem] text-slate-900 ${
                        isNew ? "font-semibold" : ""
                      }`}
                    >
                      {f.headline}
                    </p>
                    {f.detail && (
                      <p className="mt-0.5 text-[0.75rem] leading-relaxed text-slate-500">
                        {f.detail}
                      </p>
                    )}
                    <p className="tnum mt-1.5 text-[0.6875rem] text-slate-400">
                      Flagged {prettyDate(f.flagged_on.slice(0, 10))}
                      {f.status === "handled" && f.handled_at && (
                        <>
                          {" "}
                          · Handled{" "}
                          {prettyDate(f.handled_at.slice(0, 10))}
                          {f.actor ? ` by ${f.actor}` : ""}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {f.status === "new" && (
                      /* Starting a review IS opening the file: the flag
                         moves to "in review" and you land on the
                         location, where Theo's read and the next steps
                         are waiting. */
                      <button
                        onClick={() => {
                          void move(f.id, "start");
                          router.push(`/app/locations/${f.location_ref}`);
                        }}
                        disabled={busy === f.id}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 text-[0.8125rem] font-semibold whitespace-nowrap text-white shadow-md shadow-indigo-500/30 transition-all hover:bg-indigo-500 active:scale-95 disabled:opacity-50"
                      >
                        Review
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {f.status === "in_review" && (
                      <Link
                        href={`/app/locations/${f.location_ref}`}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 text-[0.8125rem] font-semibold whitespace-nowrap text-indigo-800 shadow-sm transition-all hover:bg-indigo-100 active:scale-95"
                      >
                        Open the file
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                    {f.status !== "handled" && (
                      <button
                        onClick={() => move(f.id, "handle")}
                        disabled={busy === f.id}
                        className="inline-flex h-9 items-center rounded-xl border border-slate-200 bg-white px-3.5 text-[0.8125rem] font-semibold whitespace-nowrap text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-95 disabled:opacity-50"
                      >
                        Mark handled
                      </button>
                    )}
                    {f.status === "handled" && (
                      <button
                        onClick={() => move(f.id, "reopen")}
                        disabled={busy === f.id}
                        className="text-[0.75rem] font-semibold text-indigo-700 hover:underline disabled:opacity-50"
                      >
                        Reopen
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
