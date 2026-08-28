"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarSearch, FileWarning, StoreIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { ActionButton, Panel, PanelHead, Pill, type Tone } from "./ui";

/**
 * WHAT A TENANT CAN START THEMSELVES
 *
 * Out of the partner meeting, three things a client must not have to
 * email us to do: ask for a scan now, report a closure their own people
 * saw, and tell us an estoppel has been requested.
 *
 * These post to the first real write path in the product. While service
 * is manual the same table is the queue the team works, so a request
 * filed here is a request somebody picks up.
 */

type RequestRow = {
  id: string;
  kind: "manual_scan" | "closure_report" | "estoppel_review";
  store_name: string | null;
  observed_on: string | null;
  created_at: string;
  handled_at: string | null;
};

const KIND_LABEL: Record<RequestRow["kind"], string> = {
  manual_scan: "Scan requested",
  closure_report: "Closure reported",
  estoppel_review: "Estoppel review",
};

function useRequests(locationId: string) {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(
        `/app/api/requests?location=${encodeURIComponent(locationId)}`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const data = (await res.json()) as { requests: RequestRow[] };
      setRows(data.requests);
    } catch {
      /* A list that fails to load is not worth an error state; the
         submit path reports its own failures. */
    }
  }, [locationId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const submit = useCallback(
    async (payload: Record<string, string>) => {
      setError(null);
      try {
        const res = await fetch("/app/api/requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, locationId }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          setError(data?.error ?? "The request did not file. Try again.");
          return false;
        }
        await refresh();
        return true;
      } catch {
        setError("The request did not file. Check the connection and try again.");
        return false;
      }
    },
    [locationId, refresh],
  );

  return { rows, error, submit };
}

const today = () => new Date().toISOString().slice(0, 10);

/* ------------------------------------------------------------------
   report and request
   ------------------------------------------------------------------ */

