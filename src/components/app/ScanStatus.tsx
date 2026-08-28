"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { prettyDate } from "@/lib/clause";
import { activitySummary, sweeps } from "@/lib/activity";
import { coverage } from "@/lib/coverage";
import { cn } from "@/lib/cn";

/**
 * SCAN STATUS
 *
 * The system's pulse, not a date stamp.
 *
 * A client paying to be watched needs to see the watch running every
 * time they open the product, especially in a period when nothing has
 * been found. So this states what the last pass actually did, how much
 * it checked, and when the next one lands, with a live indicator that
 * makes it read as a running service rather than a footer.
 */
export function ScanStatus({ compact = false }: { compact?: boolean }) {
  const last = sweeps[0];
  const [elapsed, setElapsed] = useState(0);

  // A slow sweep of the meter, so the block reads as alive without
  // animating anything expensive.
  useEffect(() => {
    const t = window.setInterval(() => setElapsed((e) => (e + 1) % 100), 90);
    return () => window.clearInterval(t);
  }, []);

  const daysAgo = activitySummary.daysSinceLastSweep;

  return (
    <Link
      href="/app/activity"
      className={cn(
        "group block border-t border-slate-100 transition-colors duration-250 hover:bg-slate-50",
        compact ? "px-5 py-3.5" : "px-5 py-4",
      )}
    >
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <motion.span
            className="absolute inline-flex h-full w-full rounded-full bg-emerald-500"
            animate={{ scale: [1, 2.4], opacity: [0.55, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
          />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <span className="text-[0.6875rem] font-semibold tracking-wide text-emerald-600 uppercase">
          Monitoring active
        </span>
      </div>

      <p className="tnum mt-2 text-[0.8125rem] font-medium text-slate-900">
        Last scan {daysAgo === 0 ? "today" : `${daysAgo}d ago`}
        <span className="ml-1.5 font-normal text-slate-500">
          {prettyDate(last?.ranOn ?? activitySummary.lastSweep)}
        </span>
      </p>

      {/* what that pass actually did */}
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
        {[
          [coverage.storesWatched.toLocaleString("en-US"), "stores"],
          [String(last?.changes ?? 0), last?.changes === 1 ? "change" : "changes"],
        ].map(([v, k]) => (
          <p key={k} className="text-[0.6875rem] text-slate-500">
            <span className="tnum font-semibold text-slate-700">{v}</span> {k}
          </p>
        ))}
      </div>

      {/* the running meter */}
      <div className="mt-2.5 h-0.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-amber-400 transition-[width] duration-100 ease-linear"
          style={{ width: `${elapsed}%` }}
        />
      </div>

      <p className="mt-2 text-[0.6875rem] leading-snug text-slate-500">
        Next full report {prettyDate(coverage.nextSweepISO)}
        <span className="block text-slate-400 transition-colors group-hover:text-indigo-600">
          View scan history
        </span>
      </p>
    </Link>
  );
}
