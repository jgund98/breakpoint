"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Copy } from "lucide-react";
import { Badge, Monogram, type BadgeTone } from "@/components/admin/ui";
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
}: {
  slug: string;
  name: string;
  status: string;
  descriptor?: string | null;
  locations: number | null;
  centers: number | null;
  storeEstimate?: number | null;
}) {
  const [current, setCurrent] = useState(status);
  const [copied, setCopied] = useState(false);

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
    <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-6 shadow-xl shadow-indigo-500/25 sm:p-7">
      <div className="absolute right-0 top-0 h-72 w-72 -translate-y-1/2 translate-x-1/4 rounded-full bg-gradient-to-br from-white/20 to-transparent blur-3xl" />
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
                  {current}
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
              <select
                value={current}
                onChange={(e) => void setStatus(e.target.value)}
                aria-label="Client status"
                className="h-9 rounded-xl border border-white/25 bg-white/15 px-2.5 text-[0.8125rem] font-medium text-white backdrop-blur-sm transition-colors [&>option]:text-slate-900 hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-white/40"
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
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/25 bg-white/15 px-4 text-[0.8125rem] font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/25 active:scale-95"
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
