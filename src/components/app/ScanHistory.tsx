import Link from "next/link";
import { Radar } from "lucide-react";
import { sweeps } from "@/lib/activity";
import { prettyDate } from "@/lib/clause";
import { Panel, PanelHead, Pill } from "./ui";
import { FiledScans } from "./FiledScans";

/**
 * The last scans, on the location itself.
 *
 * A client opening a location should see the watch running for THIS
 * door without hunting through the activity feed: when each pass ran,
 * what it read, and exactly what moved at this center — with the store
 * names, because "2 changes" without names is a claim, not a report.
 */
export function ScanHistory({
  centerName,
  centerRef,
}: {
  centerName: string;
  centerRef: string;
}) {
  const recent = sweeps.slice(0, 6).map((s) => ({
    ...s,
    mine: s.moved.filter((m) => m.center === centerName),
  }));

  return (
    <Panel>
      <PanelHead
        title="Scan history"
        hint="Every pass reads this center's published directory."
        right={
          <Link
            href="/app/activity"
            className="text-[0.75rem] font-semibold whitespace-nowrap text-indigo-600 hover:text-indigo-800"
          >
            All reports →
          </Link>
        }
      />
      <div className="mt-4">
        <FiledScans centerRef={centerRef} />
      </div>
      <ul className="divide-y divide-slate-100">
        {recent.map((s) => (
          <li key={s.id} className="py-3 first:pt-0 last:pb-0">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2.5">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    s.mine.length > 0
                      ? "bg-amber-50 text-amber-600"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  <Radar className="h-4 w-4" />
                </span>
                <span>
                  <span className="tnum block text-[0.8125rem] font-semibold text-slate-900">
                    {prettyDate(s.ranOn)}
                  </span>
                  <span className="tnum block text-[0.6875rem] text-slate-400">
                    {s.targetsChecked} stores read across the portfolio
                  </span>
                </span>
              </span>
              {s.mine.length > 0 ? (
                <Pill tone="watch" dot>
                  {s.mine.length} change{s.mine.length === 1 ? "" : "s"} here
                </Pill>
              ) : (
                <Pill tone="open" dot>
                  No change here
                </Pill>
              )}
            </div>
            {s.mine.length > 0 && (
              <ul className="mt-2 space-y-1 pl-[2.625rem]">
                {s.mine.map((m) => (
                  <li
                    key={`${s.id}-${m.store}`}
                    className="text-[0.75rem] leading-snug text-slate-600"
                  >
                    <span className="font-semibold text-slate-800">{m.store}</span>
                    {": "}
                    {m.from} <span className="text-slate-400">→</span> {m.to}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
