"use client";

import { useEffect, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { Pill } from "./ui";

/**
 * Passes the team has actually filed for this center from the scan
 * recorder — the live half of the scan history, above the standing
 * weekly sweeps.
 */

type Obs = {
  run_id: string;
  ran_at: string;
  run_stores: number;
  store_name: string;
  status: "open" | "closed" | "unclear";
  changed: boolean;
  note: string | null;
};

export function FiledScans({ centerRef }: { centerRef: string }) {
  const [obs, setObs] = useState<Obs[]>([]);

  useEffect(() => {
    let alive = true;
    void fetch(`/app/api/scans?center=${encodeURIComponent(centerRef)}`, {
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d) setObs(d.observations ?? []);
      });
    return () => {
      alive = false;
    };
  }, [centerRef]);

  if (obs.length === 0) return null;

  const runs = new Map<string, Obs[]>();
  for (const o of obs) runs.set(o.run_id, [...(runs.get(o.run_id) ?? []), o]);

  return (
    <ul className="mb-3 space-y-2 border-b border-slate-100 pb-3">
      {[...runs.values()].slice(0, 3).map((list) => {
        const changed = list.filter((o) => o.changed);
        return (
          <li key={list[0].run_id}>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <ClipboardCheck className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-[0.8125rem] font-semibold text-slate-900">
                    Filed pass ·{" "}
                    {new Date(list[0].ran_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span className="tnum block text-[0.6875rem] text-slate-400">
                    {list.length} watched store{list.length === 1 ? "" : "s"} checked
                    here
                  </span>
                </span>
              </span>
              {changed.length > 0 ? (
                <Pill tone="watch" dot>
                  {changed.length} change{changed.length === 1 ? "" : "s"}
                </Pill>
              ) : (
                <Pill tone="open" dot>
                  No change
                </Pill>
              )}
            </div>
            {changed.length > 0 && (
              <ul className="mt-1.5 space-y-1 pl-[2.625rem]">
                {changed.map((o) => (
                  <li
                    key={`${o.run_id}-${o.store_name}`}
                    className="text-[0.75rem] leading-snug text-slate-600"
                  >
                    <span className="font-semibold text-slate-800">{o.store_name}</span>
                    {": "}observed {o.status}
                    {o.note ? ` · ${o.note}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
