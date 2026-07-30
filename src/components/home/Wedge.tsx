import { Section, Eyebrow, SectionTitle, Lede } from "@/components/ui/Section";
import { coexistsWith } from "@/lib/site";

const theyKnow = [
  "What your lease says",
  "Which clause sits in which document",
  "Critical dates and option windows",
  "ASC 842 and IFRS 16 schedules",
  "The co-tenancy provision, stored as a field",
];

const weKnow = [
  "Which named tenants are trading, and the date each went dark",
  "Occupied GLA, assembled month by month",
  "Whether the landlord's cure window has run",
  "The estimated value of a failure against your own sales",
  "The evidence behind every one of those answers",
];

export function Wedge() {
  return (
    <Section tone="sunk" grid>
      <div className="max-w-3xl">
        <Eyebrow>Why this isn&#8217;t a feature</Eyebrow>
        <SectionTitle>
          Your lease platform holds half the problem.{" "}
          <span className="display-em text-petrol-700">
            It was never built for the other half.
          </span>
        </SectionTitle>
        <Lede>
          Most lease suites will tell you they track co&#8209;tenancy. What
          they typically track is the clause — a field in a record, entered
          once. The trigger lives outside the document, in a center that
          changes every week, and traditional lease systems were never pointed
          at it.
        </Lede>
      </div>

      <div className="mt-14 grid gap-5 lg:grid-cols-2 lg:gap-6">
        {/* what they hold */}
        <div className="rounded-xl border border-line bg-surface p-7 sm:p-9">
          <span className="label text-muted">Your lease system knows</span>
          <ul className="mt-6 space-y-4">
            {theyKnow.map((t) => (
              <li key={t} className="flex gap-3.5 text-[1.0625rem] text-ink-soft">
                <span className="mt-2.5 h-px w-4 shrink-0 bg-muted" />
                <span className="no-orphan">{t}</span>
              </li>
            ))}
          </ul>
          <p className="mt-8 border-t border-line pt-5 text-sm leading-relaxed text-muted">
            All of it necessary. None of it is designed to tell you the day a
            test may have failed.
          </p>
        </div>

        {/* what we add */}
        <div className="relative overflow-hidden rounded-xl bg-petrol-800 p-7 text-cream sm:p-9">
          <div className="plan-grid-dark absolute inset-0 opacity-50" />
          <div className="relative">
            <span className="label text-brass-400">Breakpoint also knows</span>
            <ul className="mt-6 space-y-4">
              {weKnow.map((t) => (
                <li key={t} className="flex gap-3.5 text-[1.0625rem] text-cream">
                  <span className="mt-2.5 h-px w-4 shrink-0 bg-brass-500" />
                  <span className="no-orphan">{t}</span>
                </li>
              ))}
            </ul>
            <p className="mt-8 border-t border-white/15 pt-5 text-sm leading-relaxed text-cream-soft">
              Assembled from your own store data, closure signals, filings,
              permit activity, property research and field verification — and
              layered on top of what you already run, not replacing it.
            </p>
          </div>
        </div>
      </div>

      {/* coexistence */}
      <div className="mt-10 flex flex-col gap-4 rounded-xl border border-line bg-surface px-6 py-5 sm:flex-row sm:items-center sm:gap-6">
        <span className="label shrink-0 text-muted">Runs alongside</span>
        <ul className="flex flex-wrap gap-x-5 gap-y-2">
          {coexistsWith.map((name) => (
            <li key={name} className="text-[0.9375rem] font-medium text-ink-soft">
              {name}
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-3 text-xs text-muted">
        Named as the systems Breakpoint is built to sit on top of. Not a claim of
        partnership, certification or endorsement by any of them.
      </p>
    </Section>
  );
}
