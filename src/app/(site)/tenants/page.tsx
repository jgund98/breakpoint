import type { Metadata } from "next";
import Image from "next/image";
import { PageHero } from "@/components/chrome/PageHero";
import { Section, Eyebrow, SectionTitle, Lede } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { Onboarding } from "@/components/home/Onboarding";
import { leaseEconomics, usd } from "@/lib/center";

export const metadata: Metadata = {
  title: "Co-tenancy monitoring for retail tenants",
  description:
    "Breakpoint watches the co-tenancy clause in every lease you hold, flags when a test may have failed, and hands lease accounting the estimated impact with the evidence. First center live in 24–48 hours.",
  alternates: { canonical: "/tenants" },
};

const roles = [
  {
    role: "Lease accounting",
    pain: "You reconcile what the landlord bills. You have no independent signal that the bill is wrong.",
    gets: "A dated, cited trigger event with the alternative-rent calculation already worked, ready to book.",
  },
  {
    role: "Real estate",
    pain: "You negotiated the clause years ago. Nobody has checked whether the condition it protects against has arrived.",
    gets: "A live register of which centers are failing, which are close, and where the leverage sits at renewal.",
  },
  {
    role: "Store operations",
    pain: "Your district managers are the current detection system, on top of running stores.",
    gets: "Nothing to do. The signal stops depending on whether someone noticed and remembered to escalate.",
  },
  {
    role: "Legal",
    pain: "Serving notice needs evidence you don't have and a history nobody recorded.",
    gets: "A packet: the clause, the citations, the dated occupancy record, the workings. You review and send.",
  },
];

const scale = [
  { k: "Portfolio size", v: "one lease to 5,000+ stores" },
  { k: "Typical inline rent", v: "$60 – $140 / SF" },
  { k: "Occupancy cost target", v: "10 – 15% of sales" },
  { k: "Alternative rent", v: "commonly 2 – 6% of sales" },
];

