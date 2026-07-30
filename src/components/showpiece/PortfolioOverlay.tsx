"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";

/**
 * A real aerial of American retail with Breakpoint's annotation layer
 * drawn over it — a marker per center, occupancy live on each, and one
 * that escalates into a failed test while you watch.
 *
 * This is the product's whole claim in a single image: your portfolio
 * is out there in the world, and something in it just moved.
 */

type MarkerState = "ok" | "watch" | "fail";

type Marker = {
  id: string;
  x: number;
  y: number;
  name: string;
  value: string;
  state: MarkerState;
  /** Appears only once the sequence escalates. */
  escalated?: { value: string; note: string };
  /** Hidden on the narrowest panels to stop chips colliding. */
  minor?: boolean;
  /** Anchor the chip to the left of the pin instead of the right. */
  flip?: boolean;
};

const MARKERS: Marker[] = [
  { id: "m1", x: 20, y: 26, name: "Northgate Commons", value: "92.4%", state: "ok" },
  { id: "m2", x: 63, y: 17, name: "Vermont Plaza", value: "88.1%", state: "ok", minor: true, flip: true },
  {
    id: "m3",
    x: 34,
    y: 63,
    name: "Fairmount Collection",
    value: "70.4%",
    state: "watch",
    escalated: { value: "67.8%", note: "§4.3(c) failed" },
  },
  { id: "m4", x: 76, y: 52, name: "Kestrel Pointe", value: "71.2%", state: "watch", minor: true, flip: true },
];

/** How long the center sits at watch before the test fails, and back. */
const CYCLE_MS = 4200;

export function PortfolioOverlay({ className }: { className?: string }) {
  const [escalated, setEscalated] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setEscalated(true);
      return;
    }
    const id = window.setInterval(() => setEscalated((v) => !v), CYCLE_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <figure
      className={cn(
        "relative overflow-hidden rounded-xl bg-petrol-900 lift-lg",
        className,
      )}
    >
      <div className="relative aspect-4/3 w-full sm:aspect-3/2">
        <Image
          src="/photos/aerial-oceanside-ca.jpg"
          alt="Aerial view of a retail corridor of shopping centers and parking fields"
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 52vw"
          className="object-cover contrast-[1.1] saturate-[1.18]"
        />

        {/* warm grade so the photo belongs to the brand rather than
            sitting on top of it */}
        <div className="pointer-events-none absolute inset-0 bg-petrol-900/12 mix-blend-multiply" />
        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-petrol-950/75 via-transparent to-transparent" />

        {/* annotation layer — every marker lands within the first
            second, then one of them escalates on a slow loop */}
        {MARKERS.map((m, i) => {
          const isFail = Boolean(m.escalated) && escalated;
          const state: MarkerState = isFail ? "fail" : m.state;
          const value = isFail ? m.escalated!.value : m.value;

          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, scale: 0.75 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: 0.55,
                delay: 0.25 + i * 0.14,
                ease: [0.22, 1, 0.36, 1],
              }}
              className={cn(
                "absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2",
                m.flip && "flex-row-reverse",
                m.minor && "hidden sm:flex",
              )}
              style={{ left: `${m.x}%`, top: `${m.y}%` }}
            >
              <Pin state={state} />
              <Chip
                name={m.name}
                value={value}
                state={state}
                note={isFail ? m.escalated!.note : undefined}
              />
            </motion.div>
          );
        })}

        {/* sheet caption */}
        <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4 sm:p-5">
          <span className="label text-cream/75">Portfolio view — 4 of 214 centers</span>
          <span className="label text-cream/50">Sample data</span>
        </figcaption>
      </div>
    </figure>
  );
}

function Pin({ state }: { state: MarkerState }) {
  return (
    <span className="relative grid h-4 w-4 shrink-0 place-items-center">
      <span
        className={cn(
          "absolute inset-0 rounded-full transition-colors duration-500",
          state === "fail"
            ? "bg-brass-500/35"
            : state === "watch"
              ? "bg-brass-400/25"
              : "bg-open-600/25",
          state === "fail" && "anim-pulse-dot",
        )}
      />
      <span
        className={cn(
          "relative h-2 w-2 rounded-full ring-2 ring-white/80 transition-colors duration-500",
          state === "fail"
            ? "bg-brass-500"
            : state === "watch"
              ? "bg-brass-400"
              : "bg-open-600",
        )}
      />
    </span>
  );
}

function Chip({
  name,
  value,
  state,
  note,
}: {
  name: string;
  value: string;
  state: MarkerState;
  note?: string;
}) {
  return (
    <motion.span
      layout
      className={cn(
        "flex flex-col rounded-lg px-2.5 py-1.5 whitespace-nowrap backdrop-blur-md transition-colors duration-500",
        state === "fail"
          ? "bg-brass-500 text-petrol-950"
          : "bg-white/92 text-ink",
      )}
    >
      <span className="flex items-baseline gap-2">
        <span className="text-[0.6875rem] font-semibold tracking-[-0.01em]">
          {name}
        </span>
        <span className="tnum text-[0.6875rem] font-medium opacity-70">
          {value}
        </span>
      </span>
      {note && (
        <span className="label mt-0.5 text-[0.5625rem] opacity-80">{note}</span>
      )}
    </motion.span>
  );
}
