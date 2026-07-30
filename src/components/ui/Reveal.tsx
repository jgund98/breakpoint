"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/cn";

/**
 * Scroll-reveal primitive. Fade + lift, once, GPU-only. Use `delay`
 * (seconds) for stagger inside a row of cards.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  y = 22,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  y?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-70px" }}
      transition={{ duration: 0.65, delay, ease: [0.16, 1, 0.3, 1] }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}
