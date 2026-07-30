"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";

/**
 * The hero's living panel: a real aerial of American retail with
 * Breakpoint's annotation layer on top, framed as a cinematic card on
 * the white canvas. The photograph drifts like a survey flight, a scan
 * beam sweeps the corridor, and one of the centers escalates into a
 * potential test failure while you watch.
 */

type MarkerState = "ok" | "watch" | "fail";

type Marker = {
  id: string;
  x: number;
  y: number;
  name: string;
  value: string;
  state: MarkerState;
  escalated?: { value: string; note: string };
  /** Hidden on the narrowest screens to stop chips colliding. */
  minor?: boolean;
  flip?: boolean;
};

const MARKERS: Marker[] = [
  { id: "m1", x: 20, y: 24, name: "Northgate Commons", value: "92.4%", state: "ok" },
  { id: "m2", x: 64, y: 15, name: "Vermont Plaza", value: "88.1%", state: "ok", minor: true, flip: true },
  {
    id: "m3",
    x: 34,
    y: 62,
    name: "Fairmount Collection",
    value: "70.4%",
    state: "watch",
    escalated: { value: "67.8%", note: "Potential trigger · est. $18,917/mo relief" },
  },
  { id: "m4", x: 77, y: 46, name: "Kestrel Pointe", value: "71.2%", state: "watch", minor: true, flip: true },
];

/**
 * The escalation is synced to the survey beam (bp-scan, 9s): the beam
 * crosses Fairmount mid-sweep and *that* is when the test trips —
 * cause and effect, on loop.
 */
const BEAM_MS = 9000;
const TRIP_AT = 4200;
const RESET_AT = 8600;

export function HeroScene({ className }: { className?: string }) {
  const [escalated, setEscalated] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) {
      setEscalated(true);
      return;
    }
    let t1: number, t2: number;
    const run = () => {
      t1 = window.setTimeout(() => setEscalated(true), TRIP_AT);
      t2 = window.setTimeout(() => setEscalated(false), RESET_AT);
    };
    run();
    const id = window.setInterval(run, BEAM_MS);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [reduced]);

  return (
    <figure
      className={cn(
        "relative overflow-hidden rounded-xl bg-petrol-900 lift-lg",
        className,
      )}
    >
      <div className="relative aspect-4/3 w-full overflow-hidden sm:aspect-3/2">
        {/* the flight — a slow drift across the corridor */}
        <motion.div
          className="absolute inset-0 will-change-transform"
          initial={false}
          animate={
            reduced
              ? { scale: 1.03 }
              : { scale: [1.03, 1.12], x: ["0%", "-2%"], y: ["0%", "-1.5%"] }
          }
          transition={
            reduced
              ? undefined
              : {
                  duration: 28,
                  repeat: Infinity,
                  repeatType: "reverse",
                  ease: "linear",
                }
          }
        >
          <Image
            src="/photos/aerial-oceanside-ca.jpg"
            alt="Aerial view of a retail corridor of shopping centers and parking fields"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 52vw"
            className="object-cover contrast-[1.1] saturate-[1.18]"
          />
        </motion.div>

        {/* warm grade so the photo belongs to the brand */}
        <div className="pointer-events-none absolute inset-0 bg-petrol-900/12 mix-blend-multiply" />
        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-petrol-950/78 via-transparent to-petrol-950/20" />

        {/* the survey beam */}
        {!reduced && (
          <div className="anim-scan pointer-events-none absolute inset-y-0 left-0 w-[30%] bg-linear-to-r from-transparent via-white/10 to-transparent" />
        )}

        {/* annotation layer */}
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
                delay: 0.35 + i * 0.14,
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
          <span className="label text-cream/75">
            Portfolio view — 4 of 214 centers
          </span>
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
            ? "anim-pulse-dot bg-brass-500/40"
            : state === "watch"
              ? "bg-brass-400/25"
              : "bg-open-600/25",
        )}
      />
      <span
        className={cn(
          "relative h-2 w-2 rounded-full ring-2 ring-white/85 transition-colors duration-500",
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
        "flex flex-col rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-lg backdrop-blur-md transition-colors duration-500",
        state === "fail" ? "bg-brass-500 text-petrol-950" : "bg-white/92 text-ink",
      )}
    >
      <span className="flex items-baseline gap-2">
        <span className="text-[0.6875rem] font-semibold tracking-[-0.01em]">
          {name}
        </span>
        <span className="tnum text-[0.6875rem] font-medium opacity-70">{value}</span>
      </span>
      {note && (
        <span className="label mt-0.5 text-[0.5625rem] opacity-80">{note}</span>
      )}
    </motion.span>
  );
}
