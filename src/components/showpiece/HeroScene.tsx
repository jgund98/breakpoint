"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
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
    escalated: { value: "67.8%", note: "Potential trigger · est. $18.9K/mo" },
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
  // Phone spotlight: which center the feed is visiting (MARKERS index).
  const [spot, setSpot] = useState(0);
  const reduced = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  // Everything pauses the moment the panel leaves the viewport — no
  // rAF ticking, no timers, no compositing work while offscreen.
  const inView = useInView(ref, { margin: "10% 0px" });
  const live = inView && !reduced;

  // Walk the portfolio: two healthy centers, one on watch, then dwell
  // on Fairmount while it trips. Ends where the money is.
  useEffect(() => {
    if (reduced) {
      setSpot(2);
      return;
    }
    if (!inView) return;
    const ORDER = [0, 1, 3, 2];
    let idx = 0;
    let t: number;
    const next = () => {
      idx = (idx + 1) % ORDER.length;
      setSpot(ORDER[idx]);
      t = window.setTimeout(next, ORDER[idx] === 2 ? 3800 : 1900);
    };
    t = window.setTimeout(next, 1900);
    return () => window.clearTimeout(t);
  }, [inView, reduced]);

  useEffect(() => {
    if (reduced) {
      setEscalated(true);
      return;
    }
    if (!inView) return;
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
  }, [reduced, inView]);

  return (
    <figure
      ref={ref}
      className={cn(
        "relative overflow-hidden rounded-xl bg-petrol-900 ring-inset transition-shadow duration-700 lift-lg",
        escalated
          ? "shadow-[0_0_0_2px_var(--color-brass-500),0_24px_60px_-28px_rgba(20,20,46,0.4)]"
          : "shadow-[0_0_0_0px_transparent]",
        className,
      )}
    >
      <div className="relative aspect-4/3 w-full overflow-hidden sm:aspect-3/2">
        {/* the flight — pure CSS, paused offscreen, never on the main
            thread */}
        <div
          className={cn(
            "anim-kenburns absolute inset-0",
            !live && "anim-paused",
          )}
        >
          <Image
            src="/photos/aerial-oceanside-ca.jpg"
            alt="Aerial view of a retail corridor of shopping centers and parking fields"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 52vw"
            className="object-cover contrast-[1.1] saturate-[1.18]"
          />
        </div>

        {/* warm grade so the photo belongs to the brand */}
        <div className="pointer-events-none absolute inset-0 bg-petrol-900/12 mix-blend-multiply" />
        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-petrol-950/78 via-transparent to-petrol-950/20" />

        {/* the survey beam */}
        {live && (
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
                "absolute z-10 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-2 sm:flex",
                m.flip && "flex-row-reverse",
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

        {/* the money moment — when the beam trips the test, the number
            the whole company exists to find rises off the map */}
        <AnimatePresence>
          {escalated && (
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -14, scale: 0.95 }}
              transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
              className="pointer-events-none absolute z-20 hidden sm:block"
              style={{ left: "34%", top: "38%" }}
            >
              <div className="-translate-x-1/2 text-center">
                <p className="tnum font-display text-[clamp(1.6rem,2.6vw,2.25rem)] leading-none text-brass-400 drop-shadow-[0_2px_12px_rgba(16,13,46,0.8)]">
                  +$18,917<span className="text-[0.55em]">/mo</span>
                </p>
                <p className="mt-1 text-[0.6875rem] font-semibold tracking-tight text-cream/90">
                  potential co-tenancy rent identified
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* phone: live pins on the photo + a spotlight feed that walks
            the portfolio — every center gets its moment, Fairmount
            lands the money. */}
        <div className="sm:hidden">
          {MARKERS.map((m, i) => {
            const isSpot = i === spot;
            const isFail = Boolean(m.escalated) && isSpot;
            return (
              <span
                key={m.id}
                className={cn(
                  "absolute z-10 transition-all duration-500",
                  isSpot ? "scale-125 opacity-100" : "scale-90 opacity-45",
                )}
                style={{
                  left: `${m.x}%`,
                  top: `${m.y}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <Pin state={isFail ? "fail" : m.state} />
              </span>
            );
          })}

          <AnimatePresence>
            {Boolean(MARKERS[spot].escalated) && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
                className="tnum font-display pointer-events-none absolute inset-x-0 top-[30%] z-10 text-center text-2xl leading-none text-brass-400 drop-shadow-[0_2px_12px_rgba(16,13,46,0.8)]"
              >
                +$18,917<span className="text-[0.6em]">/mo</span>
              </motion.p>
            )}
          </AnimatePresence>

          <div className="absolute inset-x-4 bottom-12 z-10 flex flex-col items-center gap-2">
            <AnimatePresence mode="wait">
              <motion.div
                key={spot}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center gap-2"
              >
                <Pin
                  state={
                    MARKERS[spot].escalated ? "fail" : MARKERS[spot].state
                  }
                />
                <Chip
                  name={MARKERS[spot].name}
                  value={
                    MARKERS[spot].escalated?.value ?? MARKERS[spot].value
                  }
                  state={
                    MARKERS[spot].escalated ? "fail" : MARKERS[spot].state
                  }
                  note={
                    MARKERS[spot].escalated
                      ? "Potential trigger · est. $18.9K/mo"
                      : undefined
                  }
                />
              </motion.div>
            </AnimatePresence>
            <span className="flex gap-1.5">
              {MARKERS.map((m, i) => (
                <span
                  key={m.id}
                  className={cn(
                    "h-1 w-1 rounded-full transition-all duration-300",
                    i === spot ? "w-3 bg-brass-400" : "bg-white/40",
                  )}
                />
              ))}
            </span>
          </div>
        </div>

        {/* sheet caption */}
        <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4 sm:p-5">
          <span className="label text-cream/75">
            Portfolio view · 4 of 214 centers
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
      className={cn(
        "flex flex-col rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-lg transition-colors duration-500",
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
        <span className="mt-0.5 text-[0.625rem] font-semibold tracking-tight opacity-90">
          {note}
        </span>
      )}
    </motion.span>
  );
}
