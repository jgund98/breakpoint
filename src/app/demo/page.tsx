import type { Metadata } from "next";
import { DemoForm } from "@/components/forms/DemoForm";
import { Section } from "@/components/ui/Section";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Book a walkthrough",
  description:
    "Send one lease and one center. We'll abstract the co-tenancy language, rebuild the center's occupancy, and show you whether a test has already failed — inside 48 hours.",
  alternates: { canonical: "/demo" },
};

const bring = [
  "The executed lease, plus amendments",
  "The center it sits in",
  "Current minimum rent for that store",
  "Trailing gross sales, if you can share them",
];

const timeline = [
  ["Hour 0", "You send one lease"],
  ["Hour 12", "Clause abstracted and reviewed, every field cited"],
  ["Hour 36", "Center conditions assembled and dated"],
  ["Hour 48", "We walk you through what we found"],
];

export default function DemoPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-petrol-900 pt-32 pb-20 text-cream sm:pt-36 lg:pt-44 lg:pb-28">
        <div className="plan-grid-dark mask-fade absolute inset-0 opacity-60" />

        <div className="relative mx-auto max-w-[1400px] px-5 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
            {/* pitch */}
            <div>
              <p className="label text-brass-400">Book a walkthrough</p>
              <h1 className="balance mt-5 text-[clamp(2.25rem,5.4vw,3.75rem)] text-cream">
                Send one lease.{" "}
                <span className="display-em block text-brass-200">
                  We&#8217;ll tell you what it may be owed.
                </span>
              </h1>
              <p className="lede no-orphan mt-6 max-w-xl text-cream-soft">
                Not a slide deck. Pick the center you have the worst feeling
                about and we&#8217;ll run it properly — the clause, the
                occupancy history, and a straight answer about whether a test
                appears to have failed.
              </p>

              <div className="mt-10">
                <h2 className="label text-cream-faint">What to bring</h2>
                <ul className="mt-4 space-y-2.5">
                  {bring.map((b) => (
                    <li key={b} className="flex gap-3 text-[0.9375rem] text-cream-soft">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brass-400" />
                      <span className="no-orphan">{b}</span>
                    </li>
                  ))}
                </ul>
                <p className="no-orphan mt-4 max-w-md text-sm leading-relaxed text-cream-faint">
                  A redacted lease is fine if diligence is still running — the
                  clause language is what we need, not your counterparty names.
                </p>
              </div>

              <div className="mt-10 border-t border-white/12 pt-8">
                <h2 className="label text-cream-faint">What happens next</h2>
                <ol className="mt-4 space-y-3">
                  {timeline.map(([at, what]) => (
                    <li key={at} className="flex gap-4">
                      <span className="tnum w-16 shrink-0 text-sm font-medium text-brass-400">
                        {at}
                      </span>
                      <span className="no-orphan flex-1 text-sm text-cream-soft">
                        {what}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              <p className="mt-10 text-sm text-cream-faint">
                Prefer email?{" "}
                <a
                  href={`mailto:${site.email}`}
                  className="text-cream underline decoration-white/30 underline-offset-4 transition-colors hover:text-brass-400"
                >
                  {site.email}
                </a>
              </p>
            </div>

            {/* form */}
            <div className="lg:pt-2">
              <DemoForm />
            </div>
          </div>
        </div>
      </section>

      <Section tone="canvas" className="py-14 sm:py-16 lg:py-20">
        <p className="no-orphan mx-auto max-w-2xl text-center text-sm leading-relaxed text-muted">
          Breakpoint detects, calculates and assembles evidence. Whether and when
          to serve notice is a decision for you and your counsel — we don&#8217;t
          give legal advice, and nothing on this site is any.
        </p>
      </Section>
    </>
  );
}
