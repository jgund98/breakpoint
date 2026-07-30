import Link from "next/link";
import { Section, Eyebrow, SectionTitle } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";

/**
 * The pipeline, compressed to one band. The full four-stage treatment —
 * clause reader, occupancy trace, alert, claim packet — lives on
 * /platform; this strip earns the click without re-telling it.
 */
const steps = [
  {
    n: "01",
    k: "Abstract",
    v: "The lease and every amendment become testable rules, each field citing the sentence it came from.",
  },
  {
    n: "02",
    k: "Watch",
    v: "We assemble what each center actually looks like — closures, filings, permits, field verification.",
  },
  {
    n: "03",
    k: "Trigger",
    v: "Every test re-runs as conditions change. The day one fails, the right person hears about it.",
  },
  {
    n: "04",
    k: "Package",
    v: "The notice materials, citations, evidence and calculations arrive as one package for your team and counsel.",
  },
];

export function HowItWorks() {
  return (
    <Section tone="canvas">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <Eyebrow>How it works</Eyebrow>
          <SectionTitle>
            Read the clause. Watch the center.{" "}
            <span className="display-em text-petrol-700">
              Catch the collision.
            </span>
          </SectionTitle>
        </div>
        <Link
          href="/platform"
          className="group inline-flex shrink-0 items-center gap-2 text-[0.9375rem] font-medium text-petrol-800 lg:pb-2"
        >
          See the full platform
          <span className="transition-transform duration-300 group-hover:translate-x-1">
            →
          </span>
        </Link>
      </div>

      <ol className="mt-12 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <li key={s.n} className="group bg-surface transition-colors duration-300 hover:bg-petrol-50">
            <Reveal delay={i * 0.09} className="h-full p-6 sm:p-7">
            <div className="flex items-center gap-3">
              <span className="font-display text-lg leading-none text-brass-500">
                {s.n}
              </span>
              <span className="label text-petrol-600">{s.k}</span>
            </div>
            <p className="no-orphan balance mt-4 text-[0.9375rem] leading-relaxed text-ink-soft">
              {s.v}
            </p>
            </Reveal>
          </li>
        ))}
      </ol>
    </Section>
  );
}
