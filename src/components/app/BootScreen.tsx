"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { LogoWord } from "@/components/brand/Logo";
import { BrandMark } from "@/components/brand/BrandMark";

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
    "Restoring your workspace",
    "Loading your leases and center rent rolls",
    `Recomputing occupancy for each clause on its own terms`,
    `Applying deemed-open rules and tenant preconditions`,
    `Checking duration clocks and election windows`,
    `Reconciling evidence against every open finding`,
  ];

  /*
   * Claiming the flag and running the sequence are two separate
   * effects on purpose.
   *
   * When they were one, Strict Mode's double invocation broke it: the
   * first pass consumed the flag and scheduled the timers, cleanup
   * cleared them, and the second pass found no flag and returned
   * early. The overlay stayed up with nothing left to take it down,
   * which is why it sometimes needed a refresh to get through.
   *
   * Now the flag is claimed once into state, and the sequence is
   * driven by that state, so re-running the effect reschedules
   * correctly instead of stalling.
   */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem(BOOT_FLAG) !== "1") return;
    window.sessionStorage.removeItem(BOOT_FLAG);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setShow(true);
  }, []);

  useEffect(() => {
    if (!show) return;

    document.body.style.overflow = "hidden";

    const timers: number[] = [];
    steps.forEach((_, i) =>
      timers.push(window.setTimeout(() => setStep(i + 1), STEP_MS * (i + 1))),
    );

    const finish = () => {
      setShow(false);
      document.body.style.overflow = "";
    };

    timers.push(window.setTimeout(finish, STEP_MS * steps.length + 900));

    // Backstop: whatever else happens, the workspace is never held
    // behind this screen.
    timers.push(window.setTimeout(finish, 9000));

    return () => {
      timers.forEach(clearTimeout);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

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
              <BrandMark size={84} tone="light" />
              <div className="mt-6 text-white">
                <LogoWord className="text-[1.75rem]" />
              </div>
              <p className="mt-2 text-[0.8125rem] text-indigo-200/70">
                Retail Lease Intelligence
              </p>
            </motion.div>

            {/* progress */}
            <div className="mt-10 h-0.5 w-full overflow-hidden rounded-full bg-white/12">
              <motion.div
                className="h-full rounded-full bg-amber-500"
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
                            stroke="var(--color-amber-500)"
                            strokeWidth="1.5"
                          />
                          <path
                            d="M4.6 8.2 7 10.6l4.4-5"
                            className="mark-draw"
                            fill="none"
                            stroke="var(--color-amber-400)"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : state === "active" ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 anim-pulse-dot" />
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-white/25" />
                      )}
                    </span>
                    <span
                      className={
                        state === "pending" ? "text-indigo-200/70" : "text-indigo-200"
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
                  className="mt-8 text-center text-[0.8125rem] font-semibold text-amber-400"
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
