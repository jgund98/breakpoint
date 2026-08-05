"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/cn";

/**
 * THE INDICATOR, ANIMATED
 *
 * The house mark assembling: the column rises, the brass tittle drops
 * onto it, and a survey highlight sweeps ACROSS the glyph rather than
 * past it. The sweep is clipped to the mark's own silhouette, so the
 * light appears to travel over the letterform instead of sliding by in
 * the margin.
 *
 * Transform and opacity only, clipped in SVG, so it composites cheaply
 * and never touches the scroll law.
 */

export function BrandMark({
  size = 80,
  tone = "light",
  sweep = true,
  className,
  onDone,
}: {
  size?: number;
  /** "light" draws on a dark ground, "dark" on white. */
  tone?: "light" | "dark";
  sweep?: boolean;
  className?: string;
  onDone?: () => void;
}) {
  const column = tone === "light" ? "var(--color-cream)" : "var(--color-petrol-800)";
  const id = tone === "light" ? "mk-l" : "mk-d";

  return (
    <svg
      viewBox="0 0 80 80"
      width={size}
      height={size}
      className={cn("overflow-visible", className)}
      role="img"
      aria-label="Breakpoint"
    >
      <defs>
        {/* the glyph silhouette, used to clip the highlight */}
        <clipPath id={`${id}-clip`}>
          <rect x="34" y="34" width="12" height="34" rx="2" />
          <rect x="34" y="14" width="12" height="12" rx="2" />
        </clipPath>

        <linearGradient id={`${id}-sweep`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fff" stopOpacity="0" />
          <stop offset="45%" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="55%" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* the column rises */}
      <motion.rect
        x="34"
        y="34"
        width="12"
        height="34"
        rx="2"
        fill={column}
        initial={{ scaleY: 0, opacity: 0 }}
        animate={{ scaleY: 1, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        style={{ transformOrigin: "40px 68px" }}
      />

      {/* the tittle drops in and settles */}
      <motion.rect
        x="34"
        y="14"
        width="12"
        height="12"
        rx="2"
        fill="var(--color-brass-500)"
        initial={{ y: -22, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.5 }}
        onAnimationComplete={onDone}
      />

      {/* it registers: a ring leaves the tittle once, then repeats slowly */}
      <motion.circle
        cx="40"
        cy="20"
        r="6"
        fill="none"
        stroke="var(--color-brass-400)"
        strokeWidth="1.5"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: [0.6, 2.4], opacity: [0, 0.75, 0] }}
        transition={{
          duration: 2.2,
          delay: 0.95,
          repeat: Infinity,
          repeatDelay: 1.4,
          ease: "easeOut",
        }}
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      />

      {/* the survey highlight, clipped to the glyph */}
      {sweep && (
        <g clipPath={`url(#${id}-clip)`}>
          <motion.rect
            y="0"
            width="26"
            height="80"
            fill={`url(#${id}-sweep)`}
            initial={{ x: 10 }}
            animate={{ x: [10, 60] }}
            transition={{
              duration: 1.5,
              delay: 1.1,
              repeat: Infinity,
              repeatDelay: 1.8,
              ease: [0.4, 0, 0.2, 1],
            }}
          />
        </g>
      )}
    </svg>
  );
}
