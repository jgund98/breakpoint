"use client";

import { useMemo, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/cn";
import { Badge, Btn, Section, inputCls } from "@/components/admin/ui";
import type { LocationSnapshot } from "@/components/admin/OpsBoard";

/**
 * THE SCAN RECORDER
 *
 * The digital half of the printed sheet: work through the pass, mark
 * each watched store as seen, file it. The filed pass becomes rows —
 * the client's scan history reads it, a store observed closed raises
 * an alert, and monitoring stops being a claim and becomes a record.
 *
 * Defaults are the record's current state, so the operator only
 * touches what changed — at twenty stores or a thousand.
 */

type ObsStatus = "open" | "closed" | "unclear";

const DEFAULT_FOR: Record<string, ObsStatus> = {
  open: "open",
  seasonal: "open",
  remodeling: "unclear",
  dark: "closed",
  vacant: "closed",
  casualty: "closed",
};

export function ScanRecorder({
  orgSlug,
  locations,
  dueIds,
  onFiled,
}: {
  orgSlug: string;
  locations: LocationSnapshot[];
  dueIds: Set<string>;
  onFiled: () => void;
}) {
  const [recording, setRecording] = useState(false);
  const [scope, setScope] = useState<"due" | "all">("due");
  const [marks, setMarks] = useState<Map<string, ObsStatus>>(new Map());
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targets = useMemo(() => {
    const list =
      scope === "due" && dueIds.size > 0
        ? locations.filter((l) => dueIds.has(l.id))
        : locations;
    return list.filter((l) => l.watched.length > 0).slice(0, 60);
  }, [locations, dueIds, scope]);

  const key = (loc: string, store: string) => `${loc}::${store}`;
  const statusOf = (l: LocationSnapshot, w: { name: string; status: string }) =>
    marks.get(key(l.id, w.name)) ?? DEFAULT_FOR[w.status] ?? "unclear";

  const changedCount = targets.reduce(
    (n, l) =>
      n +
      l.watched.filter(
        (w) => statusOf(l, w) !== (DEFAULT_FOR[w.status] ?? "unclear"),
      ).length,
    0,
  );

  const file = async () => {
    setBusy(true);
    setError(null);
    const observations = targets.flatMap((l) =>
      l.watched.map((w) => ({
        locationRef: l.id,
        centerRef: l.centerRef,
        store: w.name,
        status: statusOf(l, w),
        changed: statusOf(l, w) !== (DEFAULT_FOR[w.status] ?? "unclear"),
      })),
    );
    const res = await fetch("/admin/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "scan_run_file",
        org: orgSlug,
        note: note.trim() || undefined,
        observations,
      }),
    });
    setBusy(false);
    if (res.ok) {
      setRecording(false);
      setMarks(new Map());
      setNote("");
      onFiled();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "The pass did not file.");
    }
  };

  return (
    <Section
      title="Record a scan pass"
      blurb="The digital scan sheet. Defaults are the record's current state; touch only what changed, then file it. A store observed closed alerts the client the moment the pass is filed."
      flush
      aside={
        !recording ? (
          <Btn onClick={() => setRecording(true)}>
            <ClipboardCheck className="h-4 w-4" /> Start a pass
          </Btn>
        ) : (
          <Badge tone={changedCount > 0 ? "amber" : "emerald"} dot>
            {changedCount} change{changedCount === 1 ? "" : "s"} marked
          </Badge>
        )
      }
    >
      {!recording ? (
        <p className="px-6 py-4 text-[0.8125rem] text-slate-500">
          Filed passes appear in the client&#8217;s scan history with your
          observations, store by store.
        </p>
      ) : (
        <div className="space-y-4 px-6 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl bg-slate-100 p-1">
              {(
                [
                  ["due", `Due today (${dueIds.size})`],
                  ["all", "All locations"],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setScope(v)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-[0.75rem] font-semibold transition-all",
                    scope === v
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Pass note, optional"
              className={cn(inputCls, "min-w-0 flex-1")}
            />
          </div>

          <ul className="space-y-3">
            {targets.map((l) => (
              <li key={l.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-[0.8125rem] font-semibold text-slate-900">
                  {l.centerName}
                  <span className="ml-1.5 font-normal text-slate-400">{l.id}</span>
                </p>
                <ul className="mt-2.5 space-y-1.5">
                  {l.watched.map((w) => {
                    const current = statusOf(l, w);
                    const changed =
                      current !== (DEFAULT_FOR[w.status] ?? "unclear");
                    return (
                      <li
                        key={w.name}
                        className="flex flex-wrap items-center justify-between gap-2"
                      >
                        <span className="text-[0.8125rem] text-slate-700">
                          {w.name}
                          {changed && (
                            <span className="ml-1.5 text-[0.6875rem] font-semibold text-amber-600">
                              changed
                            </span>
                          )}
                        </span>
                        <span className="flex rounded-lg bg-slate-100 p-0.5">
                          {(["open", "closed", "unclear"] as const).map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() =>
                                setMarks((p) =>
                                  new Map(p).set(key(l.id, w.name), s),
                                )
                              }
                              className={cn(
                                "rounded-md px-2.5 py-1 text-[0.6875rem] font-semibold capitalize transition-all",
                                current === s
                                  ? s === "closed"
                                    ? "bg-rose-600 text-white shadow-sm"
                                    : s === "unclear"
                                      ? "bg-amber-400 text-slate-900 shadow-sm"
                                      : "bg-white text-emerald-700 shadow-sm"
                                  : "text-slate-400 hover:text-slate-600",
                              )}
                            >
                              {s}
                            </button>
                          ))}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
            {targets.length === 0 && (
              <li className="rounded-xl border border-dashed border-slate-200 px-4 py-3 text-[0.8125rem] text-slate-400">
                Nothing in scope. Switch to all locations, or set the schedule.
              </li>
            )}
          </ul>

          <div className="flex flex-wrap items-center gap-2">
            <Btn disabled={busy || targets.length === 0} onClick={() => void file()}>
              {busy ? "Filing" : "File the pass"}
            </Btn>
            <Btn variant="ghost" onClick={() => setRecording(false)}>
              Cancel
            </Btn>
            {error && <span className="text-[0.75rem] text-rose-600">{error}</span>}
          </div>
        </div>
      )}
    </Section>
  );
}
