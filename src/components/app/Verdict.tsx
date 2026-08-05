"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { compactUsd, usd } from "@/lib/clause";
import { CountUp } from "./Motion";

/**
 * THE VERDICT
 *
 * The one card that answers the only question a busy VP of Real Estate
 * actually has when they open this: is there anything I need to do
 * today? Everything else on the page is supporting evidence.
 *
 * Two faces. When something is claimable it detonates in brass. When
 * nothing is, it reports the watch instead, because a quiet quarter is
 * the product working, not the product idle, and the reader has to be
 * able to see that.
 */

export function Verdict({
  decisions,
  monthlyTotal,
  soonestDays,
  soonestLabel,
  storefrontsConfirmed,
  centersSurveyed,
  lastSweep,
}: {
  decisions: number;
  monthlyTotal: number;
  soonestDays: number | null;
  soonestLabel: string | null;
  storefrontsConfirmed: number;
  centersSurveyed: number;
  lastSweep: string;
}) {
  const live = decisions > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
      className={`relative overflow-hidden rounded-2xl border ${
        live ? "border-brass-200 bg-petrol-900" : "border-line bg-petrol-900"
      }`}
    >
      {/* glow, radial gradient only, never a filter blur */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full"
        style={{
          background: live
            ? "radial-gradient(closest-side, rgba(217,154,43,0.34), transparent 72%)"
            : "radial-gradient(closest-side, rgba(79,70,229,0.34), transparent 72%)",
        }}
      />

      <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.4fr_1fr] lg:items-center">
        <div>
          <p className="label text-brass-400">
            {live ? "Action required" : "Nothing to claim today"}
          </p>

          {live ? (
            <>
              <h2 className="mt-3 text-[clamp(1.75rem,3.6vw,2.75rem)] text-cream">
                {decisions} location{decisions === 1 ? "" : "s"}{" "}
                {decisions === 1 ? "qualifies" : "qualify"} for{" "}
                <span className="whitespace-nowrap">
                  co-tenancy{" "}
                  <span className="display-em text-brass-400">rent.</span>
                </span>
              </h2>
              <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
                <Fact k="Cure elapsed" v="Yes" />
                <Fact k="Preconditions" v="Met" />
                <Fact
                  k="Applies from"
                  v="Notice date"
                />
                {soonestDays != null && (
                  <Fact
                    k="Soonest deadline"
                    v={`${soonestDays} days`}
                    sub={soonestLabel ?? undefined}
                  />
                )}
                {monthlyTotal > 0 && (
                  <Fact
                    k="Where sales reported"
                    v={`${usd(Math.round(monthlyTotal))}/mo`}
                    sub="estimated"
                  />
                )}
              </dl>
              <div className="mt-6 flex flex-wrap gap-2.5">
                <Link
                  href="/app/notices"
                  className="inline-flex items-center rounded-lg bg-brass-500 px-5 py-3 text-[0.875rem] font-semibold whitespace-nowrap text-petrol-950 transition-colors duration-250 hover:bg-brass-400"
                >
                  Assemble notice packages
                </Link>
                <Link
                  href="/app/locations"
                  className="inline-flex items-center rounded-lg border border-white/20 px-5 py-3 text-[0.875rem] font-semibold whitespace-nowrap text-cream transition-colors duration-250 hover:bg-white/10"
                >
                  Review the evidence
                </Link>
              </div>
            </>
          ) : (
            <>
              <h2 className="mt-3 text-[clamp(1.75rem,3.6vw,2.75rem)] text-cream">
                Every test in your portfolio is{" "}
                <span className="display-em text-brass-400">satisfied.</span>
              </h2>
              <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
                <Fact k="Failing tests" v="0" />
                <Fact k="Centers watched" v={String(centersSurveyed)} />
                <Fact k="Last scan" v={lastSweep} />
              </dl>
            </>
          )}
        </div>

        {/* the watch record, always shown */}
        <div className="rounded-xl border border-white/12 bg-white/5 p-5">
          <p className="label text-cream-faint">Watch record</p>
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
              k="Co-tenancy rent running"
              v={compactUsd(monthlyTotal)}
              muted={!live}
            />
            <Row
              k="Soonest clock"
              v={
                soonestDays != null
                  ? `${soonestDays} days`
                  : "None running"
              }
              hint={soonestLabel ?? undefined}
            />
          </dl>
          <p className="mt-4 border-t border-white/12 pt-3 text-[0.75rem] leading-relaxed text-cream-faint">
            Last full sweep {lastSweep}. Recurring evaluation as verified
            conditions change.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

/** A labelled fact. Software states values; it does not narrate them. */
function Fact({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div>
      <dt className="text-[0.6875rem] font-medium tracking-wide text-cream-faint uppercase">
        {k}
      </dt>
      <dd className="tnum mt-0.5 text-[0.9375rem] font-semibold text-cream">
        {v}
        {sub && (
          <span className="ml-1.5 text-[0.75rem] font-normal text-cream-faint">
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
      <dt className="text-[0.8125rem] text-cream-soft">{k}</dt>
      <dd
        className={`tnum text-right text-[0.9375rem] font-semibold ${
          muted ? "text-cream-faint" : "text-cream"
        }`}
      >
        {v}
        {hint && (
          <span className="block text-[0.6875rem] font-normal text-cream-faint">
            {hint}
          </span>
        )}
      </dd>
    </div>
  );
}
