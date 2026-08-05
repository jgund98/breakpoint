import { LogoMark, LogoWord } from "@/components/brand/Logo";
import { cn } from "@/lib/cn";

/**
 * A rendering of the Breakpoint workspace — what a customer sees after
 * an evaluation lands. Static, hand-built, and clearly sample data; it
 * exists to make the product feel real, not to promise pixels.
 */

const rows = [
  { name: "Fairmount Collection", market: "Dublin, OH", occ: "67.8%", state: "trigger", amt: "$18,917/mo" },
  { name: "Kestrel Pointe", market: "Naperville, IL", occ: "71.2%", state: "watch", amt: "—" },
  { name: "Northgate Commons", market: "Plano, TX", occ: "92.4%", state: "ok", amt: "—" },
  { name: "Vermont Plaza", market: "Torrance, CA", occ: "88.1%", state: "ok", amt: "—" },
  { name: "Ashford Crossing", market: "Marietta, GA", occ: "71.4%", state: "cured", amt: "ended" },
];

const stateChip: Record<string, { label: string; cls: string }> = {
  trigger: { label: "Potential trigger", cls: "bg-brass-50 text-brass-700" },
  watch: { label: "Approaching floor", cls: "bg-clay-50 text-clay-700" },
  ok: { label: "Satisfied", cls: "bg-open-50 text-open-700" },
  cured: { label: "Cured", cls: "bg-surface-sunk text-muted" },
};

export function WorkspaceMock({ className }: { className?: string }) {
  return (
    <figure
      className={cn(
        "overflow-hidden rounded-xl border border-line bg-surface lift-lg",
        className,
      )}
      aria-label="Rendering of the Breakpoint workspace showing a portfolio of centers and an open evaluation"
    >
      {/* window chrome */}
      <div className="flex items-center gap-3 border-b border-line bg-surface-sunk/60 px-4 py-2.5">
        <span className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-line" />
          <span className="h-2.5 w-2.5 rounded-full bg-line" />
          <span className="h-2.5 w-2.5 rounded-full bg-line" />
        </span>
        <span className="mx-auto flex items-center gap-2 rounded-md bg-surface px-3 py-1 text-[0.6875rem] text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-open-600" />
          app.breakpoint.re/portfolio
        </span>
        <span className="label hidden text-faint sm:block">Sample data</span>
      </div>

      <div className="flex">
        {/* sidebar */}
        <div className="hidden w-44 shrink-0 flex-col gap-1 border-r border-line bg-surface-sunk/40 p-3 sm:flex">
          <span className="flex items-center gap-2 px-2 pb-3 pt-1 text-ink">
            <LogoMark className="h-4 w-4" />
            <LogoWord className="text-[0.9375rem]" />
          </span>
          {["Portfolio", "Triggers", "Evaluations", "Packages", "Leases"].map(
            (item, i) => (
              <span
                key={item}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-[0.8125rem]",
                  i === 0
                    ? "bg-petrol-800 font-medium text-cream"
                    : "text-ink-soft",
                )}
              >
                {item}
                {item === "Triggers" && (
                  <span className="ml-2 rounded-full bg-brass-500 px-1.5 text-[0.625rem] font-semibold text-petrol-950">
                    1
                  </span>
                )}
              </span>
            ),
          )}
        </div>

        {/* main pane */}
        <div className="min-w-0 flex-1 p-4 sm:p-5">
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-[0.9375rem] font-semibold text-ink">
              Portfolio · 214 centers
            </span>
            <span className="hidden text-[0.6875rem] text-muted sm:block">
              Updated as verified conditions change
            </span>
          </div>

          {/* table */}
          <div className="mt-3 overflow-hidden rounded-lg border border-line">
            <div className="hidden grid-cols-[1.4fr_0.6fr_1fr_0.8fr] gap-3 border-b border-line bg-surface-sunk/50 px-3 py-2 text-[0.625rem] font-semibold tracking-wide text-muted uppercase sm:grid">
              <span>Center</span>
              <span>Occupancy</span>
              <span>Co-tenancy status</span>
              <span className="text-right">Est. relief</span>
            </div>
            {rows.map((r) => (
              <div
                key={r.name}
                className={cn(
                  "grid grid-cols-[1.2fr_auto] items-center gap-3 border-b border-line px-3 py-2.5 last:border-b-0 sm:grid-cols-[1.4fr_0.6fr_1fr_0.8fr]",
                  r.state === "trigger" && "bg-brass-50/50",
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate text-[0.8125rem] font-medium text-ink">
                    {r.name}
                  </span>
                  <span className="block truncate text-[0.6875rem] text-muted">
                    {r.market}
                  </span>
                </span>
                <span className="tnum hidden text-[0.8125rem] text-ink-soft sm:block">
                  {r.occ}
                </span>
                <span>
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2 py-0.5 text-[0.6875rem] font-medium",
                      stateChip[r.state].cls,
                    )}
                  >
                    {stateChip[r.state].label}
                  </span>
                </span>
                <span
                  className={cn(
                    "tnum hidden text-right text-[0.8125rem] sm:block",
                    r.state === "trigger"
                      ? "font-semibold text-brass-700"
                      : "text-faint",
                  )}
                >
                  {r.amt}
                </span>
              </div>
            ))}
          </div>

          {/* open evaluation */}
          <div className="mt-3 rounded-lg border border-brass-200 bg-brass-50/60 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-[0.8125rem] font-semibold text-ink">
                <span className="anim-pulse-dot h-1.5 w-1.5 rounded-full bg-brass-500" />
                Fairmount Collection · store 4412
              </span>
              <span className="text-[0.6875rem] text-muted">
                Evaluation complete · Hour 46
              </span>
            </div>
            <p className="mt-1.5 text-[0.75rem] leading-relaxed text-ink-soft">
              §4.3(b) named inline and §4.3(c) occupancy tests appear to have
              failed. Estimated co-tenancy rent $18,917/mo, pending your review and
              written notice.
            </p>
            <div className="mt-2.5 flex flex-col gap-2 sm:flex-row">
              <span className="rounded-lg bg-petrol-800 px-3.5 py-2 text-center text-[0.75rem] font-medium whitespace-nowrap text-cream">
                Open review package
              </span>
              <span className="rounded-lg border border-line bg-surface px-3.5 py-2 text-center text-[0.75rem] font-medium whitespace-nowrap text-ink-soft">
                Share with counsel
              </span>
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}
