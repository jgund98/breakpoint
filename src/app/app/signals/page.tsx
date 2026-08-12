import Link from "next/link";
import { SOURCE_META, TIER_META, prettyDate, verificationOf } from "@/lib/clause";
import { rows, signalFeed } from "@/lib/portfolio";
import {
  Note,
  PageHead,
  Panel,
  PanelHead,
  Pill,
  Stat,
  type Tone,
} from "@/components/app/ui";

export default function SignalsPage() {
  const byMonth = new Map<string, typeof signalFeed>();
  for (const s of signalFeed) {
    const key = s.observedAt.slice(0, 7);
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key)!.push(s);
  }

  const pending = rows.filter((r) => {
    const v = verificationOf(r.evidence);
    return r.evaluation.anyFailing && v.tier !== "verified";
  });

  const primary = signalFeed.filter(
    (s) => SOURCE_META[s.source].tier === "primary",
  ).length;

  return (
    <div className="space-y-5">
      <PageHead
        eyebrow="Monitor"
        title="Signals"
        lede="Raw observations, before they become findings. Sources are labeled primary or secondary."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Observations logged", signalFeed.length, "petrol"],
          ["Primary evidence", primary, "open"],
          ["Awaiting verification", pending.length, "brass"],
        ].map(([l, v, c]) => (
          <Stat
            key={l as string}
            label={l as string}
            value={v as number}
            tone={c as Tone}
          />
        ))}
      </div>

      <Note tone="petrol" title="The evidence ladder">
        One secondary source is a signal. Two independent secondary sources
        corroborate and open a verification task. A primary source verifies, and
        only a verified finding can enter a notice package. A map listing never
        goes in front of a landlord on its own.
      </Note>

      {pending.length > 0 && (
        <Panel>
          <PanelHead
            title="Verification queue"
            hint="Failing tests that do not yet rest on primary evidence. A field visit has been requested for each."
          />
          <ul className="mt-4 divide-y divide-line">
            {pending.map((r) => {
              const v = verificationOf(r.evidence);
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-4 py-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/app/locations/${r.id}`}
                      className="text-[0.875rem] font-semibold text-ink hover:text-petrol-700"
                    >
                      {r.center.name}
                    </Link>
                    <p className="text-[0.75rem] text-muted">
                      {r.center.city}, {r.center.state} · {v.distinctSources}{" "}
                      distinct source{v.distinctSources === 1 ? "" : "s"}
                    </p>
                  </div>
                  <Pill tone={(v.tier === "corroborated" ? "watch" : "muted") as Tone}>
                    {TIER_META[v.tier].label}
                  </Pill>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}

      {[...byMonth.entries()].slice(0, 6).map(([month, items]) => (
        <Panel key={month} flush>
          <div className="border-b border-line px-5 py-3.5">
            <h2 className="text-[0.875rem] font-semibold text-ink">
              {new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              })}
            </h2>
          </div>
          <ul className="divide-y divide-line">
            {items.map((s) => {
              const meta = SOURCE_META[s.source];
              return (
                <li key={s.id} className="flex flex-wrap items-start gap-4 px-5 py-3.5">
                  <span
                    className={`mt-1 h-[14px] w-[14px] shrink-0 rounded-full border-2 ${
                      meta.tier === "primary"
                        ? "border-open-600 bg-open-50"
                        : "border-faint bg-surface"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2.5">
                      <p className="text-[0.875rem] font-semibold text-ink">
                        {s.unitName}
                      </p>
                      <Link
                        href={`/app/locations/${s.locationId}`}
                        className="text-[0.8125rem] text-petrol-700 hover:underline"
                      >
                        {s.centerName}
                      </Link>
                      <span className="text-[0.75rem] text-faint">{s.city}</span>
                    </div>
                    <p className="no-orphan mt-1 text-[0.8125rem] leading-relaxed text-ink-soft">
                      {s.statement}
                    </p>
                    <p className="mt-1 text-[0.75rem] text-muted">{meta.note}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <Pill tone={meta.tier === "primary" ? "open" : "muted"}>
                      {meta.label}
                    </Pill>
                    <p className="tnum mt-1.5 text-[0.75rem] text-faint">
                      {prettyDate(s.observedAt)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>
      ))}
    </div>
  );
}
