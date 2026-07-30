"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";

/**
 * Lease language in, testable rules out.
 *
 * The left panel is the operative clause exactly as it would read in the
 * document. The right panel is what Breakpoint pulls out of it. Hover
 * either side and the other lights up, so the extraction is auditable
 * rather than magic — every field points back at its source text.
 */

type FieldId = "anchor" | "inline" | "occupancy" | "remedy" | "notice" | "term";

type Part = { text: string; id?: FieldId };

const CLAUSE: Part[] = [
  { text: "If at any time following the Commencement Date (a) " },
  {
    text:
      "fewer than two (2) of the Named Anchor Tenants are open and operating for business",
    id: "anchor",
  },
  { text: ", or (b) " },
  {
    text:
      "fewer than four (4) of the Named Inline Tenants are open and operating for business",
    id: "inline",
  },
  { text: ", or (c) " },
  {
    text:
      "less than seventy percent (70%) of the Gross Leasable Area of the Shopping Center, excluding Anchor Premises, is occupied by tenants open and operating for business",
    id: "occupancy",
  },
  { text: ", then Tenant shall be entitled to pay, in lieu of Minimum Annual Rent, Alternative Rent equal to " },
  {
    text:
      "the lesser of (i) Minimum Annual Rent or (ii) four percent (4%) of Gross Sales",
    id: "remedy",
  },
  { text: ", " },
  {
    text:
      "commencing on the first day of the calendar month following the date on which Tenant delivers written notice to Landlord",
    id: "notice",
  },
  { text: " of such condition, and continuing until such condition is cured. Should such condition continue for " },
  {
    text:
      "twelve (12) consecutive months, Tenant may terminate this Lease upon ninety (90) days' prior written notice",
    id: "term",
  },
  { text: "." },
];

type Field = {
  id: FieldId;
  group: "Test" | "Remedy" | "Right";
  label: string;
  value: string;
  tone: "petrol" | "brass" | "clay";
};

const FIELDS: Field[] = [
  {
    id: "anchor",
    group: "Test",
    label: "Named anchor floor",
    value: "≥ 2 of 3 open & operating",
    tone: "petrol",
  },
  {
    id: "inline",
    group: "Test",
    label: "Named inline floor",
    value: "≥ 4 of 6 open & operating",
    tone: "petrol",
  },
  {
    id: "occupancy",
    group: "Test",
    label: "Occupancy floor",
    value: "≥ 70% of non-anchor GLA",
    tone: "petrol",
  },
  {
    id: "remedy",
    group: "Remedy",
    label: "Alternative rent",
    value: "lesser of min. rent or 4% of gross sales",
    tone: "brass",
  },
  {
    id: "notice",
    group: "Remedy",
    label: "Commencement",
    value: "1st of month after written notice",
    tone: "brass",
  },
  {
    id: "term",
    group: "Right",
    label: "Termination",
    value: "after 12 consecutive months · 90 days' notice",
    tone: "clay",
  },
];

const CYCLE_MS = 2600;

const highlight: Record<Field["tone"], string> = {
  petrol: "bg-petrol-100 text-petrol-900",
  brass: "bg-brass-200 text-brass-700",
  clay: "bg-clay-100 text-clay-700",
};

const dot: Record<Field["tone"], string> = {
  petrol: "bg-petrol-600",
  brass: "bg-brass-500",
  clay: "bg-clay-500",
};

export function ClauseReader() {
  const [active, setActive] = useState<FieldId | null>(null);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    if (pinned) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      setActive((cur) => {
        const i = FIELDS.findIndex((f) => f.id === cur);
        return FIELDS[(i + 1) % FIELDS.length].id;
      });
    }, CYCLE_MS);
    return () => window.clearInterval(id);
  }, [pinned]);

  const toneOf = (id: FieldId) => FIELDS.find((f) => f.id === id)!.tone;

  return (
    <div
      className="grid gap-5 lg:grid-cols-[1.15fr_1fr] lg:gap-6"
      onMouseLeave={() => setPinned(false)}
    >
      {/* ---- the document ---- */}
      <div className="flex flex-col rounded-xl border border-line bg-surface p-6 lift sm:p-8">
        <div className="flex items-baseline justify-between gap-4 border-b border-line pb-4">
          <span className="label text-muted">Executed lease · § 4.3</span>
          <span className="text-xs text-faint">Ongoing Co-Tenancy</span>
        </div>

        <p className="mt-6 flex-1 text-[0.9375rem] leading-[1.85] text-ink-soft sm:text-base">
          {CLAUSE.map((part, i) =>
            part.id ? (
              <mark
                key={i}
                onMouseEnter={() => {
                  setActive(part.id!);
                  setPinned(true);
                }}
                className={cn(
                  "-mx-0.5 cursor-default rounded-[3px] px-0.5 transition-all duration-500",
                  active === part.id
                    ? highlight[toneOf(part.id)]
                    : "bg-transparent text-ink-soft",
                )}
              >
                {part.text}
              </mark>
            ) : (
              <span key={i}>{part.text}</span>
            ),
          )}
        </p>
        <p className="mt-6 border-t border-line pt-4 text-xs leading-relaxed text-muted">
          Hover any highlighted passage — the rule extracted from it lights up
          on the right. Every field points back to its source sentence.
        </p>
      </div>

      {/* ---- what comes out ---- */}
      <div className="rounded-xl border border-petrol-800 bg-petrol-800 p-6 sm:p-8">
        <div className="flex items-baseline justify-between gap-4 border-b border-white/15 pb-4">
          <span className="label text-brass-400">Extracted rule set</span>
          <span className="text-xs text-cream-faint">6 fields</span>
        </div>

        <ul className="mt-5 space-y-2">
          {FIELDS.map((f) => {
            const on = active === f.id;
            return (
              <li key={f.id}>
                <button
                  type="button"
                  onMouseEnter={() => {
                    setActive(f.id);
                    setPinned(true);
                  }}
                  onFocus={() => {
                    setActive(f.id);
                    setPinned(true);
                  }}
                  className={cn(
                    "w-full rounded-lg px-3 py-3 text-left transition-colors duration-400",
                    on ? "bg-white/10" : "hover:bg-white/5",
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <motion.span
                      className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dot[f.tone])}
                      animate={{ scale: on ? 1.6 : 1, opacity: on ? 1 : 0.5 }}
                      transition={{ duration: 0.35 }}
                    />
                    <span className="label text-cream-soft">{f.group}</span>
                    <span
                      className={cn(
                        "ml-auto text-sm font-semibold text-cream transition-colors duration-300",
                      )}
                    >
                      {f.label}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "mt-1.5 block pl-4 text-[0.8125rem] font-medium leading-snug transition-colors duration-300",
                      on ? "text-brass-200" : "text-cream-soft",
                    )}
                  >
                    {f.value}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <p className="mt-6 border-t border-white/15 pt-4 text-xs leading-relaxed text-cream-soft">
          Every field carries a pointer back to the clause it came from, so a
          lease administrator can audit the abstraction instead of trusting it.
        </p>
      </div>
    </div>
  );
}
