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
        "group block border-t border-line transition-colors duration-250 hover:bg-petrol-50/50",
        compact ? "px-5 py-3.5" : "px-5 py-4",
      )}
    >
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <motion.span
            className="absolute inline-flex h-full w-full rounded-full bg-open-600"
            animate={{ scale: [1, 2.4], opacity: [0.55, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
          />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-open-600" />
        </span>
        <span className="text-[0.6875rem] font-semibold tracking-wide text-open-700 uppercase">
          Monitoring active
        </span>
      </div>

      <p className="tnum mt-2 text-[0.8125rem] font-medium text-ink">
        Last scan {daysAgo === 0 ? "today" : `${daysAgo}d ago`}
        <span className="ml-1.5 font-normal text-muted">
          {prettyDate(last?.ranOn ?? activitySummary.lastSweep)}
        </span>
      </p>

      {/* what that pass actually did */}
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
        {[
          [coverage.storesWatched.toLocaleString("en-US"), "stores"],
          [coverage.checksPerSweep.toLocaleString("en-US"), "checks"],
          [String(last?.changes ?? 0), last?.changes === 1 ? "change" : "changes"],
          [String(last?.durationMin ?? 0) + "m", "runtime"],
        ].map(([v, k]) => (
          <p key={k} className="text-[0.6875rem] text-muted">
            <span className="tnum font-semibold text-ink-soft">{v}</span> {k}
          </p>
        ))}
      </div>

      {/* the running meter */}
      <div className="mt-2.5 h-0.5 w-full overflow-hidden rounded-full bg-surface-sunk">
        <div
          className="h-full rounded-full bg-brass-500 transition-[width] duration-100 ease-linear"
          style={{ width: `${elapsed}%` }}
        />
      </div>

      <p className="mt-2 text-[0.6875rem] leading-snug text-muted">
        Next full report {prettyDate(coverage.nextSweepISO)}
        <span className="block text-faint transition-colors group-hover:text-petrol-700">
          View scan history
        </span>
      </p>
    </Link>
  );
}
