"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { compactUsd, prettyDate, usd } from "@/lib/clause";
import { CountUp } from "./Motion";
import type { FlagRow } from "./Inbox";

/**
 * THE VERDICT
 *
 * The one card that answers the only question a busy VP of Real Estate
 * actually has when they open this: is there anything I need to do
 * today? It is the INBOX SUMMARY, not a standing headline: the number
 * is how many flags are NEW — unacknowledged — and it genuinely goes
 * back to zero when the team works the queue. New flags render right
 * here, dated, like notifications, with the first action inline.
 *
 * Two faces. When new flags exist it detonates in brass. When none do,
 * it reports the watch instead, because a quiet quarter is the product
 * working, not the product idle, and the reader has to be able to see
 * that.
 */

export function Verdict({
  monthlyTotal,
  soonestDays,
  soonestLabel,
  storefrontsConfirmed,
  centersSurveyed,
  lastSweep,
}: {
  decisions?: number;
  monthlyTotal: number;
  soonestDays: number | null;
  soonestLabel: string | null;
  storefrontsConfirmed: number;
  centersSurveyed: number;
  lastSweep: string;
}) {
  const [flags, setFlags] = useState<FlagRow[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/app/api/findings");
      if (!r.ok) return;
      const d = await r.json();
      setFlags(d.flags ?? []);
      setCounts(d.counts ?? {});
    } catch {
      setFlags([]);
    }
  }, []);

  /* The hero stays live: it re-pulls while visible so the count is
     the inbox's truth, not the page-load's. */
  useEffect(() => {
    load();
    const t = setInterval(() => {
      if (document.visibilityState !== "hidden") load();
    }, 60_000);
    return () => clearInterval(t);
  }, [load]);

  const start = async (id: number) => {
    setBusy(id);
    try {
      await fetch("/app/api/findings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "start" }),
      });
      await load();
    } finally {
      setBusy(null);
    }
  };

  const fresh = (flags ?? []).filter((f) => f.status === "new");
  const inReview = counts.in_review ?? 0;
  const handled = counts.handled ?? 0;
  const loading = flags === null;
  const live = fresh.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-indigo-700 to-indigo-800 shadow-xl shadow-indigo-500/25"
    >
      <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.4fr_1fr] lg:items-center">
        <div>
          <p className="label text-amber-400">
            {loading
              ? "Checking the inbox"
              : live
                ? "New flags"
                : inReview > 0
                  ? "Reviews in progress"
                  : "Nothing needs you today"}
          </p>

          {loading ? (
            <div className="mt-3 space-y-3">
              <div className="h-9 w-3/4 animate-pulse rounded-lg bg-white/15" />
              <div className="h-16 animate-pulse rounded-xl bg-white/10" />
            </div>
          ) : live ? (
            <>
              <h2 className="mt-3 text-[clamp(1.625rem,3.2vw,2.375rem)] font-bold leading-tight tracking-tight text-white">
                {fresh.length} new flag{fresh.length === 1 ? "" : "s"} in your{" "}
                <span className="text-amber-400">inbox</span>
              </h2>

              {/* the newest flags, as notifications: dated, actionable */}
              <ul className="mt-4 space-y-2">
                {fresh.slice(0, 3).map((f) => (
                  <li
                    key={f.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/10 px-3.5 py-2.5 backdrop-blur-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-[0.8125rem] font-semibold text-white">
                        <span className="relative flex h-1.5 w-1.5 shrink-0">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300 opacity-60" />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
                        </span>
                        <Link
                          href={`/app/locations/${f.location_ref}`}
                          className="truncate hover:underline"
                        >
                          {f.center_name}
                        </Link>
                        <span className="tnum shrink-0 text-[0.6875rem] font-normal text-indigo-200/70">
                          {prettyDate(f.flagged_on)}
                        </span>
                      </p>
                      <p className="mt-0.5 truncate text-[0.75rem] text-indigo-100/90">
                        {f.headline}
                      </p>
                    </div>
                    <button
                      onClick={() => start(f.id)}
                      disabled={busy === f.id}
                      className="inline-flex h-8 shrink-0 items-center rounded-lg bg-white/90 px-3 text-[0.75rem] font-semibold whitespace-nowrap text-indigo-800 shadow-sm transition-all hover:bg-white active:scale-95 disabled:opacity-50"
                    >
                      Start review
                    </button>
                  </li>
                ))}
                {fresh.length > 3 && (
                  <li className="px-1 text-[0.75rem] text-indigo-200/80">
                    {fresh.length - 3} more in the inbox.
                  </li>
                )}
              </ul>

              <div className="mt-5 flex flex-wrap gap-2.5">
                <Link
                  href="/app/inbox"
                  className="inline-flex h-10 items-center rounded-xl bg-amber-400 px-4 text-[0.8125rem] font-semibold whitespace-nowrap text-slate-900 shadow-lg shadow-amber-500/30 transition-all duration-200 hover:bg-amber-300 active:scale-95"
                >
                  Open the inbox
                </Link>
                <Link
                  href="/app/notices"
                  className="inline-flex h-10 items-center rounded-xl border border-white/25 bg-white/15 px-4 text-[0.8125rem] font-semibold whitespace-nowrap text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/25 active:scale-95"
                >
                  Assemble notice packages
                </Link>
              </div>
            </>
          ) : (
            <>
              <h2 className="mt-3 text-[clamp(1.625rem,3.2vw,2.375rem)] font-bold leading-tight tracking-tight text-white">
                {inReview > 0 ? (
                  <>
                    Inbox clear.{" "}
                    <span className="text-amber-400">
                      {inReview} review{inReview === 1 ? "" : "s"}
                    </span>{" "}
                    in progress
                  </>
                ) : (
                  <>
                    Every flag is{" "}
                    <span className="text-amber-400">handled</span> and the
                    watch is running
                  </>
                )}
              </h2>
              <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
                <Fact k="New flags" v="0" />
                <Fact k="In review" v={String(inReview)} />
                <Fact k="Handled" v={String(handled)} />
                <Fact k="Last scan" v={lastSweep} />
              </dl>
              {inReview > 0 && (
                <div className="mt-5">
                  <Link
                    href="/app/inbox"
                    className="inline-flex h-10 items-center rounded-xl border border-white/25 bg-white/15 px-4 text-[0.8125rem] font-semibold whitespace-nowrap text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/25 active:scale-95"
                  >
                    Open the inbox
                  </Link>
                </div>
              )}
            </>
          )}
        </div>

        {/* the watch record, always shown */}
        <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
          <p className="label text-indigo-200/70">Watch record</p>
          <dl className="mt-4 space-y-3.5">
            {/*
              Deliberately "named tenants", not "storefronts". We check
              the specific stores your clauses depend on, because those
              are the ones we can identify from the lease and verify in
              the field. Claiming to confirm every storefront in every
              center would be a promise the data cannot keep.
            */}
            <Row
              k="Named tenants checked"
              v={
                <CountUp
                  to={storefrontsConfirmed}
                  format={(n) => Math.round(n).toLocaleString("en-US")}
                />
              }
            />
            <Row k="Centers surveyed" v={String(centersSurveyed)} />
            <Row
              /* This is what is AVAILABLE on qualifying locations, not
                 what is already running under a served notice. Calling
                 it "running" overstated it the moment real data arrived
                 with nothing served yet. */
              k="Available where sales on file"
              v={compactUsd(monthlyTotal)}
              muted={!live}
            />
            <Row
              k="Soonest clock"
              v={soonestDays != null ? `${soonestDays} days` : "None running"}
              hint={soonestLabel ?? undefined}
            />
          </dl>
          <p className="mt-4 border-t border-white/12 pt-3 text-[0.75rem] leading-relaxed text-indigo-200/70">
            Last full sweep {lastSweep}. Recurring evaluation as verified
            conditions change.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

/** A labeled fact. Software states values; it does not narrate them. */
function Fact({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div>
      <dt className="text-[0.6875rem] font-medium tracking-wide text-indigo-200/70 uppercase">
        {k}
      </dt>
      <dd className="tnum mt-0.5 text-[0.9375rem] font-semibold text-white">
        {v}
        {sub && (
          <span className="ml-1.5 text-[0.75rem] font-normal text-indigo-200/70">
            {sub}
          </span>
        )}
      </dd>
    </div>
  );
}

function Row({
  k,
  v,
  hint,
  muted,
}: {
  k: string;
  v: React.ReactNode;
  hint?: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-[0.8125rem] text-indigo-200">{k}</dt>
      <dd
        className={`tnum text-right text-[0.9375rem] font-semibold ${
          muted ? "text-indigo-200/70" : "text-white"
        }`}
      >
        {v}
        {hint && (
          <span className="block text-[0.6875rem] font-normal text-indigo-200/70">
            {hint}
          </span>
        )}
      </dd>
    </div>
  );
}

/* usd is used by the money fact when a sub-figure is shown */
void usd;
