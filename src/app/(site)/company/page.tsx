import type { Metadata } from "next";
import Image from "next/image";
import { PageHero } from "@/components/chrome/PageHero";
import { Section, Eyebrow, SectionTitle, Lede } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Company",
  description:
    "Breakpoint was built by people who produced co-tenancy reports from the landlord's side and watched tenants miss what they were owed. One clause, done properly.",
  alternates: { canonical: "/company" },
};

const beliefs = [
  {
    k: "One clause, done completely",
    v: "Lease platforms are broad and shallow by necessity: they have a hundred clauses to serve. We have one, and we intend to understand it better than anyone. Depth is the whole strategy.",
  },
  {
    k: "Detection is the product",
    v: "Storing the clause is solved. Knowing the hour it fails is not. Everything we build points at shortening the distance between an event happening and the right person hearing about it.",
  },
  {
    k: "Auditable or worthless",
    v: "We tell people they are owed money. If a lease administrator cannot trace every figure back to a sentence and a date, we have produced a liability rather than a claim.",
  },
  {
    k: "Tenant-side, by design",
    v: "Tenant information is private and isolated. Your leases, sales and findings serve your evaluations and nothing else: no other party's product, no model training, no exceptions.",
  },
];

export default function CompanyPage() {
  return (
    <>
      <PageHero
        eyebrow="Company"
        title="We wrote these reports"
        accent="from the other side."
        lede={
          <>
            Breakpoint started on the landlord side of the table, producing the
            internal co&#8209;tenancy reports that told us exactly which tenants
            could have claimed against us. Most of them never did.
          </>
        }
        photo="/photos/boardroom-three-pros.jpg"
        photoAlt="A modern boardroom overlooking a city"
      />

      <Section tone="canvas">
        <div className="max-w-[46rem]">
          <Eyebrow>Origin</Eyebrow>
          <SectionTitle>The reports nobody acted on</SectionTitle>

          <div className="mt-8 space-y-6 text-[1.0625rem] leading-relaxed text-ink-soft">
            <p className="no-orphan">
              If you have worked in shopping center asset management, you have
              seen the file. Every quarter, someone assembles a co&#8209;tenancy
              report: which centers are below their occupancy floors, which named
              tenants have gone dark, and which leases in the portfolio are
              therefore exposed. It exists so the owner is not surprised.
            </p>
            <p className="no-orphan">
              What was striking, doing that work, was how rarely the other side
              showed up. Tenants who were plainly entitled to alternative rent,
              in writing, in a lease their own company had negotiated, simply
              never served notice. Not because they had decided against it.
              Because nobody at that company knew the condition had occurred.
            </p>
            <p className="no-orphan">
              These are not unsophisticated businesses. They run thousands of
              stores with real estate teams and lease accounting departments and
              expensive software. The gap was never competence. It was that
              nobody was watching the centers, because watching the centers was
              not anybody&#8217;s job and no product did it.
            </p>
            <p className="no-orphan">
              Meanwhile the clock kept running. Co&#8209;tenancy relief typically
              starts the month after notice is served, so every quarter of
              silence was money that could never be recovered, on both sides of
              a deal that had been fairly negotiated years earlier.
            </p>
            <p className="no-orphan">
              Breakpoint is that report, turned into a system, pointed at every
              center at once, and put in the hands of the tenants whose money
              was being left on the table.
            </p>
          </div>
        </div>
      </Section>

      <Section tone="sunk" grid>
        <div className="max-w-3xl">
          <Eyebrow>What we believe</Eyebrow>
          <SectionTitle>Four positions we build from</SectionTitle>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {beliefs.map((b) => (
            <div
              key={b.k}
              className="rounded-xl border border-line bg-surface p-7 sm:p-8"
            >
              <h3 className="balance text-[1.25rem] text-petrol-800">{b.k}</h3>
              <p className="no-orphan balance mt-3 text-[0.9375rem] leading-relaxed text-ink-soft">
                {b.v}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section tone="canvas">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="relative aspect-4/3 overflow-hidden rounded-xl lift-lg">
            <Image
              src="/photos/woman-laptop-office.jpg"
              alt="A professional working at a desk in a modern office"
              fill
              sizes="(max-width: 1024px) 100vw, 46vw"
              className="object-cover"
            />
          </div>
          <div>
            <Eyebrow>Where we are</Eyebrow>
            <SectionTitle>Early, and saying so</SectionTitle>
            <Lede>
              Breakpoint is a new company. We have no logo wall to show you and
              we are not going to invent one. What we have is a clear read on a
              problem we watched from the inside, and a product that does the
              specific thing that problem requires.
            </Lede>
            <p className="no-orphan mt-6 max-w-xl text-[1.0625rem] leading-relaxed text-ink-soft">
              The fastest way to judge us is to hand us the center you have the
              worst feeling about. One lease, one center, 48 hours. If the
              answer is that nothing has failed, we will tell you that, and
              you&#8217;ll have one fewer thing to worry about.
            </p>
            <div className="mt-9">
              <Button href="/demo">Start your evaluation</Button>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
