"use client";

/**
 * The console's manual reevaluation trigger. Same code path as the
 * daily cron (lib/evaluate-run), fired by a staff session, reported
 * with its real counts. No fake progress: the button is busy until
 * the run returns.
 */
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Btn } from "@/components/admin/ui";

export function RunEvaluation() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setResult(null);
    try {
      const r = await fetch("/api/cron/evaluate");
      const d = await r.json();
      setResult(
        r.ok
          ? `Ran: ${d.flagsChecked} flags checked, ${d.newFlags} new, ${d.notified} notified, ${d.sessionsPruned} stale sessions pruned.`
          : d.error ?? "The run was refused.",
      );
    } catch {
      setResult("The run could not be reached.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Btn variant="secondary" onClick={() => void run()} disabled={busy}>
        <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
        {busy ? "Evaluating…" : "Run evaluation now"}
      </Btn>
      {result && (
        <p className="text-[0.75rem] text-slate-500">{result}</p>
      )}
    </div>
  );
}
