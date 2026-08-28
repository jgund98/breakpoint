import Link from "next/link";
import { CheckCircle2, FileSearch, Inbox } from "lucide-react";
import { Panel, PanelHead, Pill } from "./ui";

/**
 * The implementation tracker: papers received → record extracted →
 * approved by a person → live under watch, per location. The stages a
 * client actually worries about during ramp, with names, not a
 * percentage.
 */

type InFlight = { location_ref: string; stage: string; note: string | null };

const STAGE_LABEL: Record<string, string> = {
  received: "Papers received, awaiting extraction",
  extracted: "Extracted, awaiting human approval",
};

export function ImplementationTracker({
  locations,
  inFlight,
}: {
  locations: { id: string; centerName: string }[];
  inFlight: InFlight[];
}) {
  const flight = new Map(inFlight.map((p) => [p.location_ref, p]));
  const live = locations.filter((l) => !flight.has(l.id)).length;
  const pct = locations.length ? live / locations.length : 0;

  return (
    <Panel>
      <PanelHead
        title="Implementation"
        hint="Every location's road to live: papers in, record extracted, approved by a person, under watch."
        right={
          <Pill tone={live === locations.length ? "open" : "watch"} dot>
            {live} of {locations.length} live
          </Pill>
        }
      />

      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-[width] duration-700 ${
            pct >= 1 ? "bg-emerald-500" : "bg-amber-400"
          }`}
          style={{ width: `${pct * 100}%` }}
        />
      </div>

      {inFlight.length === 0 ? (
        <p className="mt-3 flex items-center gap-2 text-[0.8125rem] text-slate-500">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          Every location is live under watch. When a lease is amended, its
          record returns here until a person re-approves it.
        </p>
      ) : (
        <ul className="mt-4 space-y-1.5">
          {inFlight.map((p) => {
            const loc = locations.find((l) => l.id === p.location_ref);
            return (
              <li
                key={p.location_ref}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2.5"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                    {p.stage === "received" ? (
                      <Inbox className="h-4 w-4" />
                    ) : (
                      <FileSearch className="h-4 w-4" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <Link
                      href={`/app/locations/${p.location_ref}`}
                      className="block truncate text-[0.8125rem] font-semibold text-slate-900 hover:text-indigo-700"
                    >
                      {loc?.centerName ?? p.location_ref}
                    </Link>
                    <span className="block text-[0.6875rem] text-slate-500">
                      {STAGE_LABEL[p.stage] ?? p.stage}
                      {p.note ? ` · ${p.note}` : ""}
                    </span>
                  </span>
                </span>
                <Pill tone="watch" dot>
                  In review
                </Pill>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
