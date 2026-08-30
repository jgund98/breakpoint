"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Copy } from "lucide-react";
import {
  Badge,
  Monogram,
  statusLabel,
  type BadgeTone,
} from "@/components/admin/ui";
import { inviteLink } from "@/components/admin/useConsole";

/**
 * The client board's masthead: a gradient band that treats the client
 * as an account, not a table row — identity, lifecycle status
 * (editable in place), the portfolio's scale, and their onboarding
 * console link for re-sending.
 */

const STATUS_TONE: Record<string, BadgeTone> = {
  live: "emerald",
  onboarding: "amber",
  paused: "slate",
};

export function ClientHeader({
  slug,
  name,
  status,
  descriptor,
  locations,
  centers,
  storeEstimate,
  demoMode = false,
}: {
  slug: string;
  name: string;
  status: string;
  descriptor?: string | null;
  locations: number | null;
  centers: number | null;
  storeEstimate?: number | null;
  demoMode?: boolean;
}) {
  const [current, setCurrent] = useState(status);
  const [copied, setCopied] = useState(false);
  const [demo, setDemo] = useState(demoMode);
  const [demoBusy, setDemoBusy] = useState(false);

  const setDemoMode = async (on: boolean) => {
    setDemoBusy(true);
    const res = await fetch("/admin/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "demo_mode", org: slug, on }),
    });
    if (res.ok) setDemo(on);
    setDemoBusy(false);
  };

  const setStatus = async (next: string) => {
    const prev = current;
    setCurrent(next);
    const res = await fetch("/admin/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "org_status", org: slug, status: next }),
    });
    if (!res.ok) setCurrent(prev);
  };

  return (
    <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-b from-indigo-700 to-indigo-800 p-6 shadow-xl shadow-indigo-500/25 sm:p-7">
      <div className="relative">
        <Link
          href="/admin/clients"
          className="mb-4 inline-flex items-center gap-1 text-[0.75rem] font-medium text-indigo-200 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All clients
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
          <div className="flex items-center gap-4">
            <Monogram name={name} size="lg" className="ring-2 ring-white/30" />
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-[1.375rem] font-bold tracking-tight text-white">
                  {name}
                </h1>
                <Badge tone={STATUS_TONE[current] ?? "slate"} dot>
                  {statusLabel(current)}
                </Badge>
              </div>
              <p className="mt-0.5 text-[0.8125rem] text-indigo-200">
                {descriptor ?? slug}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {locations !== null && (
              <div className="hidden gap-6 border-r border-white/20 pr-6 sm:flex">
                <div>
                  <p className="tnum text-2xl font-bold text-white">{locations}</p>
                  <p className="text-[0.6875rem] font-medium text-indigo-200">
                    Locations
                  </p>
                </div>
                <div>
                  <p className="tnum text-2xl font-bold text-white">{centers}</p>
                  <p className="text-[0.6875rem] font-medium text-indigo-200">
                    Centers
                  </p>
                </div>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void setDemoMode(!demo)}
                disabled={demoBusy}
                title={
                  demo
                    ? "Demo mode is on: every sign-in restores the pristine evaluated state."
                    : "Turn on to restore the pristine evaluated state on every sign-in."
                }
                className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3.5 text-[0.8125rem] font-semibold backdrop-blur-sm transition-all active:scale-95 disabled:opacity-50 ${
                  demo
                    ? "border-violet-300/60 bg-violet-400/25 text-white"
                    : "border-white/25 bg-white/15 text-white hover:bg-white/25"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${demo ? "animate-pulse bg-violet-300" : "bg-white/40"}`}
                />
                Demo mode
                <span
                  className={`rounded-full px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide ${
                    demo ? "bg-violet-300 text-violet-950" : "bg-white/20 text-white/80"
                  }`}
                >
                  {demoBusy ? "…" : demo ? "On" : "Off"}
                </span>
              </button>
              <select
                value={current}
                onChange={(e) => void setStatus(e.target.value)}
                aria-label="Client status"
                className="h-10 rounded-xl border border-white/25 bg-white/15 px-2.5 text-[0.8125rem] font-medium text-white backdrop-blur-sm transition-colors [&>option]:text-slate-900 hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-white/40"
              >
                <option value="onboarding">Onboarding</option>
                <option value="live">Live</option>
                <option value="paused">Paused</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(inviteLink(name, storeEstimate));
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1600);
                }}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-white/25 bg-white/15 px-4 text-[0.8125rem] font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/25 active:scale-95"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-300" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? "Copied" : "Console link"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
