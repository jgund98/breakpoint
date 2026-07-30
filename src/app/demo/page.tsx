import type { Metadata } from "next";
import { DemoForm } from "@/components/forms/DemoForm";
import { Reveal } from "@/components/ui/Reveal";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Start your evaluation",
  description:
    "Send one lease and one center. Breakpoint abstracts the co-tenancy language, assembles the center's occupancy history, and shows you whether a test appears to have failed — inside 48 hours.",
  alternates: { canonical: "/demo" },
};

const bring = [
  "The executed lease, plus amendments",
  "The center it sits in",
  "Current minimum rent for that store",
  "Trailing gross sales, if you can share them",
];

const timeline = [
  ["Hour 0", "You upload one lease"],
  ["Hour 12", "Clause abstracted and reviewed, every field cited"],
  ["Hour 36", "Center conditions assembled and dated"],
  ["Hour 48", "Your evaluation is in your workspace"],
];

export default function DemoPage() {
  return (
    <>
      {/* intake — light, balanced: pitch left, form right */}
      <section className="relative overflow-hidden bg-canvas pt-28 pb-16 sm:pt-32 lg:pt-36 lg:pb-20">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-[20%] -top-[30%] h-[60vh] w-[60vw] rounded-full bg-petrol-100/60 blur-[100px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-[15%] top-[35%] h-[50vh] w-[45vw] rounded-full bg-brass-200/35 blur-[110px]"
        />

        <div className="relative mx-auto max-w-[1400px] px-5 sm:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16">
            <div className="max-w-[32rem]">
              <p className="label text-petrol-600">Start your evaluation</p>
              <h1 className="mt-5">
                <span className="block text-[clamp(1.3rem,2.4vw,1.65rem)] font-medium tracking-[-0.02em] text-ink-soft">
                  Send one lease.
                </span>
                <span className="display-em balance mt-2 block text-[clamp(2.4rem,5vw,3.75rem)] text-petrol-700">
                  We&#8217;ll tell you what it may be owed.
                </span>
              </h1>
              <p className="lede no-orphan mt-6 text-ink-soft">
                Pick the center you have the worst feeling about. Your
                submission opens an evaluation in your workspace — the clause,
                the occupancy history, and a straight answer about whether a
                test appears to have failed, inside 48 hours.
              </p>
              <p className="mt-6 text-sm text-muted">
                Prefer email?{" "}
                <a
                  href={`mailto:${site.email}`}
                  className="text-petrol-800 underline decoration-petrol-300 underline-offset-4 transition-colors hover:text-petrol-600"
                >
                  {site.email}
                </a>
              </p>
            </div>

            <DemoForm />
          </div>
        </div>
      </section>

      {/* what to bring / what happens — one balanced band */}
      <section className="relative overflow-hidden bg-surface-sunk py-16 sm:py-20">
        <div className="relative mx-auto max-w-[1400px] px-5 sm:px-8">
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
            <Reveal className="rounded-xl border border-line bg-surface p-7 lift sm:p-9">
              <h2 className="label text-petrol-600">What to have ready</h2>
              <ul className="mt-5 space-y-3">
                {bring.map((b) => (
                  <li key={b} className="flex gap-3 text-[1.0625rem] text-ink-soft">
                    <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brass-500" />
                    <span className="no-orphan">{b}</span>
                  </li>
                ))}
              </ul>
              <p className="no-orphan mt-6 border-t border-line pt-5 text-sm leading-relaxed text-muted">
                A redacted lease is fine while diligence runs — the clause
                language is what we need, not your counterparty names.
              </p>
            </Reveal>

            <Reveal delay={0.12} className="rounded-xl border border-line bg-surface p-7 lift sm:p-9">
              <h2 className="label text-petrol-600">What happens next</h2>
              <ol className="mt-5 space-y-4">
                {timeline.map(([at, what], i) => (
                  <li key={at} className="flex gap-5">
                    <span className="tnum w-16 shrink-0 pt-0.5 text-sm font-semibold text-brass-700">
                      {at}
                    </span>
                    <span className="relative flex-1 text-[1.0625rem] text-ink-soft">
                      <span className="no-orphan">{what}</span>
                      {i < timeline.length - 1 && (
                        <span className="absolute -left-[13px] top-6 h-[calc(100%-0.25rem)] w-px bg-line" />
                      )}
                    </span>
                  </li>
                ))}
              </ol>
              <p className="no-orphan balance mt-6 border-t border-line pt-5 text-sm leading-relaxed text-muted">
                AI does the reading; our team reviews every abstraction and
                consequential finding before it reaches&nbsp;you.
              </p>
            </Reveal>
          </div>

          <p className="no-orphan mx-auto mt-10 max-w-2xl text-center text-sm leading-relaxed text-muted">
            Breakpoint identifies potential contractual events and assembles
            evidence. Whether and when to serve notice is a decision for you
            and your counsel. Nothing on this site is legal&nbsp;advice.
          </p>
        </div>
      </section>
    </>
  );
}
