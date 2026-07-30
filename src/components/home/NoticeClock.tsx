"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useInView } from "motion/react";
import { leaseEconomics, usd } from "@/lib/center";
import { cn } from "@/lib/cn";
import { DarkDecor } from "@/components/ui/Decor";

/** Counts up from zero the first time it scrolls into view. */
function CountTo({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, {
      duration: 1.4,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: setV,
    });
    return () => controls.stop();
  }, [inView, value]);
  return (
    <span ref={ref} className={className}>
      {usd(v)}
    </span>
  );
}

/**
 * The single most expensive fact in retail co-tenancy: the remedy runs
 * from the month after notice is delivered, not from the day the test
 * failed. Every month you don't notice is simply gone.
 */

const MONTHS = [
  "Mar", "Apr", "May", "Jun", "Jul", "Aug",
  "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr",
];
const NOTICE_AT = 9; // index — nine months of silence

const monthly = leaseEconomics.monthlyDelta;
const forgone = monthly * NOTICE_AT;
const recovered = monthly * (MONTHS.length - NOTICE_AT);

export function NoticeClock() {
  return (
    <section className="relative overflow-hidden bg-petrol-900 py-20 text-cream sm:py-24 lg:py-32">
      <DarkDecor />

      <div className="relative mx-auto max-w-[1400px] px-5 sm:px-8">
        <div className="max-w-3xl">
          <p className="label text-brass-400">The notice clock</p>
          <h2 className="balance mt-5 text-[clamp(1.9rem,4.4vw,3.25rem)] text-cream">
            The clause doesn&#8217;t pay retroactively.{" "}
            <span className="display-em balance block text-brass-200">
              It pays from the day you&nbsp;notice.
            </span>
          </h2>
          <p className="lede no-orphan mt-6 max-w-2xl text-cream-soft">
            In this lease — as in many — alternative rent commences on the first
            day of the month{" "}
            <em className="text-cream not-italic underline decoration-brass-400/60 underline-offset-4">
              following written notice
            </em>
            . Not the day the anchor went dark. Not the day occupancy crossed
            the floor. Which makes detection speed the entire&nbsp;product.
          </p>
        </div>

        {/* the timeline */}
        <div className="mt-14 lg:mt-16">
          <div className="flex items-end gap-1.5 sm:gap-2.5">
            {MONTHS.map((m, i) => {
              const silent = i < NOTICE_AT;
              return (
                <motion.div
                  key={`${m}-${i}`}
                  className="flex flex-1 flex-col items-center gap-2"
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{
                    duration: 0.5,
                    delay: i * 0.045,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <motion.div
                    className={cn(
                      "w-full rounded-t-sm",
                      silent
                        ? "border border-dashed border-white/25 bg-white/5"
                        : "bg-brass-500",
                    )}
                    initial={{ height: 8 }}
                    whileInView={{ height: silent ? 44 : 92 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{
                      duration: 0.7,
                      delay: 0.15 + i * 0.045,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  />
                  <span
                    className={cn(
                      "font-medium uppercase max-sm:text-[0.5rem] max-sm:tracking-normal sm:text-xs sm:tracking-wide",
                      silent ? "text-cream-faint" : "text-brass-200",
                    )}
                  >
                    {m}
                  </span>
                </motion.div>
              );
            })}
          </div>

          {/* the notice marker */}
          <div className="relative mt-4 h-px bg-white/15">
            <div
              className="absolute -top-px h-px bg-brass-500"
              style={{
                left: `${(NOTICE_AT / MONTHS.length) * 100}%`,
                right: 0,
              }}
            />
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: 0.9 }}
              className="absolute top-0 -translate-x-1/2"
              style={{ left: `${(NOTICE_AT / MONTHS.length) * 100}%` }}
            >
              <span className="mx-auto block h-3 w-px bg-brass-500" />
              <span className="label mt-2 block whitespace-nowrap text-brass-400">
                Notice delivered
              </span>
            </motion.div>
          </div>

          {/* the two totals */}
          <div className="mt-20 grid gap-5 sm:mt-24 sm:grid-cols-2">
            <div className="rounded-xl border border-white/12 bg-white/4 p-6">
              <span className="label text-cream-faint">
                Potential savings missed before notice
              </span>
              <p className="tnum mt-3 font-display text-[clamp(2rem,4.4vw,2.75rem)] leading-none text-cream-faint line-through decoration-clay-500/70 decoration-2">
                <CountTo value={forgone} />
              </p>
              <p className="no-orphan mt-3 text-sm leading-relaxed text-cream-soft">
                The condition appears to have existed for nine months — but the
                remedy only begins after written notice. Undetected, those
                months can&#8217;t be captured.
              </p>
            </div>

            <div className="rounded-xl border border-brass-500/40 bg-brass-500/10 p-6">
              <span className="label text-brass-400">
                Savings available from notice forward
              </span>
              <p className="tnum mt-3 font-display text-[clamp(2rem,4.4vw,2.75rem)] leading-none text-brass-200">
                <CountTo value={recovered} />
              </p>
              <p className="no-orphan mt-3 text-sm leading-relaxed text-cream-soft">
                On one store, in one center. Breakpoint&#8217;s entire job is to
                move that marker left.
              </p>
            </div>
          </div>

          <p className="mt-6 text-xs text-cream-faint">
            Illustrative, based on the sample lease used throughout this site:
            an estimated {usd(monthly)}/mo rent difference on a 3,850 SF store.
            Whether a remedy applies depends on the executed lease.
          </p>
        </div>
      </div>
    </section>
  );
}
