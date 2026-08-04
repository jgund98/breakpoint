import type { Metadata } from "next";
import { PageHero } from "@/components/chrome/PageHero";
import { Section, Eyebrow, SectionTitle, Lede } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Security & trust",
  description:
    "How Breakpoint handles executed leases, sales data and portfolio records: encryption, access control, retention, subprocessors and our current compliance position.",
  alternates: { canonical: "/security" },
};

const practices = [
  {
    k: "Encryption",
    v: "Everything you send is encrypted in transit with TLS 1.2 or better, and encrypted at rest. Lease documents are stored in object storage with server-side encryption and are never served from a public bucket.",
  },
  {
    k: "Access control",
    v: "Single sign-on via your identity provider, role-based permissions, and least-privilege internal access. Engineer access to customer data requires a named business reason and is logged.",
  },
  {
    k: "Tenancy separation",
    v: "Each customer's leases, sales figures and findings are logically isolated. Your gross sales are used to price your remedies and nothing else. They never contribute to another customer's output.",
  },
  {
    k: "Audit trail",
    v: "Every abstraction, every occupancy observation and every evaluation is versioned with its source and timestamp. You can reconstruct what we believed on any past date, which is what makes a claim defensible.",
  },
  {
    k: "Retention and deletion",
    v: "You set the retention period. On termination we delete customer data and documents within 30 days, and confirm it in writing. Backups age out on a documented schedule.",
  },
  {
    k: "Availability",
    v: "Hosted on major cloud infrastructure in US regions, with automated backups and point-in-time recovery. Breakpoint is a monitoring layer: an outage delays a notification, it never alters your lease record.",
  },
];

const posture = [
  {
    k: "SOC 2 Type II",
    v: "Not yet held. We are building against the criteria and will publish the report when the observation window completes. We will not describe ourselves as certified before that is true.",
    state: "In progress",
  },
  {
    k: "Penetration testing",
    v: "Independent testing before general availability, then annually, with a summary letter available to customers under NDA.",
    state: "Planned",
  },
  {
    k: "Subprocessors",
    v: "A current list of subprocessors (cloud hosting, document storage, model providers and error monitoring) is available on request and maintained as a contractual commitment.",
    state: "On request",
  },
  {
    k: "Model handling",
    v: "Lease text is processed for abstraction only. We do not permit customer documents to be used to train third-party models, and this is contracted with our providers.",
    state: "Contracted",
  },
];

export default function SecurityPage() {
  return (
    <>
      <PageHero
        eyebrow="Security & trust"
        title="You are sending us"
        accent="your executed leases."
        lede={
          <>
            Leases and store-level sales are among the most sensitive records a
            retailer holds. Here is precisely how we handle them, and an honest
            account of where our compliance position actually stands today.
          </>
        }
      />

      <Section tone="canvas">
        <div className="max-w-3xl">
          <Eyebrow>Practices</Eyebrow>
          <SectionTitle>How your data is handled</SectionTitle>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {practices.map((p) => (
            <div
              key={p.k}
              className="rounded-xl border border-line bg-surface p-7"
            >
              <h3 className="text-[1.1875rem] text-petrol-800">{p.k}</h3>
              <p className="no-orphan balance mt-3 text-[0.9375rem] leading-relaxed text-ink-soft">
                {p.v}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section tone="sunk" grid>
        <div className="max-w-3xl">
          <Eyebrow>Compliance</Eyebrow>
          <SectionTitle>
            Where we actually are,{" "}
            <span className="display-em text-petrol-700">not where we&#8217;d like to be</span>
          </SectionTitle>
          <Lede>
            Plenty of early companies imply certifications they don&#8217;t hold.
            Since our entire product is about being auditable, that would be a
            strange place to start.
          </Lede>
        </div>

        <div className="mt-12 overflow-hidden rounded-xl border border-line bg-surface">
          {posture.map((p, i) => (
            <div
              key={p.k}
              className={`grid gap-4 p-6 sm:grid-cols-[200px_1fr_140px] sm:items-start sm:gap-8 sm:p-7 ${
                i > 0 ? "border-t border-line" : ""
              }`}
            >
              <h3 className="text-[1.0625rem] font-semibold text-ink">{p.k}</h3>
              <p className="no-orphan balance text-[0.9375rem] leading-relaxed text-ink-soft">
                {p.v}
              </p>
              <span className="label justify-self-start rounded-full border border-line px-3 py-1.5 text-muted sm:justify-self-end">
                {p.state}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section tone="canvas">
        <div className="mx-auto max-w-2xl text-center">
          <SectionTitle className="mt-0">
            Security review before you send anything?
          </SectionTitle>
          <p className="lede no-orphan mx-auto mt-6 text-ink-soft">
            Send your questionnaire and we&#8217;ll complete it. If your team
            would rather start with a redacted lease while diligence runs, that
            works perfectly well. The clause language is what we need, not your
            counterparty names.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Button href={`mailto:${site.email}`}>Contact us</Button>
            <Button href="/demo" variant="secondary">
              Start your evaluation
            </Button>
          </div>
        </div>
      </Section>
    </>
  );
}