export function LocationActions({
  locationId,
  centerName,
  suites,
}: {
  locationId: string;
  centerName: string;
  suites: { id: string; name: string; status: string }[];
}) {
  const { rows, error, submit } = useRequests(locationId);
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const [reporting, setReporting] = useState(false);
  const [store, setStore] = useState("");
  const [when, setWhen] = useState(today());
  const [note, setNote] = useState("");

  const ordered = [...suites].sort((a, b) =>
    a.status === b.status ? a.name.localeCompare(b.name) : a.status === "open" ? -1 : 1,
  );

  const requestScan = async () => {
    setBusy("scan");
    const ok = await submit({ kind: "manual_scan", centerName });
    setBusy(null);
    if (ok) setDone("scan");
  };

  const fileReport = async () => {
    if (!store) return;
    setBusy("report");
    const ok = await submit({
      kind: "closure_report",
      centerName,
      storeName: store,
      observedOn: when,
      body: note,
    });
    setBusy(null);
    if (ok) {
      setDone("report");
      setReporting(false);
      setStore("");
      setNote("");
    }
  };

  return (
    <Panel>
      <PanelHead
        title="Report and request"
        hint="Both file directly to the team watching this center."
      />

      <div className="mt-4 space-y-3">
        {/* ---- scan now ---- */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3.5">
          <div className="flex min-w-0 items-start gap-2.5">
            <CalendarSearch className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <div className="min-w-0">
              <p className="text-[0.8125rem] font-medium text-slate-900">
                Scan this center now
              </p>
              <p className="text-[0.75rem] text-slate-500">
                Outside the schedule. The result lands in Activity.
              </p>
            </div>
          </div>
          {done === "scan" ? (
            <Pill tone={"open" as Tone} dot>
              Requested
            </Pill>
          ) : (
            <ActionButton
              variant="secondary"
              onClick={requestScan}
              disabled={busy === "scan"}
            >
              Request
            </ActionButton>
          )}
        </div>

        {/* ---- closure report ---- */}
        <div className="rounded-xl border border-slate-200 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2.5">
              <StoreIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <div className="min-w-0">
                <p className="text-[0.8125rem] font-medium text-slate-900">
                  Report a closure
                </p>
                <p className="text-[0.75rem] text-slate-500">
                  Something your people saw at {centerName}. A store report is
                  primary evidence.
                </p>
              </div>
            </div>
            {done === "report" ? (
              <Pill tone={"open" as Tone} dot>
                Filed
              </Pill>
            ) : (
              !reporting && (
                <ActionButton variant="secondary" onClick={() => setReporting(true)}>
                  Report
                </ActionButton>
              )
            )}
          </div>

          {reporting && (
            <div className="mt-3 space-y-3 border-t border-slate-200 pt-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label text-slate-500">Store</label>
                  <select
                    value={store}
                    onChange={(e) => setStore(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white shadow-sm px-2.5 py-2 text-[0.8125rem] text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 focus:outline-none"
                  >
                    <option value="">Choose a store</option>
                    {ordered.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                        {s.status !== "open" ? " (already marked closed)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label text-slate-500">Seen on</label>
                  <input
                    type="date"
                    value={when}
                    max={today()}
                    onChange={(e) => setWhen(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white shadow-sm px-2.5 py-1.5 text-[0.8125rem] text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 focus:outline-none"
                  />
                </div>
              </div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Anything else worth knowing. Signage down, papered windows, a posted notice."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 shadow-sm p-3 text-[0.8125rem] text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 focus:outline-none"
              />
              <div className="flex flex-wrap items-center gap-3">
                <ActionButton onClick={fileReport} disabled={!store || busy === "report"}>
                  File the report
                </ActionButton>
                <button
                  type="button"
                  onClick={() => setReporting(false)}
                  className="text-[0.75rem] text-slate-500 hover:text-slate-900"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {error && <p className="text-[0.8125rem] text-rose-700">{error}</p>}

        {/* ---- what is already filed ---- */}
        {rows.length > 0 && (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {rows.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2"
              >
                <p className="min-w-0 text-[0.75rem] text-slate-700">
                  <span className="font-medium text-slate-900">{KIND_LABEL[r.kind]}</span>
                  {r.store_name ? `: ${r.store_name}` : ""}
                  <span className="ml-1.5 text-slate-400">
                    {new Date(r.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </p>
                <Pill tone={(r.handled_at ? "open" : "watch") as Tone}>
                  {r.handled_at ? "Handled" : "Open"}
                </Pill>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------
   the estoppel check
   ------------------------------------------------------------------ */

export function EstoppelCheck({
  locationId,
  centerName,
  live,
  asOf,
  failing,
}: {
  locationId: string;
  centerName: string;
  /** A potential position exists: a test fails, or a remedy runs. */
  live: boolean;
  asOf: string;
  failing: { label: string; cite: string; observed: string }[];
}) {
  const { submit } = useRequests(locationId);
  const [recording, setRecording] = useState(false);
  const [note, setNote] = useState("");
  const [when, setWhen] = useState(today());
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const record = async () => {
    setBusy(true);
    const ok = await submit({
      kind: "estoppel_review",
      centerName,
      observedOn: when,
      body: note,
    });
    setBusy(false);
    if (ok) {
      setDone(true);
      setRecording(false);
    }
  };

  return (
    <Panel>
      <PanelHead
        title="Estoppel check"
        hint="When this property is sold or refinanced, you will be asked to certify your position."
        right={
          live ? (
            <Pill tone={"brass" as Tone} dot>
              Position live
            </Pill>
          ) : undefined
        }
      />

      {live ? (
        <>
          <p className="mt-3 text-[0.8125rem] leading-relaxed text-slate-700">
            A potential co-tenancy position exists at this location. An
            estoppel certifying that no claims, offsets, or landlord defaults
            exist may bar it, and the certificate is equally where the
            position goes on the record.
          </p>
          <ul className="mt-3 space-y-2">
            {failing.map((f) => (
              <li key={f.cite + f.label} className="flex items-start gap-2.5">
                <FileWarning className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                <p className="text-[0.8125rem] leading-snug text-slate-700">
                  <span className="font-medium text-slate-900">{f.label}</span>{" "}
                  <span className="text-slate-400">{f.cite}</span> — {f.observed}
                </p>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-3 text-[0.8125rem] leading-relaxed text-slate-700">
          No live position at this location as of {asOf}. A position can still
          arise between signature and closing, so tell us when an estoppel is
          requested and we re-check before you certify.
        </p>
      )}

      <div className="mt-4 border-t border-slate-200 pt-3">
        {done ? (
          <p className="text-[0.8125rem] text-emerald-700">
            Recorded. We review the position and send you what to assert or
            reserve before anyone signs.
          </p>
        ) : recording ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label text-slate-500">Requested on</label>
                <input
                  type="date"
                  value={when}
                  max={today()}
                  onChange={(e) => setWhen(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white shadow-sm px-2.5 py-1.5 text-[0.8125rem] text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 focus:outline-none"
                />
              </div>
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Who asked, the deadline, and anything already sent."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 shadow-sm p-3 text-[0.8125rem] text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 focus:outline-none"
            />
            <div className="flex flex-wrap items-center gap-3">
              <ActionButton onClick={record} disabled={busy}>
                Record it
              </ActionButton>
              <button
                type="button"
                onClick={() => setRecording(false)}
                className="text-[0.75rem] text-slate-500 hover:text-slate-900"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[0.75rem] text-slate-500">
              An estoppel has been requested at {centerName}?
            </p>
            <ActionButton variant="secondary" onClick={() => setRecording(true)}>
              Tell us
            </ActionButton>
          </div>
        )}
      </div>

      <p className="mt-3 text-[0.6875rem] text-slate-400">
        For review with your counsel. Not legal advice.
      </p>
    </Panel>
  );
}
