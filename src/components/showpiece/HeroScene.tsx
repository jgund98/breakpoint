"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";

/**
 * The hero's full-bleed scene: a real aerial of American retail with
 * Breakpoint's annotation layer living on top of it. The photograph
 * drifts like a survey flight, a scan beam sweeps the corridor, and
 * one of the centers escalates into a failed test while you watch.
 *
 * The whole product, before a word of copy is read.
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
  flip?: boolean;
};

const MARKERS: Marker[] = [
  { id: "m1", x: 46, y: 30, name: "Northgate Commons", value: "92.4%", state: "ok" },
  { id: "m2", x: 84, y: 22, name: "Vermont Plaza", value: "88.1%", state: "ok", flip: true },
  {
    id: "m3",
    x: 56,
    y: 62,
    name: "Fairmount Collection",
    value: "70.4%",
    state: "watch",
    escalated: { value: "67.8%", note: "§4.3(c) test failed · review ready" },
  },
  { id: "m4", x: 87, y: 48, name: "Kestrel Pointe", value: "71.2%", state: "watch", flip: true },
];

const CYCLE_MS = 4200;

export function HeroScene() {
  const [escalated, setEscalated] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) {
      setEscalated(true);
      return;
    }
    const id = window.setInterval(() => setEscalated((v) => !v), CYCLE_MS);
    return () => window.clearInterval(id);
  }, [reduced]);

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      {/* the flight — a slow drift across the corridor */}
      <motion.div
        className="absolute inset-0 will-change-transform"
        initial={false}
        animate={
          reduced
            ? { scale: 1.02 }
            : { scale: [1.02, 1.1], x: ["0%", "-2%"], y: ["0%", "-1.5%"] }
        }
        transition={
          reduced
            ? undefined
            : {
                duration: 30,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "linear",
              }
        }
      >
        <Image
          src="/photos/aerial-oceanside-ca.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover brightness-[0.92] contrast-[1.08] saturate-[1.15]"
        />
      </motion.div>

      {/* grade — deep petrol out of the left, floor into the wire */}
      <div className="absolute inset-0 bg-linear-to-r from-petrol-950/95 via-petrol-950/72 to-petrol-950/15 sm:via-45% sm:to-80%" />
      <div className="absolute inset-0 bg-linear-to-t from-petrol-950/85 via-transparent to-petrol-950/35 sm:from-petrol-950/70" />
      <div className="plan-grid-dark absolute inset-0 opacity-30" />

      {/* the survey beam */}
      {!reduced && (
        <div className="anim-scan absolute inset-y-0 left-0 w-[24vw] bg-linear-to-r from-transparent via-white/8 to-transparent" />
      )}

      {/* annotation layer — desktop */}
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
              delay: 0.4 + i * 0.16,
              ease: [0.22, 1, 0.36, 1],
            }}
            className={cn(
              "absolute z-10 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-2 lg:flex",
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

      {/* annotation layer — one live chip on phones, parked above the wire */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
        className="absolute bottom-20 right-4 z-10 flex items-center gap-2 lg:hidden"
      >
        <Pin state={escalated ? "fail" : "watch"} />
        <Chip
          name="Fairmount Collection"
          value={escalated ? "67.8%" : "70.4%"}
          state={escalated ? "fail" : "watch"}
          note={escalated ? "§4.3(c) test failed" : undefined}
        />
      </motion.div>

      {/* sheet caption */}
      <span className="label absolute bottom-5 left-5 z-10 hidden text-cream/60 sm:block sm:left-8">
        Portfolio view — 4 of 214 centers · sample data
      </span>
    </div>
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
