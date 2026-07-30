"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";

/**
 * The indicator, alive. The bar rises, the brass square drops in and
 * keeps a slow heartbeat — the product's whole promise (a signal
 * raised over a location) played by the logo itself.
 */
export function AnimatedGlyph({
  className,
  delay = 0,
  bar = "currentColor",
}: {
  className?: string;
  delay?: number;
  /** Bar color — defaults to the surrounding text color. */
  bar?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      className={cn("shrink-0 overflow-visible", className)}
    >
      <motion.rect
        x="12.25"
        y="11.5"
        width="7.5"
        height="18.5"
        rx="2.5"
        fill={bar}
        style={{ originY: "30px", originX: "16px" }}
        initial={reduced ? false : { scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.rect
        x="12.25"
        y="2"
        width="7.5"
        height="7.5"
        rx="2.2"
        fill="var(--color-brass-500)"
        initial={reduced ? false : { opacity: 0, y: -10, scale: 0.6 }}
        animate={
          reduced
            ? { opacity: 1 }
            : { opacity: [0, 1, 1], y: 0, scale: [0.6, 1.15, 1] }
        }
        transition={{ duration: 0.5, delay: delay + 0.45, ease: [0.34, 1.56, 0.64, 1] }}
      />
      {/* the heartbeat — a ring that breathes off the square */}
      {!reduced && (
        <motion.rect
          x="12.25"
          y="2"
          width="7.5"
          height="7.5"
          rx="2.2"
          fill="none"
          stroke="var(--color-brass-500)"
          strokeWidth="1.5"
          initial={{ opacity: 0, scale: 1 }}
          animate={{ opacity: [0, 0.7, 0], scale: [1, 1.9, 2.4] }}
          style={{ originX: "16px", originY: "5.75px" }}
          transition={{
            duration: 2.6,
            delay: delay + 1.1,
            repeat: Infinity,
            repeatDelay: 1.2,
            ease: "easeOut",
          }}
        />
      )}
    </svg>
  );
}
