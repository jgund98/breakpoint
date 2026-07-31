"use client";

import { useRef } from "react";
import { useInView } from "motion/react";
import { cn } from "@/lib/cn";

/**
 * The wire — what the product actually emits. A visitor should
 * recognize the shape of their own portfolio in these lines before
 * they scroll past.
 */

type Kind = "fail" | "watch" | "clear" | "info";

const events: { kind: Kind; tag: string; body: string }[] = [
  {
    kind: "fail",
    tag: "Potential trigger",
    body: "Fairmount Collection · occupancy 67.8% against a 70.0% floor · est. $18,917/mo · review ready",
  },
  {
    kind: "watch",
    tag: "Named tenant dark",
    body: "Brookfield Court · 7,400 SF · named inline count 4 → 3 · verified",
  },
  {
    kind: "fail",
    tag: "Cure window expired",
    body: "Redwood Galleria · 90-day landlord cure elapsed · remedy available pending notice",
  },
  {
    kind: "info",
    tag: "Anchor closure filed",
    body: "Stonebridge Commons · 138,000 SF · 14 leases reference this anchor",
  },
  {
    kind: "clear",
    tag: "Condition cured",
    body: "Ashford Crossing · occupancy 71.4% · remedy period ends at month close",
  },
  {
    kind: "info",
    tag: "Review package ready",
    body: "Fairmount Collection · store 4412 · clause, evidence and calculations for counsel",
  },
  {
    kind: "watch",
    tag: "Approaching floor",
    body: "Kestrel Pointe · 71.2% and falling · 2 leases within 1.2 points",
  },
];

const dot: Record<Kind, string> = {
  fail: "bg-brass-500",
  watch: "bg-brass-400",
  clear: "bg-open-600",
  info: "bg-petrol-300",
};

const tagTone: Record<Kind, string> = {
  fail: "text-brass-700",
  watch: "text-brass-700",
  clear: "text-open-700",
  info: "text-petrol-700",
};

function Row({ kind, tag, body }: { kind: Kind; tag: string; body: string }) {
  return (
    <span className="flex shrink-0 items-center gap-2.5 pr-10">
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dot[kind])} />
      <span className={cn("label whitespace-nowrap", tagTone[kind])}>{tag}</span>
      <span className="tnum whitespace-nowrap text-[0.8125rem] text-muted">
        {body}
      </span>
    </span>
  );
}

export function EventWire({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "5% 0px" });
  return (
    <div
      ref={ref}
      className={cn(
        "relative overflow-hidden border-y border-line bg-surface py-3.5",
        className,
      )}
    >
      <div className={cn("anim-marquee flex w-max", !inView && "anim-paused")}>
        {[0, 1].map((copy) => (
          <span key={copy} className="flex" aria-hidden={copy === 1}>
            {events.map((e, i) => (
              <Row key={`${copy}-${i}`} {...e} />
            ))}
          </span>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-linear-to-r from-surface to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-linear-to-l from-surface to-transparent" />
    </div>
  );
}
