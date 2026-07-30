"use client";

import { motion } from "motion/react";
import { usd, leaseEconomics } from "@/lib/center";

/* ==================================================================
   WATCH — occupancy, reconstructed month by month
   ================================================================== */

const SERIES = [
  91.2, 91.2, 90.8, 90.8, 90.8, 89.4, 89.4, 88.1, 88.1, 86.3, 84.7, 84.7,
  82.9, 80.4, 78.8, 77.1, 75.6, 73.2, 71.8, 70.9, 69.4, 68.6, 67.8, 67.8,
];
const FLOOR = 70;
const W = 560;
const H = 190;
const PAD = 8;

function scaleY(v: number) {
  const min = 64;
  const max = 94;
  return PAD + (1 - (v - min) / (max - min)) * (H - PAD * 2);
}
function scaleX(i: number) {
  return PAD + (i / (SERIES.length - 1)) * (W - PAD * 2);
}

const linePath = SERIES.map(
  (v, i) => `${i === 0 ? "M" : "L"}${scaleX(i).toFixed(1)},${scaleY(v).toFixed(1)}`,
).join(" ");

const areaPath = `${linePath} L${scaleX(SERIES.length - 1).toFixed(1)},${H - PAD} L${PAD},${H - PAD} Z`;

const crossIndex = SERIES.findIndex((v) => v < FLOOR);

export function OccupancyTrace() {
  return (
    <div className="rounded-xl border border-line bg-surface p-5 lift sm:p-6">
      <div className="flex items-baseline justify-between gap-4">
        <span className="label text-muted">Occupied GLA · 24 months</span>
        <span className="tnum text-sm font-semibold text-brass-700">67.8%</span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-4 w-full"
        role="img"
        aria-label="Occupancy declining from 91% to 67.8% and crossing the 70% floor"
      >
        <defs>
          <linearGradient id="occFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-petrol-600)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--color-petrol-600)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* the floor */}
        <line
          x1={PAD}
          x2={W - PAD}
          y1={scaleY(FLOOR)}
          y2={scaleY(FLOOR)}
          stroke="var(--color-clay-500)"
          strokeWidth="1.5"
          strokeDasharray="5 4"
        />
        <text
          x={W - PAD}
          y={scaleY(FLOOR) - 7}
          textAnchor="end"
          className="fill-clay-600 text-[11px] font-medium"
        >
          70% floor
        </text>

        <motion.path
          d={areaPath}
          fill="url(#occFill)"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.5 }}
        />
        <motion.path
          d={linePath}
          fill="none"
          stroke="var(--color-petrol-700)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
        />

        {/* the crossing */}
        <motion.g
          initial={{ opacity: 0, scale: 0.6 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 1.35 }}
          style={{ transformOrigin: `${scaleX(crossIndex)}px ${scaleY(SERIES[crossIndex])}px` }}
        >
          <circle
            cx={scaleX(crossIndex)}
            cy={scaleY(SERIES[crossIndex])}
            r="6"
            className="fill-clay-500"
          />
          <circle
            cx={scaleX(crossIndex)}
            cy={scaleY(SERIES[crossIndex])}
            r="11"
            className="fill-clay-500/20"
          />
        </motion.g>
      </svg>

      <p className="mt-3 border-t border-line pt-3 text-xs text-muted">
        Rebuilt from filings, closure notices, permit activity and field
        verification — then held as a dated record you can attach to a notice.
      </p>
    </div>
  );
}

/* ==================================================================
   TRIGGER — what lands in the inbox
   ================================================================== */

export function TriggerAlert() {
  return (
    <div className="rounded-xl border border-line bg-surface lift">
      <div className="flex items-center gap-2.5 border-b border-line px-5 py-3.5">
        <span className="h-2 w-2 rounded-full bg-brass-500 anim-pulse-dot" />
        <span className="label text-brass-700">Co-tenancy failure</span>
        <span className="ml-auto text-xs text-faint">2 min ago</span>
      </div>

      <div className="p-5">
        <p className="text-[0.9375rem] font-semibold text-ink">
          Fairmount Collection — store 4412
        </p>
        <p className="mt-1 text-sm text-muted">Dublin, OH · Unit 214 · 3,850 SF</p>

        <ul className="mt-4 space-y-2 border-t border-line pt-4">
          <li className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-muted">§4.3(b) named inline</span>
            <span className="tnum font-medium text-clay-600">3 of 6 · failed</span>
          </li>
          <li className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-muted">§4.3(c) occupancy</span>
            <span className="tnum font-medium text-clay-600">67.8% · failed</span>
          </li>
          <li className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-muted">Remedy</span>
            <span className="tnum font-medium text-ink">4% of gross sales</span>
          </li>
        </ul>

        <div className="mt-4 rounded-lg bg-brass-50 px-4 py-3">
          <span className="label text-brass-700">Monthly delta</span>
          <p className="tnum mt-1 font-display text-2xl leading-none text-brass-700">
            {usd(leaseEconomics.monthlyDelta)}
          </p>
        </div>

        <div className="mt-4 flex gap-2">
          <span className="flex-1 rounded-full bg-petrol-800 px-4 py-2.5 text-center text-[0.8125rem] font-medium text-cream">
            Open claim packet
          </span>
          <span className="rounded-full border border-line px-4 py-2.5 text-center text-[0.8125rem] font-medium text-ink-soft">
            Assign
          </span>
        </div>
      </div>
    </div>
  );
}

/* ==================================================================
   CLAIM — the packet that goes to the landlord
   ================================================================== */

const EXHIBITS = [
  { label: "Notice of co-tenancy failure", meta: "Draft letter · 2 pp" },
  { label: "Clause abstract with citations", meta: "§4.3(a)–(c) · sourced" },
  { label: "Occupancy record", meta: "24 months · dated evidence" },
  { label: "Named tenant status log", meta: "6 tenants · closure dates" },
  { label: "Alternative rent calculation", meta: "TTM sales · 4% workings" },
];

export function ClaimPacket() {
  return (
    <div className="rounded-xl border border-line bg-surface p-5 lift sm:p-6">
      <div className="flex items-baseline justify-between gap-4 border-b border-line pb-4">
        <span className="label text-muted">Claim packet</span>
        <span className="text-xs text-faint">Store 4412</span>
      </div>

      <ul className="mt-4 space-y-1">
        {EXHIBITS.map((e, i) => (
          <motion.li
            key={e.label}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.45, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-petrol-50"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-petrol-50 text-petrol-700">
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden>
                <path
                  d="M3.5 1.5h5.2L12.5 5.3v9.2H3.5z"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinejoin="round"
                />
                <path d="M8.6 1.6v3.8h3.8" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.875rem] font-medium text-ink">
                {e.label}
              </span>
              <span className="block truncate text-xs text-muted">{e.meta}</span>
            </span>
          </motion.li>
        ))}
      </ul>

      <p className="mt-4 border-t border-line pt-4 text-xs leading-relaxed text-muted">
        Your counsel sends it. Breakpoint assembles it, cites it, and timestamps
        the day the condition became provable.
      </p>
    </div>
  );
}
