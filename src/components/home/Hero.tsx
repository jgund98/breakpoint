"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { HeroScene } from "@/components/showpiece/HeroScene";
import { EventWire } from "@/components/showpiece/EventWire";
import { AnimatedGlyph } from "@/components/brand/AnimatedGlyph";
import { Button } from "@/components/ui/Button";

const proof = [
  ["24–48 hrs", "to your first answer"],
  ["One lease", "or a national portfolio"],
  ["Watched", "as your center changes"],
];

const enter = (delay: number) => ({
  initial: { opacity: 0, y: 20, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  transition: { duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] as const },
});

/**
 * Desktop: copy column beside the living panel. Phones interleave —
 * headline, then the panel, then the pitch — so the first screen is
 * never just text. Everything enters as choreography, not a page load.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden bg-canvas">
      {/* color washes so the white ground never reads flat */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-[22%] -top-[28%] h-[70vh] w-[70vw] rounded-full bg-petrol-100/60 blur-[100px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-[18%] top-[30%] h-[55vh] w-[50vw] rounded-full bg-brass-200/40 blur-[110px]"
      />

      <div className="relative mx-auto max-w-[1400px] px-5 pt-24 pb-14 sm:px-8 sm:pt-32 lg:pt-36 lg:pb-20">
        <div className="grid items-center gap-y-7 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:grid-rows-[auto_auto] lg:gap-x-14 lg:gap-y-0 xl:gap-x-20">
          {/* ---- headline ---- */}
          <div className="max-w-[36rem] lg:col-start-1 lg:row-start-1 lg:self-end">
            <motion.p
              {...enter(0)}
              className="label flex items-center gap-2 text-petrol-600"
            >
              <AnimatedGlyph className="h-5 w-5 text-petrol-700" delay={0.2} />
              <span>
                Co&#8209;tenancy intelligence
                <span className="hidden sm:inline"> for retail tenants</span>
              </span>
            </motion.p>

            {/* One quiet line, one loud one — never a four-line stack. */}
            <h1 className="mt-5 sm:mt-6">
              <motion.span
                {...enter(0.08)}
                className="block text-[clamp(1.3rem,2.6vw,1.75rem)] font-medium tracking-[-0.02em] text-ink-soft"
              >
                Somewhere in your portfolio,
              </motion.span>
              <motion.span
                {...enter(0.16)}
                className="display-em balance mt-2 block text-[clamp(2.7rem,6.4vw,4.75rem)] text-petrol-700"
              >
                a clause just triggered.
              </motion.span>
            </h1>
          </div>

          {/* ---- the living panel — second on phones, beside on lg ---- */}
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:self-center"
          >
            <HeroScene />
          </motion.div>

          {/* ---- pitch ---- */}
          <div className="max-w-[36rem] lg:col-start-1 lg:row-start-2 lg:self-start">
            <motion.p
              {...enter(0.24)}
              className="lede no-orphan max-w-xl text-ink-soft lg:mt-7"
            >
              When stores close around yours, your lease may let you pay less
              rent — most tenants never find out in time.
              <span className="hidden sm:inline">
                {" "}
                Breakpoint watches your shopping centers and tells you the
                moment you may be owed a break, with the proof&nbsp;attached.
              </span>
            </motion.p>

            <motion.div
              {...enter(0.32)}
              className="mt-7 flex flex-col gap-3 sm:flex-row lg:mt-9"
            >
              <Button href="/demo">Start your evaluation</Button>
              <Link
                href="#the-center"
                className="inline-flex items-center justify-center rounded-full border border-line bg-surface px-7 py-4 text-base font-medium whitespace-nowrap text-ink transition-colors hover:border-petrol-300 hover:bg-petrol-50"
              >
                See it in action
              </Link>
            </motion.div>

            <motion.dl
              {...enter(0.4)}
              className="mt-8 grid grid-cols-3 gap-4 border-t border-line pt-6 sm:gap-6 lg:mt-10 lg:pt-7"
            >
              {proof.map(([value, label]) => (
                <div key={label}>
                  <dt className="font-display text-[clamp(1.05rem,2.2vw,1.5rem)] leading-none text-petrol-800">
                    {value}
                  </dt>
                  <dd className="no-orphan mt-2 text-[0.8125rem] leading-snug text-muted">
                    {label}
                  </dd>
                </div>
              ))}
            </motion.dl>
          </div>
        </div>
      </div>

      <EventWire />
    </section>
  );
}
