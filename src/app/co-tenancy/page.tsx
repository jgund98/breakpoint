import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { GuideToc } from "@/components/chrome/GuideToc";
import { PageHero } from "@/components/chrome/PageHero";
import { Section, Eyebrow, SectionTitle } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { clauseText } from "@/lib/center";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "The Co-Tenancy Field Guide — clauses, triggers and remedies",
  description:
    "How retail co-tenancy clauses actually work: opening vs ongoing co-tenancy, named tenant and occupancy tests, cure periods, alternative rent, and why violations go unclaimed.",
  alternates: { canonical: "/co-tenancy" },
};

const toc = [
  { id: "what", label: "What co-tenancy is" },
  { id: "opening", label: "Opening co-tenancy" },
  { id: "ongoing", label: "Ongoing co-tenancy" },
  { id: "anatomy", label: "Anatomy of a clause" },
  { id: "remedies", label: "Remedies" },
  { id: "cure", label: "Cure periods" },
  { id: "missed", label: "Why it goes unclaimed" },
  { id: "glossary", label: "Glossary" },
];

const faqs = [
  {
    q: "What is a co-tenancy clause in a retail lease?",
    a: "A co-tenancy clause conditions a tenant's rent obligation on the shopping center remaining occupied. If named anchor or inline tenants close, or if occupancy falls below an agreed percentage, the tenant becomes entitled to a negotiated remedy — most commonly reduced or alternative rent, and sometimes a right to terminate.",
  },
  {
    q: "What is the difference between opening and ongoing co-tenancy?",
    a: "Opening co-tenancy applies at the start of the lease: the tenant can delay opening, or open at reduced rent, if the center has not reached an agreed occupancy level by the commencement date. Ongoing (or operating) co-tenancy applies through the term, giving relief if occupancy later falls below the threshold.",
  },
  {
    q: "What occupancy threshold triggers co-tenancy?",
    a: "There is no standard figure — it is negotiated lease by lease. Thresholds are commonly expressed as a percentage of gross leasable area, frequently excluding anchor premises from the denominator. Many clauses combine an occupancy test with a separate requirement that specific named tenants remain open and operating.",
  },
  {
    q: "What is alternative rent?",
    a: "Alternative rent is the substitute rent a tenant pays while a co-tenancy failure continues. It is often expressed as the lesser of minimum rent or a stated percentage of gross sales, which converts a fixed cost into a variable one for as long as the condition lasts.",
  },
  {
    q: "Does co-tenancy relief apply retroactively?",
    a: "Usually not. Many clauses provide that the remedy commences on the first day of the month following written notice from the tenant. Where that is the case, months that pass before the tenant notices and serves notice are generally not recoverable — which is why detection speed matters more than almost anything else.",
  },
  {
    q: "Can a landlord cure a co-tenancy failure?",
    a: "Frequently, yes. Many clauses give the landlord a defined cure period in which to replace the departed tenant, often with a requirement that the replacement be a suitable tenant of comparable use or quality. Only if the cure period runs without a qualifying replacement does the remedy become available.",
  },
];

function G({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-line py-5">
      <dt className="text-[1.0625rem] font-semibold text-petrol-800">{term}</dt>
      <dd className="no-orphan balance mt-2 text-[0.9375rem] leading-relaxed text-ink-soft">
        {children}
      </dd>
    </div>
  );
}

