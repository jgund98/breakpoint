import Image from "next/image";
import { Section, Eyebrow, SectionTitle } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";

export function Problem() {
  return (
    <Section tone="canvas">
      <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-16">
        {/* photo stack */}
        <Reveal className="relative">
          <div className="relative aspect-4/5 overflow-hidden rounded-xl lift-lg sm:aspect-4/3 lg:aspect-4/5">
            <Image
              src="/photos/mall-closed-stores.jpg"
              alt="An enclosed shopping center concourse with storefronts closed"
              fill
              sizes="(max-width: 1024px) 100vw, 45vw"
              className="object-cover"
            />
          </div>

          {/* the tell, pinned to the photo */}
          <div className="absolute -bottom-6 -right-3 w-[min(19rem,88%)] rounded-xl border border-line bg-surface p-5 lift-lg sm:-right-6">
            <span className="label text-brass-700">What nobody filed</span>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-soft">
              Three named tenants dark. Occupancy at{" "}
              <span className="tnum font-semibold text-ink">67.8%</span> against
              a 70% floor. The condition appears to have held for{" "}
              <span className="font-semibold text-ink">nine months</span>.
            </p>
          </div>
        </Reveal>

        {/* copy */}
        <Reveal delay={0.12} className="mt-10 lg:mt-0">
          <Eyebrow>The detection problem</Eyebrow>
          <SectionTitle>
            The system of record is{" "}
            <span className="display-em text-petrol-700">
              a district manager&#8217;s memory.
            </span>
          </SectionTitle>

          <p className="lede no-orphan mt-7 text-ink-soft">
            Lease software stores your paperwork. It has no idea which stores
            around you closed this month — so the event that could lower your
            rent gets spotted by whoever happens to walk the mall, or not
            at&nbsp;all.
          </p>

          <figure className="mt-9 border-l-2 border-brass-500 pl-6">
            <blockquote className="font-display text-[clamp(1.25rem,2.3vw,1.6rem)] leading-snug text-ink italic">
              &#8220;Identification of a co&#8209;tenancy violation is often a
              difficult undertaking since it is incumbent upon store staff and
              regional management to note closures and keep the corporate office
              informed.&#8221;
            </blockquote>
            <figcaption className="mt-4 text-sm text-muted">
              Tango Analytics,{" "}
              <cite className="not-italic">The Retailer&#8217;s Guide to Co-Tenancy</cite>
            </figcaption>
          </figure>

        </Reveal>
      </div>
    </Section>
  );
}
