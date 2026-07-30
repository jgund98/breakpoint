"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { Section, Eyebrow, SectionTitle } from "@/components/ui/Section";
import { cn } from "@/lib/cn";

/**
 * The pipeline, compressed to one band — with a live signal running
 * through it. A brass pulse travels Abstract → Watch → Trigger →
 * Package on loop, lighting each stage as it arrives: the product's
 * whole motion, ambient. Full treatment lives on /platform.
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

const STEP_MS = 2100;

export function HowItWorks() {
  const ref = useRef<HTMLOListElement>(null);
  const inView = useInView(ref, { margin: "-15%" });
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!inView || reduced) return;
    const id = window.setInterval(
      () => setActive((a) => (a + 1) % steps.length),
      STEP_MS,
    );
    return () => window.clearInterval(id);
  }, [inView, reduced]);

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

      {/* the signal track */}
      <div className="relative mt-12 hidden h-px bg-line lg:block">
        <motion.span
          className="absolute -top-[3px] h-[7px] w-[7px] rounded-full bg-brass-500 shadow-[0_0_12px_rgba(217,154,43,0.8)]"
          animate={{ left: `${active * 25 + 12.5}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      <ol
        ref={ref}
        className="grid gap-px overflow-hidden rounded-xl border border-line bg-line max-lg:mt-12 sm:grid-cols-2 lg:grid-cols-4 lg:rounded-t-none lg:border-t-0"
      >
        {steps.map((s, i) => {
          const on = active === i;
          return (
            <li
              key={s.n}
              className={cn(
                "relative p-6 transition-colors duration-500 sm:p-7",
                on ? "bg-petrol-50" : "bg-surface",
              )}
            >
              <div className="flex items-center gap-3">
                <motion.span
                  className={cn(
                    "font-display text-lg leading-none transition-colors duration-500",
                    on ? "text-brass-600" : "text-brass-500/60",
                  )}
                  animate={{ scale: on ? 1.15 : 1 }}
                  transition={{ duration: 0.4 }}
                >
                  {s.n}
                </motion.span>
                <span
                  className={cn(
                    "label transition-colors duration-500",
                    on ? "text-petrol-700" : "text-muted",
                  )}
                >
                  {s.k}
                </span>
              </div>
              <p className="no-orphan balance mt-4 text-[0.9375rem] leading-relaxed text-ink-soft">
                {s.v}
              </p>
            </li>
          );
        })}
      </ol>
    </Section>
  );
}
