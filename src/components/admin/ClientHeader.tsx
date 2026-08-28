"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Copy } from "lucide-react";
import { Badge, Btn, selectCls, type BadgeTone } from "@/components/admin/ui";
import { inviteLink } from "@/components/admin/useConsole";

/**
 * The client board's masthead: who this is, their lifecycle status
 * (editable), and their onboarding console link for re-sending.
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
  storeEstimate,
}: {
  slug: string;
  name: string;
  status: string;
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
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <Link
          href="/admin/clients"
          className="mb-2 inline-flex items-center gap-1 text-[0.75rem] font-medium text-slate-400 transition-colors hover:text-slate-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All clients
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[1.375rem] font-bold tracking-tight text-slate-900">
            {name}
          </h1>
          <Badge tone={STATUS_TONE[current] ?? "slate"} dot>
            {current}
          </Badge>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={current}
          onChange={(e) => void setStatus(e.target.value)}
          className={selectCls}
          aria-label="Client status"
        >
          <option value="onboarding">Onboarding</option>
          <option value="live">Live</option>
          <option value="paused">Paused</option>
        </select>
        <Btn
          variant="secondary"
          onClick={() => {
            void navigator.clipboard.writeText(inviteLink(name, storeEstimate));
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          }}
        >
          {copied ? (
            <Check className="h-4 w-4 text-emerald-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {copied ? "Copied" : "Console link"}
        </Btn>
      </div>
    </div>
  );
}
