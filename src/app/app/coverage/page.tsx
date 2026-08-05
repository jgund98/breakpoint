import Link from "next/link";
import { CheckCircle2, FileText, Radar, ShieldAlert } from "lucide-react";
import {
  ENTITLEMENT_META,
  prettyDate,
  shortDate,
} from "@/lib/clause";
import {
  SOURCE_INFO,
  type SourceId,
  type Visibility,
  coverage,
} from "@/lib/coverage";
import {
  ActionButton,
  LinkButton,
  PageHead,
  Panel,
  PanelHead,
  Pill,
  type Tone,
} from "@/components/app/ui";

const VIS: Record<
  Visibility,
  { label: string; tone: Tone; Icon: React.ElementType; blurb: string }
> = {
  observable: {
    label: "Observable",
    tone: "open",
    Icon: CheckCircle2,
    blurb: "Named stores. Checked every sweep from multiple sources.",
  },
  entitled: {
    label: "Landlord reports",
    tone: "watch",
    Icon: FileText,
    blurb: "Not public. The lease obliges the landlord to report it on request.",
  },
  blind: {
    label: "No visibility",
    tone: "clay",
    Icon: ShieldAlert,
    blurb: "Not public and no reporting right. Treated as an estimate, never a finding.",
  },
};

export default function CoveragePage() {
  const c = coverage;
  const byStatus = c.targets.filter((t) => t.status !== "open");

  return (
    <div className="space-y-5">
      <PageHead
        eyebrow="Monitor"
        title="Coverage"
        lede="What is under watch, from which sources, and what the leases do not let us see."
        right={<LinkButton href="/app/signals">Signal feed</LinkButton>}
      />

      {/* ---- operations row ---- */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Stores watched", c.storesWatched.toLocaleString("en-US"), "Named in at least one clause"],
          ["Checks per sweep", c.checksPerSweep.toLocaleString("en-US"), "Source lookups, weekly"],
          ["Clause limbs observable", `${Math.round(c.observablePct * 100)}%`, `${c.counts.observable} of ${c.totalLimbs}`],
          ["Next sweep", shortDate(c.nextSweepISO), "Runs automatically"],
        ].map(([k, v, hint], i) => (
          <div
            key={k as string}
            className={`card-enter d-${i + 1} rounded-2xl border border-line bg-surface p-4`}
          >
            <p className="text-[0.75rem] text-muted">{k as string}</p>
            <p className="tnum font-display mt-1.5 text-[1.5rem] leading-none text-ink">
              {v as string}
            </p>
            <p className="mt-1 text-[0.75rem] text-faint">{hint as string}</p>
          </div>
        ))}
      </div>

      {/* ---- visibility split ---- */}
      <Panel className="card-enter d-2">
        <PanelHead
          title="What we can see"
          hint="Every test in every clause, graded by whether it can be evidenced."
        />
        <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-surface-sunk">
          {(["observable", "entitled", "blind"] as Visibility[]).map((v) => {
            const n = c.counts[v];
            if (!n) return null;
            const bg =
              v === "observable"
                ? "bg-open-600"
                : v === "entitled"
                  ? "bg-brass-500"
                  : "bg-clay-500";
            return (
              <div
                key={v}
                className={`bar-fill h-full ${bg}`}
                style={{ width: `${(n / c.totalLimbs) * 100}%` }}
                title={`${VIS[v].label}: ${n}`}
              />
            );
          })}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {(["observable", "entitled", "blind"] as Visibility[]).map((v) => {
            const meta = VIS[v];
            return (
              <div key={v} className="rounded-xl border border-line bg-surface-sunk p-3.5">
                <div className="flex items-center gap-2">
                  <meta.Icon className="h-3.5 w-3.5 text-muted" />
                  <span className="text-[0.8125rem] font-semibold text-ink">
                    {meta.label}
                  </span>
                  <span className="tnum ml-auto text-[0.8125rem] font-semibold text-ink">
                    {c.counts[v]}
                  </span>
                </div>
                <p className="mt-1.5 text-[0.75rem] leading-snug text-muted">
                  {meta.blurb}
                </p>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* ---- entitlements ---- */}
      <Panel flush className="card-enter d-3">
        <div className="px-5 pt-5">
          <PanelHead
            title="Reporting rights"
            hint="Where a lease obliges the landlord to hand over the number we cannot compute."
          />
        </div>
        {c.entitlements.length === 0 ? (
          <p className="px-5 py-10 text-center text-[0.8125rem] text-muted">
            No reporting rights extracted yet.
          </p>
        ) : (
          <>
            {/* Grouped, because forty rows reading "available now" is
                noise. The action is a batch, so the summary is the
                control and the table below is only the exceptions. */}
            <div className="mt-4 grid gap-3 px-5 sm:grid-cols-3">
              {(
                [
                  ["available", "Available to send", "brass"],
                  ["awaiting_response", "Awaiting landlord", "watch"],
                  ["cooling_down", "Used this year", "muted"],
                ] as const
              ).map(([state, label, tone]) => {
                const group = c.entitlements.filter((e) => e.state === state);
                const kinds = new Set(group.map((e) => e.entitlement.kind));
                return (
                  <div
                    key={state}
                    className="rounded-xl border border-line bg-surface-sunk p-4"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[0.8125rem] font-medium text-ink">
                        {label}
                      </span>
                      <span className="tnum font-display text-[1.25rem] leading-none text-ink">
                        {group.length}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[0.75rem] leading-snug text-muted">
                      {group.length === 0
                        ? "None."
                        : [...kinds]
                            .map((k) => ENTITLEMENT_META[k].label)
                            .join(", ")}
                    </p>
                    {state === "available" && group.length > 0 && (
                      <ActionButton
                        variant="brass"
                        className="mt-3 w-full px-3 py-2"
                      >
                        Draft {group.length} requests
                      </ActionButton>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="mt-4 border-t border-line px-5 pt-3 text-[0.75rem] text-muted">
              Requests are drafted for your signatory, batched by landlord.
              Exercising these is how the occupancy tests below become
              evidenced rather than estimated.
            </p>
          </>
        )}
      </Panel>

      {/* ---- watch targets ---- */}
      <Panel flush className="card-enter d-4">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
          <PanelHead
            title="Watch list"
            hint="One row per store a clause depends on. This is the unit we actually monitor."
          />
          <Pill tone="muted">
            {byStatus.length} not trading
          </Pill>
        </div>
        <div className="mt-4 max-h-[560px] overflow-auto">
          <table className="w-full min-w-[880px] border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-surface-sunk">
              <tr>
                {["Store", "Center", "Depended on by", "Sources", "Agreement", "Last check", "Status"].map(
                  (h) => (
                    <th key={h} className="label px-4 py-2.5 font-semibold text-faint">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {c.targets.slice(0, 80).map((t) => (
                <tr key={t.id} className="hover:bg-petrol-50/40">
                  <td className="px-4 py-2.5">
                    <p className="text-[0.875rem] font-medium text-ink">{t.name}</p>
                    <p className="text-[0.75rem] text-faint capitalize">{t.kind}</p>
                  </td>
                  <td className="px-4 py-2.5">
                    <p className="text-[0.8125rem] text-ink-soft">{t.centerName}</p>
                    <p className="text-[0.75rem] text-faint">{t.city}</p>
                  </td>
                  <td className="tnum px-4 py-2.5 text-[0.8125rem] text-ink-soft">
                    {t.dependents.length} lease{t.dependents.length === 1 ? "" : "s"}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {t.sources.map((s) => (
                        <span
                          key={s}
                          title={`${SOURCE_INFO[s as SourceId].label}: ${SOURCE_INFO[s as SourceId].covers}`}
                          className="rounded bg-surface-sunk px-1.5 py-0.5 text-[0.6875rem] text-muted"
                        >
                          {SOURCE_INFO[s as SourceId].label}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="tnum px-4 py-2.5 text-[0.8125rem] text-ink-soft">
                    {t.agreement} of {t.sources.length}
                  </td>
                  <td className="tnum px-4 py-2.5 text-[0.8125rem] text-muted">
                    {shortDate(t.lastCheckedISO)}
                  </td>
                  <td className="px-4 py-2.5">
                    <Pill
                      tone={
                        t.status === "open"
                          ? "open"
                          : t.status === "dark"
                            ? "clay"
                            : "watch"
                      }
                      dot
                    >
                      {t.status === "open" ? "Trading" : t.status}
                    </Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {c.targets.length > 80 && (
          <p className="border-t border-line px-5 py-3 text-[0.75rem] text-muted">
            Showing 80 of {c.targets.length}.
          </p>
        )}
      </Panel>

      {/* ---- sources ---- */}
      <Panel className="card-enter d-5">
        <PanelHead
          title="Sources"
          hint="What each feed covers and where it stops. A finding never rests on one secondary source."
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(SOURCE_INFO) as SourceId[]).map((id) => {
            const s = SOURCE_INFO[id];
            return (
              <div key={id} className="rounded-xl border border-line bg-surface-sunk p-3.5">
                <div className="flex items-center gap-2">
                  <Radar className="h-3.5 w-3.5 text-muted" />
                  <span className="text-[0.8125rem] font-semibold text-ink">
                    {s.label}
                  </span>
                  <Pill
                    tone={s.weight === "primary" ? "open" : "muted"}
                    className="ml-auto"
                  >
                    {s.weight}
                  </Pill>
                </div>
                <p className="mt-1.5 text-[0.75rem] leading-snug text-ink-soft">
                  {s.covers}
                </p>
                {s.caveat && (
                  <p className="mt-1 text-[0.75rem] leading-snug text-muted">
                    {s.caveat}
                  </p>
                )}
                <p className="mt-1.5 text-[0.6875rem] text-faint">{s.cadence}</p>
              </div>
            );
          })}
        </div>
      </Panel>

      <p className="rounded-xl border border-line bg-surface-sunk p-4 text-[0.75rem] leading-relaxed text-muted">
        Coverage is stated, not assumed. Where a test cannot be evidenced we say
        so on the location rather than publishing a number we cannot stand
        behind. Next full sweep {prettyDate(coverage.nextSweepISO)}.
        Illustrative sample data.
      </p>
    </div>
  );
}
