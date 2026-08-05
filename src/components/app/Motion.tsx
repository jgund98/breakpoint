"use client";

import { motion } from "motion/react";

/**
 * Entrance motion for the workspace.
 *
 * One-shot only. Nothing here loops, nothing animates on scroll after
 * the first pass, and nothing blurs. The product should feel alive the
 * moment it lands and then get out of the way.
 */

const EASE = [0.16, 1, 0.3, 1] as const;

export function Rise({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function Stagger({
  children,
  className,
  step = 0.055,
  start = 0,
}: {
  children: React.ReactNode;
  className?: string;
  step?: number;
  start?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="shown"
      variants={{
        hidden: {},
        shown: { transition: { staggerChildren: step, delayChildren: start } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function Item({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 14 },
        shown: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
      }}
    >
      {children}
    </motion.div>
  );
}

/** A number that counts to its value once, on mount. */
export function CountUp({
  to,
  format,
  className,
  duration = 1.1,
}: {
  to: number;
  format: (n: number) => string;
  className?: string;
  duration?: number;
}) {
  return (
    <motion.span
      className={className}
      initial={{ "--n": 0 } as never}
      animate={{ "--n": to } as never}
      transition={{ duration, ease: [0.22, 1, 0.36, 1] }}
    >
      <Counter to={to} format={format} duration={duration} />
    </motion.span>
  );
}

import { useEffect, useState } from "react";

function Counter({
  to,
  format,
  duration,
}: {
  to: number;
  format: (n: number) => string;
  duration: number;
}) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setN(to);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / (duration * 1000));
      setN(to * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return <>{format(n)}</>;
}
