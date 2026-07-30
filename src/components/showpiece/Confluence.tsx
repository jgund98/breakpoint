"use client";

import { useReducedMotion } from "motion/react";
import { LogoMark } from "@/components/brand/Logo";
import { cn } from "@/lib/cn";

/**
 * The confluence — Breakpoint's whole thesis as one animated figure.
 *
 * Two streams converge: your documents (left) and the center's reality
 * (right). They meet at the engine, and what comes out the bottom is
 * money math. Signal dots ride the paths on loop via SMIL, so the
 * figure runs with zero JS after mount.
 */

const LEFT = [
  { y: 16, label: "Executed lease" },
  { y: 38, label: "Amendments" },
  { y: 60, label: "Store list & rent" },
  { y: 82, label: "Gross sales" },
];

const RIGHT = [
  { y: 16, label: "Closure signals" },
  { y: 38, label: "Filings & permits" },
  { y: 60, label: "Property research" },
  { y: 82, label: "Field verification" },
];

const OUT = [
  { x: 26, label: "Potential trigger flagged" },
  { x: 50, label: "Estimated rent relief" },
  { x: 74, label: "Review package" },
];

/** Path coordinate space: 1000 × 460. Hub sits at (500, 210). */
const HUB = { x: 500, y: 210 };
const leftPath = (y: number) =>
  `M 165 ${y * 4.6} C 320 ${y * 4.6}, 380 ${HUB.y}, ${HUB.x - 36} ${HUB.y}`;
const rightPath = (y: number) =>
  `M 835 ${y * 4.6} C 680 ${y * 4.6}, 620 ${HUB.y}, ${HUB.x + 36} ${HUB.y}`;
const outPath = (x: number) =>
  `M ${HUB.x} ${HUB.y + 36} C ${HUB.x} 330, ${x * 10} 340, ${x * 10} 396`;

export function Confluence({ className }: { className?: string }) {
  const reduced = useReducedMotion();

  return (
    <div className={cn("relative", className)}>
      {/* ---------- desktop figure ---------- */}
      <div className="relative hidden aspect-1000/460 w-full lg:block">
        {/* connective tissue */}
        <svg
          viewBox="0 0 1000 460"
          className="absolute inset-0 h-full w-full"
          aria-hidden
        >
          {[...LEFT.map((c) => leftPath(c.y)), ...RIGHT.map((c) => rightPath(c.y))].map(
            (d, i) => (
              <g key={i}>
                <path d={d} fill="none" stroke="var(--color-line)" strokeWidth="1.5" />
                {!reduced && (
                  <circle r="3.5" fill="var(--color-petrol-600)">
                    <animateMotion
                      dur="3.2s"
                      begin={`${(i % 4) * 0.8 + (i > 3 ? 0.4 : 0)}s`}
                      repeatCount="indefinite"
                      path={d}
                    />
                  </circle>
                )}
              </g>
            ),
          )}
          {OUT.map((o, i) => {
            const d = outPath(o.x);
            return (
              <g key={o.label}>
                <path d={d} fill="none" stroke="var(--color-brass-200)" strokeWidth="1.5" />
                {!reduced && (
                  <circle r="4" fill="var(--color-brass-500)">
                    <animateMotion
                      dur="2.6s"
                      begin={`${i * 0.9 + 0.5}s`}
                      repeatCount="indefinite"
                      path={d}
                    />
                  </circle>
                )}
              </g>
            );
          })}
        </svg>

        {/* stream headings */}
        <span className="label absolute left-0 top-0 text-muted">
          Your documents
        </span>
        <span className="label absolute right-0 top-0 text-muted">
          The center&#8217;s reality
        </span>
        <span className="label absolute bottom-0 left-1/2 -translate-x-1/2 text-brass-700">
          Your answer
        </span>

        {/* input chips */}
        {LEFT.map((c) => (
          <Chip key={c.label} style={{ left: 0, top: `${c.y}%` }} align="left">
            {c.label}
          </Chip>
        ))}
        {RIGHT.map((c) => (
          <Chip key={c.label} style={{ right: 0, top: `${c.y}%` }} align="right">
            {c.label}
          </Chip>
        ))}

        {/* the engine */}
        <div
          className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ top: "45.6%" }}
        >
          <div className="relative mx-auto grid h-[76px] w-[76px] place-items-center rounded-2xl bg-linear-to-b from-petrol-700 to-petrol-900 text-cream shadow-[0_16px_40px_-12px_rgba(47,42,155,0.6)] ring-1 ring-white/15 ring-inset">
            <span className="absolute inset-0 animate-ping rounded-2xl bg-petrol-600/20 [animation-duration:3s]" />
            <LogoMark className="relative h-8 w-8" />
          </div>
          <p className="mt-2 text-center text-[0.6875rem] font-semibold text-petrol-800">
            The Breakpoint engine
          </p>
        </div>

        {/* outcome chips */}
        {OUT.map((o) => (
          <span
            key={o.label}
            className="absolute -translate-x-1/2 rounded-full bg-brass-500 px-4 py-2 text-[0.8125rem] font-semibold whitespace-nowrap text-petrol-950 shadow-md"
            style={{ left: `${o.x}%`, top: "84%" }}
          >
            {o.label}
          </span>
        ))}
      </div>

      {/* ---------- compact figure: same story, stacked ---------- */}
      <div className="lg:hidden">
        <p className="label text-center text-muted">Your documents + the center&#8217;s reality</p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {[...LEFT, ...RIGHT].map((c) => (
            <span
              key={c.label}
              className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-soft"
            >
              {c.label}
            </span>
          ))}
        </div>
        <div className="mx-auto mt-4 h-8 w-px bg-linear-to-b from-line to-petrol-600" />
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-petrol-800 text-cream shadow-lg">
          <LogoMark className="h-7 w-7" />
        </div>
        <p className="mt-2 text-center text-[0.6875rem] font-semibold text-petrol-800">
          The Breakpoint engine
        </p>
        <div className="mx-auto mt-2 h-8 w-px bg-linear-to-b from-petrol-600 to-brass-500" />
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {OUT.map((o) => (
            <span
              key={o.label}
              className="rounded-full bg-brass-500 px-3.5 py-1.5 text-xs font-semibold text-petrol-950"
            >
              {o.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Chip({
  children,
  style,
  align,
}: {
  children: React.ReactNode;
  style: React.CSSProperties;
  align: "left" | "right";
}) {
  return (
    <span
      className={cn(
        "absolute -translate-y-1/2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-[0.8125rem] font-medium whitespace-nowrap text-ink-soft shadow-[0_1px_2px_rgba(20,20,46,0.06)]",
        align === "left" ? "text-left" : "text-right",
      )}
      style={style}
    >
      {children}
    </span>
  );
}
