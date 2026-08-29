"use client";

/**
 * The ops-help moment a triggered flag funnels into: the position
 * rests on secondary evidence, a notice cannot go out on it, and the
 * fix is a person at the premises. One click files a field
 * verification on the operations queue; the button tells the truth
 * about what happens next and never pretends the evidence changed.
 */
import { useState } from "react";
import { Camera } from "lucide-react";

export function RequestVerification({
  locationId,
  centerName,
  compact = false,
}: {
  locationId: string;
  centerName: string;
  compact?: boolean;
}) {
  const [state, setState] = useState<"idle" | "busy" | "sent" | "failed">(
    "idle",
  );

  const send = async () => {
    setState("busy");
    try {
      const r = await fetch("/app/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "field_verification",
          locationId,
          centerName,
          body: "Requested from a triggered position resting on secondary evidence.",
        }),
      });
      setState(r.ok ? "sent" : "failed");
    } catch {
      setState("failed");
    }
  };

  if (state === "sent")
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-xl border border-emerald-100 bg-emerald-50 px-3 text-[0.75rem] font-semibold text-emerald-700 ${compact ? "h-9" : "h-10"}`}
      >
        Field visit requested. We will confirm on site
      </span>
    );

  return (
    <button
      type="button"
      onClick={() => void send()}
      disabled={state === "busy"}
      title="A person photographs the premises so the evidence can carry a notice"
      className={`inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-3.5 text-[0.8125rem] font-semibold whitespace-nowrap text-slate-900 shadow-md shadow-amber-500/30 transition-all hover:bg-amber-300 active:scale-95 disabled:opacity-50 ${compact ? "h-9" : "h-10"}`}
    >
      <Camera className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      {state === "busy"
        ? "Filing…"
        : state === "failed"
          ? "Try again"
          : "Request field verification"}
    </button>
  );
}
