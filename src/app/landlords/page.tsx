import type { Metadata } from "next";
import { PageHero } from "@/components/chrome/PageHero";
import { Section, Eyebrow, SectionTitle, Lede } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Owner solution — on the roadmap",
  description:
    "A separately packaged owner-side product for modeling co-tenancy exposure, cure periods and redevelopment scenarios is under development. Distinct workflows, strictly isolated data.",
  alternates: { canonical: "/landlords" },
  // Unlinked and unindexed by design — the public site is tenant-side.
  robots: { index: false, follow: false },
};

const willDo = [
  {
    k: "Exposure modeling",
    v: "Which leases in a center carry co-tenancy rights, what each requires, and how far occupancy sits from every threshold.",
  },
  {
    k: "Scenario planning",
    v: "Model an anchor departure, phased construction or a demalling program before committing — with the abatement cost in the pro forma, not discovered after it.",
  },
  {
    k: "Cure management",
    v: "Track cure windows and replacement-tenant requirements so a curable condition never becomes a claimable one by accident.",
  },
  {
    k: "Renewal intelligence",
    v: "Surface legacy co-tenancy language worth renegotiating before it rolls into the next term.",
  },
];

export default function LandlordsPage() {
  return (
    <>
      <PageHero
        eyebrow="Owner solution — on the roadmap"
        title="The same engine,"
        accent="packaged for the other side of the lease."
        lede={
          <>
            Breakpoint&#8217;s product today serves retail tenants. The rules
            engine underneath it — clause logic joined to changing property
            conditions — can also answer an owner&#8217;s questions about
            exposure, cure and planning. That product is under development, and
            it will be a separate one.
          </>
        }
      />

      <Section tone="canvas">
        <div className="max-w-3xl">
          <Eyebrow>What it will do</Eyebrow>
          <SectionTitle>
            Forecasting and planning{" "}
            <span className="display-em text-petrol-700">
              — not a window into claims.
            </span>
          </SectionTitle>
          <Lede>
            The owner solution is an intelligence product: understand what the
            rent roll is exposed to, and price decisions before they&#8217;re
            made. It is not a defense tool, and it has no visibility into any
            retailer&#8217;s activity.
          </Lede>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {willDo.map((w) => (
            <div key={w.k} className="rounded-xl border border-line bg-surface p-7">
              <h3 className="text-[1.1875rem] text-petrol-800">{w.k}</h3>
              <p className="no-orphan balance mt-3 text-[0.9375rem] leading-relaxed text-ink-soft">
                {w.v}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section tone="sunk" grid>
        <div className="grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:gap-16">
          <div>
            <Eyebrow>Why it&#8217;s separate</Eyebrow>
            <SectionTitle>Isolated by design, not by policy</SectionTitle>
            <Lede>
              A platform serving both sides of a lease only deserves trust if
              the two products genuinely cannot see each other. The owner
              solution is being built with its own workflows, its own
              permissions and its own data boundary.
            </Lede>
            <ul className="mt-8 space-y-3">
              {[
                "No retailer lease, sales figure or finding is ever visible to an owner customer",
                "Nothing an owner provides informs any retailer output",
                "Separate applications, separate access — shared arithmetic only",
              ].map((p) => (
                <li key={p} className="flex gap-3 text-[0.9375rem] text-ink-soft">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-petrol-600" />
                  <span className="no-orphan">{p}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-line bg-surface p-7 lift sm:p-9">
            <span className="label text-muted">Interested?</span>
            <p className="no-orphan mt-4 text-[1.0625rem] leading-relaxed text-ink-soft">
              If you own or operate centers and want early access when the
              owner solution ships, tell us about your portfolio and we&#8217;ll
              keep you posted.
            </p>
            <div className="mt-7 flex flex-col gap-3">
              <Button href={`mailto:${site.email}?subject=Owner%20solution%20—%20early%20access`}>
                Request early access
              </Button>
              <Button href="/co-tenancy" variant="secondary">
                Read the field guide
              </Button>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