export default function CoTenancyPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: site.url },
      {
        "@type": "ListItem",
        position: 2,
        name: "The Co-Tenancy Field Guide",
        item: `${site.url}/co-tenancy`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <PageHero
        eyebrow="Field guide"
        title="Co-tenancy,"
        accent="explained properly."
        lede={
          <>
            The clause is deliberately dense, and that density is where the money
            hides. This is a working explanation of how retail co&#8209;tenancy
            provisions are built, what actually trips them, and what they pay.
          </>
        }
        photo="/photos/mall-portland-skylight.jpg"
        photoAlt="Interior of an enclosed shopping center with a skylit roof"
      />

      <Section tone="canvas">
        <div className="grid gap-12 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16">
          {/* TOC */}
          <nav aria-label="Contents" className="lg:sticky lg:top-28 lg:self-start">
            <span className="label hidden text-muted lg:block">Contents</span>
            <GuideToc items={toc} />
            <div className="relative mt-8 overflow-hidden rounded-xl bg-petrol-800 p-5 text-cream">
              <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-brass-500/20 blur-2xl" />
              <p className="label relative text-brass-400">Your lease, read properly</p>
              <p className="no-orphan relative mt-2.5 text-sm leading-relaxed text-cream-soft">
                Send one lease — the co&#8209;tenancy language comes back
                abstracted, cited and evaluated inside 48&nbsp;hours.
              </p>
              <Link
                href="/demo"
                className="relative mt-4 flex w-full items-center justify-center rounded-full bg-brass-500 px-4 py-2.5 text-[0.8125rem] font-semibold whitespace-nowrap text-petrol-950 transition-colors hover:bg-brass-400"
              >
                Start your evaluation
              </Link>
            </div>
          </nav>

          {/* body */}
          <div className="max-w-[46rem]">
            <article className="space-y-16">
              <section id="what" className="scroll-mt-28">
                <h2 className="text-[clamp(1.6rem,3.2vw,2.25rem)]">
                  What co-tenancy is
                </h2>
                <p className="lede no-orphan mt-5 text-ink-soft">
                  A retail tenant does not sign a lease for four walls. It signs
                  for the traffic the rest of the center generates. Co&#8209;tenancy
                  is the clause that makes that bargain enforceable: if the
                  center stops delivering the environment the tenant paid for,
                  the rent changes.
                </p>
                <p className="no-orphan balance mt-5 text-[1.0625rem] leading-relaxed text-ink-soft">
                  It is the most economically significant clause most inline
                  retailers hold, because rent is their largest fixed cost and
                  co&#8209;tenancy is the only mechanism that makes it move
                  without a renegotiation.
                </p>
              </section>

              <section id="opening" className="scroll-mt-28">
                <h2 className="text-[clamp(1.6rem,3.2vw,2.25rem)]">
                  Opening co-tenancy
                </h2>
                <p className="no-orphan balance mt-5 text-[1.0625rem] leading-relaxed text-ink-soft">
                  Opening co&#8209;tenancy governs the start of the lease. It
                  typically allows the tenant to delay opening — and delay paying
                  rent — until the center reaches an agreed occupancy level, or
                  until specified anchors are open and trading.
                </p>
                <p className="no-orphan balance mt-5 text-[1.0625rem] leading-relaxed text-ink-soft">
                  In a new or repositioned center this produces the standoff the
                  industry knows well: several tenants each waiting on the others
                  before committing to open, with nobody willing to move first.
                  Developers usually break it by granting reduced rent for an
                  opening period rather than letting the space sit dark.
                </p>
              </section>

              <section id="ongoing" className="scroll-mt-28">
                <h2 className="text-[clamp(1.6rem,3.2vw,2.25rem)]">
                  Ongoing co-tenancy
                </h2>
                <p className="no-orphan balance mt-5 text-[1.0625rem] leading-relaxed text-ink-soft">
                  Ongoing — sometimes operating — co&#8209;tenancy runs through
                  the term, and it is where the great majority of unclaimed money
                  sits. It holds the landlord to a standard for the life of the
                  lease: keep the named tenants trading and occupancy above the
                  floor, or the rent changes.
                </p>
                <div className="mt-7 rounded-xl border border-brass-200 bg-brass-50 p-6">
                  <span className="label text-brass-700">The asymmetry</span>
                  <p className="no-orphan mt-3 text-[1.0625rem] leading-relaxed text-ink-soft">
                    Opening co&#8209;tenancy has an obvious date attached, so
                    somebody is always watching it. Ongoing co&#8209;tenancy has
                    no date. It can trip in any month of a ten-year term, which
                    means it is watched by nobody in particular.
                  </p>
                </div>
              </section>

              <section id="anatomy" className="scroll-mt-28">
                <h2 className="text-[clamp(1.6rem,3.2vw,2.25rem)]">
                  Anatomy of a clause
                </h2>
                <p className="no-orphan balance mt-5 text-[1.0625rem] leading-relaxed text-ink-soft">
                  Nearly every ongoing provision is assembled from the same five
                  parts. Read in that order, a clause that looks impenetrable
                  resolves into something you can test.
                </p>

                <ol className="mt-7 space-y-5">
                  {[
                    ["The condition", "What must remain true — named tenants open, or occupancy above a percentage, or both."],
                    ["The measurement", "How occupancy is counted. Almost always by gross leasable area, and very often excluding anchor premises from the denominator."],
                    ["The cure", "How long the landlord has to fix it, and what counts as a suitable replacement tenant."],
                    ["The remedy", "What the tenant pays instead — a reduced fixed rent, or a percentage of gross sales."],
                    ["The commencement", "When the remedy starts. This is the sentence that decides whether detection speed matters, and it usually says: the month after written notice."],
                  ].map(([k, v], i) => (
                    <li key={k} className="flex gap-5">
                      <span className="font-display text-lg leading-none text-brass-500">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <h3 className="text-[1.0625rem] font-semibold text-ink">{k}</h3>
                        <p className="no-orphan mt-1.5 text-[0.9375rem] leading-relaxed text-ink-soft">
                          {v}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>

                <figure className="mt-9">
                  <figcaption className="label text-muted">
                    A representative clause
                  </figcaption>
                  <blockquote className="mt-3 rounded-xl border border-line bg-surface p-6 text-[0.9375rem] leading-[1.85] text-ink-soft">
                    {clauseText}
                  </blockquote>
                  <p className="mt-3 text-xs text-muted">
                    Composed for illustration from common market terms. It is not
                    taken from any executed lease.
                  </p>
                </figure>
              </section>

              <section id="remedies" className="scroll-mt-28">
                <h2 className="text-[clamp(1.6rem,3.2vw,2.25rem)]">Remedies</h2>
                <p className="no-orphan balance mt-5 text-[1.0625rem] leading-relaxed text-ink-soft">
                  Three remedies appear repeatedly, and a clause may combine
                  them in sequence — relief first, exit later.
                </p>
                <div className="mt-7 space-y-4">
                  {[
                    ["Alternative rent", "The tenant pays a substitute rent while the failure continues — commonly the lesser of minimum rent or a percentage of gross sales. This converts a fixed cost into a variable one and is by far the most common remedy."],
                    ["Abatement", "A straight reduction in fixed rent, expressed as a percentage or a stated amount. Simpler to administer, less responsive to how badly trade is actually affected."],
                    ["Termination", "A right to exit, usually only after the condition has persisted for a defined run of months and on notice. Rare to exercise, valuable to hold."],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-xl border border-line bg-surface p-6">
                      <h3 className="text-[1.0625rem] font-semibold text-petrol-800">{k}</h3>
                      <p className="no-orphan balance mt-2 text-[0.9375rem] leading-relaxed text-ink-soft">
                        {v}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <section id="cure" className="scroll-mt-28">
                <h2 className="text-[clamp(1.6rem,3.2vw,2.25rem)]">Cure periods</h2>
                <p className="no-orphan balance mt-5 text-[1.0625rem] leading-relaxed text-ink-soft">
                  A landlord will normally negotiate a window to replace a
                  departed tenant before any remedy bites. The detail that
                  matters is what qualifies as a replacement: without a
                  definition, a landlord can backfill a former apparel anchor
                  with a use that generates none of the traffic the clause was
                  written to&nbsp;protect.
                </p>
                <p className="no-orphan balance mt-5 text-[1.0625rem] leading-relaxed text-ink-soft">
                  Well-drafted clauses therefore define a suitable replacement by
                  use, quality and sometimes size. Note also that cure periods
                  frequently differ between tests inside the same clause — a
                  named-tenant failure may be claimable immediately while an
                  occupancy failure carries a grace period.
                </p>
              </section>

              <section id="missed" className="scroll-mt-28">
                <h2 className="text-[clamp(1.6rem,3.2vw,2.25rem)]">
                  Why it goes unclaimed
                </h2>
                <p className="no-orphan balance mt-5 text-[1.0625rem] leading-relaxed text-ink-soft">
                  Not through negligence. Through structure. The clause lives in
                  a document; the trigger lives in a building three states away
                  that changes every week. Nothing in a standard lease
                  administration stack connects the two.
                </p>
                <figure className="mt-7 border-l-2 border-brass-500 pl-6">
                  <blockquote className="font-display text-[1.375rem] leading-snug text-ink italic">
                    &#8220;Identification of a co&#8209;tenancy violation is often
                    a difficult undertaking since it is incumbent upon store staff
                    and regional management to note closures and keep the
                    corporate office informed.&#8221;
                  </blockquote>
                  <figcaption className="mt-3 text-sm text-muted">
                    Tango Analytics,{" "}
                    <cite className="not-italic">
                      The Retailer&#8217;s Guide to Co-Tenancy
                    </cite>
                  </figcaption>
                </figure>
                <p className="no-orphan balance mt-6 text-[1.0625rem] leading-relaxed text-ink-soft">
                  Add the commencement rule — relief running from notice rather
                  than from failure — and the cost of the gap compounds every
                  month it stays open.
                </p>
              </section>

              <section id="glossary" className="scroll-mt-28">
                <h2 className="text-[clamp(1.6rem,3.2vw,2.25rem)]">Glossary</h2>
                <dl className="mt-6">
                  <G term="Anchor">
                    A large tenant that drives traffic to the whole center —
                    typically a department store, big-box retailer or grocer.
                    Anchor premises are frequently excluded from the occupancy
                    denominator.
                  </G>
                  <G term="Named tenant">
                    A specific retailer identified in the lease whose continued
                    trading the tenant has bargained for. Modern leases name
                    inline brands as often as anchors.
                  </G>
                  <G term="Gross leasable area (GLA)">
                    Floor area available to be leased to tenants. The usual basis
                    for measuring occupancy in a co-tenancy test.
                  </G>
                  <G term="Going dark">
                    A tenant ceasing to trade from its premises, whether or not
                    it continues to pay rent. A dark unit is normally not
                    &#8220;open and operating&#8221; for co-tenancy purposes.
                  </G>
                  <G term="Alternative rent">
                    Substitute rent payable while a co-tenancy failure continues,
                    commonly the lesser of minimum rent or a percentage of gross
                    sales.
                  </G>
                  <G term="Natural breakpoint">
                    The sales level at which percentage rent begins, calculated
                    by dividing minimum rent by the percentage rate. Related
                    machinery, and the origin of this company&#8217;s name.
                  </G>
                  <G term="Occupancy cost">
                    Total rent as a percentage of a store&#8217;s gross sales.
                    The ratio retailers manage to, and the one co-tenancy relief
                    moves.
                  </G>
                  <G term="Recapture">
                    A landlord&#8217;s right to take back space, often used
                    during repositioning — and a common route to the occupancy
                    decline that trips co-tenancy elsewhere in the center.
                  </G>
                </dl>
              </section>

              {/* FAQ */}
              <section className="scroll-mt-28">
                <h2 className="text-[clamp(1.6rem,3.2vw,2.25rem)]">
                  Common questions
                </h2>
                <div className="mt-6 space-y-3">
                  {faqs.map((f) => (
                    <details
                      key={f.q}
                      className="group rounded-xl border border-line bg-surface px-6 py-5"
                    >
                      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-[1.0625rem] font-semibold text-ink">
                        {f.q}
                        <span className="mt-1 shrink-0 text-petrol-600 transition-transform duration-300 group-open:rotate-45">
                          +
                        </span>
                      </summary>
                      <p className="no-orphan mt-3 text-[0.9375rem] leading-relaxed text-ink-soft">
                        {f.a}
                      </p>
                    </details>
                  ))}
                </div>
              </section>

              <p className="rounded-xl border border-line bg-surface-sunk p-6 text-sm leading-relaxed text-muted">
                This guide describes how co&#8209;tenancy provisions commonly
                work in US retail leases. It is general information, not legal
                advice, and no clause behaves exactly like the examples here.
                What you are entitled to depends on your executed lease and its
                amendments — have counsel read them.
              </p>
            </article>
          </div>
        </div>
      </Section>

      {/* closing */}
      <Section tone="sunk" grid>
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_0.8fr] lg:gap-16">
          <div>
            <Eyebrow>Put it to work</Eyebrow>
            <SectionTitle>
              Reading the clause is the easy&nbsp;part.{" "}
              <span className="display-em text-petrol-700">
                Watching the center is the&nbsp;job.
              </span>
            </SectionTitle>
            <div className="mt-8">
              <Button href="/demo">Send us one lease</Button>
            </div>
          </div>
          <div className="relative aspect-4/3 overflow-hidden rounded-xl lift">
            <Image
              src="/photos/team-collaborating.jpg"
              alt="Colleagues reviewing lease documents together"
              fill
              sizes="(max-width: 1024px) 100vw, 36vw"
              className="object-cover"
            />
          </div>
        </div>
      </Section>
    </>
  );
}
