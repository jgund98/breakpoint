"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { LogoWord } from "@/components/brand/Logo";
import { org, summary } from "@/lib/portfolio";

/**
 * THE BOOT SEQUENCE
 *
 * Shown once, immediately after sign-in. Its job is not to fill time:
 * it tells the reader what the system just did on their behalf before
 * they see a single number, which is how a monitoring product earns
 * the right to be believed.
 *
 * Every line is a real step in the evaluation, and the counts are the
 * reader's own. Triggered by a session flag set at sign-in, so it
 * plays on arrival and never again on navigation.
 */

export const BOOT_FLAG = "bp_boot";

const STEP_MS = 520;

export function BootScreen() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  const steps = [
    `Restoring workspace for ${org.name}`,
    `Loading ${org.watched} leases and ${summary.centers} center rent rolls`,
    `Recomputing occupancy for each clause on its own terms`,
    `Applying deemed-open rules and tenant preconditions`,
    `Checking cure clocks and election windows`,
    `Reconciling evidence against every open finding`,
  ];

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem(BOOT_FLAG) !== "1") return;
    window.sessionStorage.removeItem(BOOT_FLAG);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    setShow(true);
    document.body.style.overflow = "hidden";

    const timers: number[] = [];
    steps.forEach((_, i) => {
      timers.push(
        window.setTimeout(() => setStep(i + 1), STEP_MS * (i + 1)),
      );
    });
    timers.push(
      window.setTimeout(
        () => {
          setShow(false);
          document.body.style.overflow = "";
        },
        STEP_MS * steps.length + 900,
      ),
    );

    return () => {
      timers.forEach(clearTimeout);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const done = step >= steps.length;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="boot"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mesh-indigo fixed inset-0 z-100 grid place-items-center bg-petrol-950 px-6"
          role="status"
          aria-live="polite"
        >
          <div className="w-full max-w-md">
            {/* mark */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center"
            >
              <Indicator done={done} />
              <div className="mt-6 text-cream">
                <LogoWord className="text-[1.75rem]" />
              </div>
              <p className="mt-2 text-[0.8125rem] text-cream-faint">
                Retail Lease Intelligence
              </p>
            </motion.div>

            {/* progress */}
            <div className="mt-10 h-0.5 w-full overflow-hidden rounded-full bg-white/12">
              <motion.div
                className="h-full rounded-full bg-brass-500"
                initial={{ width: "0%" }}
                animate={{ width: `${(step / steps.length) * 100}%` }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>

            {/* steps */}
            <ul className="mt-6 space-y-2.5">
              {steps.map((line, i) => {
                const state =
                  i < step ? "done" : i === step ? "active" : "pending";
                return (
                  <motion.li
                    key={line}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{
                      opacity: state === "pending" ? 0.32 : 1,
                      x: 0,
                    }}
                    transition={{ duration: 0.4, delay: i * 0.05 }}
                    className="flex items-center gap-3 text-[0.8125rem]"
                  >
                    <span className="grid h-4 w-4 shrink-0 place-items-center">
                      {state === "done" ? (
                        <svg viewBox="0 0 16 16" className="h-4 w-4">
                          <circle
                            cx="8"
                            cy="8"
                            r="7"
                            className="mark-ring"
                            fill="none"
                            stroke="var(--color-brass-500)"
                            strokeWidth="1.5"
                          />
                          <path
                            d="M4.6 8.2 7 10.6l4.4-5"
                            className="mark-draw"
                            fill="none"
                            stroke="var(--color-brass-400)"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : state === "active" ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-brass-400 anim-pulse-dot" />
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-white/25" />
                      )}
                    </span>
                    <span
                      className={
                        state === "pending" ? "text-cream-faint" : "text-cream-soft"
                      }
                    >
                      {line}
                    </span>
                  </motion.li>
                );
              })}
            </ul>

            <AnimatePresence>
              {done && (
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 text-center text-[0.8125rem] font-semibold text-brass-400"
                >
                  Workspace ready
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * The house mark, assembling: the column draws up, the brass square
 * drops in, and a survey line sweeps across it once it is whole.
 */
function Indicator({ done }: { done: boolean }) {
  return (
    <div className="relative h-20 w-20">
      <svg viewBox="0 0 80 80" className="h-full w-full">
        {/* the column */}
        <motion.rect
          x="34"
          y="34"
          width="12"
          height="34"
          rx="2"
          fill="var(--color-cream)"
          initial={{ scaleY: 0, opacity: 0 }}
          animate={{ scaleY: 1, opacity: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          style={{ transformOrigin: "40px 68px" }}
        />
        {/* the tittle */}
        <motion.rect
          x="34"
          y="14"
          width="12"
          height="12"
          rx="2"
          fill="var(--color-brass-500)"
          initial={{ y: -14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 16,
            delay: 0.55,
          }}
        />
        {/* the heartbeat, once assembled */}
        {done && (
          <circle
            cx="40"
            cy="20"
            r="8"
            fill="none"
            stroke="var(--color-brass-400)"
            strokeWidth="1.5"
            className="glyph-ring"
          />
        )}
      </svg>

      {/* the sweep */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-6 w-6 overflow-hidden"
      >
        <span className="anim-sweep block h-full w-full bg-gradient-to-r from-transparent via-white/45 to-transparent" />
      </span>
    </div>
  );
}