export default function TenantsPage() {
  return (
    <>
      <PageHero
        eyebrow="For retailers"
        title="You negotiated protection."
        accent="Nobody is checking whether it fired."
        lede={
          <>
            Co&#8209;tenancy is the one clause in a retail lease that pays the
            tenant. It only pays if you notice, and it only pays from the month
            you serve notice. Breakpoint makes noticing automatic.
          </>
        }
        photo="/photos/mall-overhead-shoppers.jpg"
        photoAlt="Overhead view of shoppers moving through a busy shopping center concourse"
        cta={{ href: "/demo", label: "Start your evaluation" }}
      />

      {/* the arithmetic */}
      <Section tone="canvas">
        <div className="grid gap-12 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:gap-16">
          <div>
            <Eyebrow>The arithmetic</Eyebrow>
            <SectionTitle>
              One store. One clause.{" "}
              <span className="display-em text-petrol-700">
                {usd(leaseEconomics.monthlyDelta * 12)} a year.
              </span>
            </SectionTitle>
            <Lede>
              {`A 3,850 SF inline store at $92/SF pays ${usd(
                leaseEconomics.baseRentMonthly,
              )} a month. Trading at $826/SF, that’s an occupancy cost of 11.1%, which is healthy. When the co‑tenancy test appears to fail and rent converts to 4% of gross sales, the same store pays ${usd(leaseEconomics.alternativeRentMonthly)}.`}
            </Lede>
            <p className="no-orphan mt-6 max-w-xl text-[1.0625rem] leading-relaxed text-ink-soft">
              Now hold that against an estate of a thousand stores, where a
              handful of centers are always in decline. The number stops being a
              rounding error and starts being a line item the CFO asks about.
            </p>
          </div>

          <div className="rounded-xl border border-line bg-surface p-7 lift sm:p-8">
            <span className="label text-muted">Sample store · 4412</span>
            <dl className="mt-6 space-y-4">
              {[
                ["Minimum rent", `${usd(leaseEconomics.baseRentMonthly)} / mo`],
                ["Gross sales", `${usd(leaseEconomics.grossSalesMonthly)} / mo`],
                ["Occupancy cost", "11.1%"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
                  <dt className="text-[0.9375rem] text-muted">{k}</dt>
                  <dd className="tnum text-[0.9375rem] font-medium text-ink">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-6 rounded-lg bg-brass-50 p-5">
              <span className="label text-brass-700">On co-tenancy failure</span>
              <dl className="mt-4 space-y-3">
                {[
                  ["Alternative rent", `${usd(leaseEconomics.alternativeRentMonthly)} / mo`],
                  ["Occupancy cost", "4.0%"],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between gap-4">
                    <dt className="text-[0.9375rem] text-brass-700">{k}</dt>
                    <dd className="tnum text-[0.9375rem] font-medium text-brass-700">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="tnum mt-5 border-t border-brass-200 pt-4 font-display text-3xl leading-none text-brass-700">
                +{usd(leaseEconomics.monthlyDelta)} / mo
              </p>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-muted">
              Illustrative. Your remedy is whatever your executed lease says:
              abatement, percentage rent, a termination right, or nothing at all.
            </p>
          </div>
        </div>
      </Section>

      {/* who it lands on */}
      <Section tone="sunk" grid id="accounting">
        <div className="max-w-3xl">
          <Eyebrow>Inside the building</Eyebrow>
          <SectionTitle>
            Four teams touch this clause.{" "}
            <span className="display-em text-petrol-700">
              None of them owns it.
            </span>
          </SectionTitle>
          <Lede>
            Co&#8209;tenancy falls between lease accounting, real estate, store
            operations and legal, which is exactly why it goes unclaimed.
            Breakpoint gives it a single owner: the system.
          </Lede>
        </div>

        <div className="mt-14 space-y-4">
          {roles.map((r) => (
            <div
              key={r.role}
              className="grid gap-5 rounded-xl border border-line bg-surface p-6 sm:p-8 lg:grid-cols-[200px_1fr_1fr] lg:gap-8"
            >
              <h3 className="text-[1.25rem] text-petrol-800">{r.role}</h3>
              <div>
                <span className="label text-muted">Today</span>
                <p className="no-orphan balance mt-2 text-[0.9375rem] leading-relaxed text-ink-soft">
                  {r.pain}
                </p>
              </div>
              <div>
                <span className="label text-brass-700">With Breakpoint</span>
                <p className="no-orphan balance mt-2 text-[0.9375rem] leading-relaxed text-ink-soft">
                  {r.gets}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Onboarding />

      {/* scale */}
      <Section tone="canvas">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div className="relative aspect-4/3 overflow-hidden rounded-xl lift-lg">
            <Image
              src="/photos/mall-fashion-outlets.jpg"
              alt="A multi-level shopping center with fashion retailers"
              fill
              sizes="(max-width: 1024px) 100vw, 46vw"
              className="object-cover"
            />
          </div>
          <div>
            <Eyebrow>Who this is for</Eyebrow>
            <SectionTitle>
              One lease to a national portfolio.
            </SectionTitle>
            <Lede>
              A single-location tenant can send us one lease and get a straight
              answer. But the case sharpens with scale: at fifty stores nobody
              can hold every center in their head, and at five thousand the
              clause is effectively unenforced across most of the portfolio.
            </Lede>
            <dl className="mt-9 grid gap-x-8 gap-y-6 sm:grid-cols-2">
              {scale.map((item) => (
                <div key={item.k} className="border-t border-line pt-4">
                  <dt className="text-sm text-muted">{item.k}</dt>
                  <dd className="mt-1.5 font-display text-[1.375rem] leading-tight text-petrol-800">
                    {item.v}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-6 text-xs text-muted">
              Ranges reflect common US inline retail terms, not a promise about
              your leases.
            </p>
            <div className="mt-9">
              <Button href="/demo">Send us your lease</Button>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
