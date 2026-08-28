"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import {
  TASKS,
  clearOnboarding,
  completion,
  emptyOnboarding,
  loadOnboarding,
  saveOnboarding,
  statusOf,
  type OnboardingState,
  type TaskId,
} from "@/lib/onboarding-store";
import {
  FIELDS,
  applyMapping,
  autoMap,
  parseDelimited,
  type FieldKey,
} from "@/lib/ingest";
import { buildCenterIndex, resolveAll } from "@/lib/centers";
import { portfolio } from "@/lib/portfolio";
import { cn } from "@/lib/cn";
import { FileDrop, type LoadedFile } from "./FileDrop";
import { IntakeReview } from "./IntakeReview";
import { RecordStep, TriageStep } from "./ExtraSteps";
import { ChannelDetail, DeliveryPicker, type ChannelId } from "./Delivery";
import { Monogram } from "@/components/admin/ui";

/**
 * THE ONBOARDING CONSOLE
 *
 * A record of what a client has sent, what is outstanding, and how each
 * remaining piece is arriving. Worked by several people over days, so it
 * is a register rather than a sequence, and every panel leads with what
 * we hold rather than with what we would like.
 *
 * The list down the left is the document, not decoration. An account
 * manager reads it to answer "where are we" and the client reads the
 * same thing. One state, one view of it.
 */

type Note = { kind: "ok" | "bad"; message: string } | null;

export function OnboardingWorkspace({
  clientName,
  clientSlug,
  storeEstimate,
}: {
  clientName: string;
  clientSlug: string;
  storeEstimate: number;
}) {
  const [s, setS] = useState<OnboardingState>(emptyOnboarding);
  const [open, setOpen] = useState<TaskId>("portfolio");
  const [ready, setReady] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [note, setNote] = useState<Note>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const first = useRef(true);

  useEffect(() => {
    setS(loadOnboarding(clientSlug));
    setReady(true);
  }, [clientSlug]);

  useEffect(() => {
    if (!ready) return;
    if (first.current) {
      first.current = false;
      return;
    }
    saveOnboarding(clientSlug, s);
    setSavedAt(
      new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    );
  }, [s, ready, clientSlug]);

  const set = <K extends keyof OnboardingState>(k: K, v: OnboardingState[K]) =>
    setS((p) => ({ ...p, [k]: v }));

  const chan = (id: TaskId) => s.channels[id]?.channel ?? null;
  const chanNote = (id: TaskId) => s.channels[id]?.note ?? "";
  const setChan = (id: TaskId, channel: ChannelId) =>
    setS((p) => ({
      ...p,
      channels: {
        ...p.channels,
        [id]: { channel, note: p.channels[id]?.note ?? "" },
      },
    }));
  const setChanNote = (id: TaskId, v: string) =>
    setS((p) => ({
      ...p,
      channels: {
        ...p.channels,
        [id]: { channel: p.channels[id]?.channel ?? null, note: v },
      },
    }));

  const progress = useMemo(() => completion(s), [s]);

  /*
   * Sending it to us. The whole state goes as one document, because the
   * team sets the account up from exactly what the client assembled,
   * not from a lossy summary of it. Submitting again after edits is
   * expected and files a fresh copy.
   */
  const submit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/onboarding/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName,
          clientSlug,
          storeEstimate,
          state: s,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setSubmitError(data?.error ?? "The submission did not send. Try again.");
        return;
      }
      set("submittedAt", new Date().toISOString());
    } catch {
      setSubmitError("The submission did not send. Check the connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const loadRoster = (text: string, fileName = "") => {
    const { headers, rows } = parseDelimited(text);
    setS((p) => ({
      ...p,
      raw: text,
      fileName,
      headers,
      parsed: rows,
      mapping: autoMap(headers),
    }));
  };

  const resolved = useMemo(
    () => (s.parsed.length ? applyMapping(s.parsed, s.mapping) : []),
    [s.parsed, s.mapping],
  );

  const centers = useMemo(() => {
    if (!resolved.length) return null;
    return resolveAll(
      resolved.map((r) => ({ name: r.centerName, city: r.city, state: r.state })),
      buildCenterIndex(portfolio),
    );
  }, [resolved]);

  if (!ready) return null;
  const task = TASKS.find((t) => t.id === open)!;

  /** One line per task, stating what we hold rather than what it is for. */
  const held = (id: TaskId): string => {
    switch (id) {
      case "portfolio":
        return s.parsed.length
          ? `${s.parsed.length.toLocaleString("en-US")} rows${centers ? `, ${centers.matched} centers matched` : ""}`
          : chan("portfolio")
            ? "Route agreed, nothing received"
            : "Nothing received";
      case "leases":
        return s.leasesConfirmed
          ? "Access confirmed"
          : chan("leases")
            ? "Route agreed"
            : "Nothing received";
      case "record": {
        const n = Object.values(s.record).filter((v) => v !== null).length;
        return n === 0
          ? "Not started"
          : `${n} of ${Object.keys(s.record).length} answered`;
      }
      case "sales":
        return s.salesDeferred
          ? "On request, per store"
          : s.salesRowCount
            ? `${s.salesRowCount.toLocaleString("en-US")} rows`
            : "Nothing received";
      case "priorities":
        return s.triageMode === "all"
          ? "Whole portfolio"
          : s.triageMode === "priority"
            ? s.triageNote.trim()
              ? "Cohort named"
              : "Cohort not yet named"
            : "Not set";
      case "people":
        return s.signatory.trim() ? s.signatory : "No signatory named";
      case "watch":
        return `${s.cadence[0].toUpperCase()}${s.cadence.slice(1)}${s.fieldVisits ? ", field visits on" : ""}`;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200/60 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[74rem] flex-wrap items-end justify-between gap-x-8 gap-y-4 px-6 py-5">
          <div className="flex min-w-0 items-center gap-3">
            <Monogram name={clientName} size="lg" />
            <div className="min-w-0">
              <p className="label text-slate-400">Onboarding</p>
              <h1 className="mt-0.5 truncate text-[1.25rem] font-bold tracking-tight text-slate-900">
                {clientName}
              </h1>
            </div>
          </div>
          <dl className="flex flex-wrap items-end gap-x-8 gap-y-3">
            <Figure k="Stores expected" v={storeEstimate.toLocaleString("en-US")} />
            <Figure
              k="Received"
              v={s.parsed.length ? s.parsed.length.toLocaleString("en-US") : "—"}
              tone={
                s.parsed.length &&
                Math.abs(s.parsed.length - storeEstimate) <= storeEstimate * 0.02
                  ? "open"
                  : s.parsed.length
                    ? "watch"
                    : undefined
              }
            />
            <Figure k="Centers matched" v={centers ? String(centers.matched) : "—"} />
            <Figure
              k="Complete"
              v={`${progress.done} of ${progress.total}`}
              tone={progress.done === progress.total ? "open" : undefined}
            />
            <div className="pb-0.5">
              {s.submittedAt ? (
                <div className="text-right">
                  <p className="text-[0.75rem] font-semibold text-emerald-700">
                    Sent{" "}
                    {new Date(s.submittedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  <button
                    type="button"
                    onClick={() => void submit()}
                    disabled={submitting}
                    className="text-[0.6875rem] text-slate-500 underline underline-offset-2 hover:text-indigo-700"
                  >
                    Send updates
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => void submit()}
                  disabled={submitting || progress.done < progress.total}
                  title={
                    progress.done < progress.total
                      ? "Finish the required tasks first"
                      : undefined
                  }
                  className="inline-flex h-10 items-center rounded-xl bg-indigo-600 px-4 text-[0.8125rem] font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:bg-indigo-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
                >
                  {submitting ? "Sending" : "Send to Breakpoint"}
                </button>
              )}
            </div>
          </dl>
        </div>
        {submitError && (
          <p className="mx-auto max-w-[74rem] px-6 pb-2 text-[0.75rem] text-rose-700">
            {submitError}
          </p>
        )}
        <div className="h-0.5 w-full bg-slate-100">
          <div
            className="h-full bg-amber-500 transition-[width] duration-500"
            style={{ width: `${progress.pct}%` }}
          />
        </div>
      </header>

      <div className="mx-auto grid max-w-[74rem] gap-6 px-6 py-6 lg:grid-cols-[17.5rem_1fr]">
        <aside className="self-start">
          <ul className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-xl shadow-slate-200/50">
            {TASKS.map((t) => {
              const st = statusOf(s, t.id);
              const on = open === t.id;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setOpen(t.id)}
                    className={cn(
                      "flex w-full items-start gap-2.5 border-b border-slate-100 px-3.5 py-3 text-left transition-colors duration-150 last:border-b-0",
                      on ? "bg-indigo-50" : "hover:bg-slate-50",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-1 h-2 w-2 shrink-0 rounded-full",
                        st === "complete"
                          ? "bg-emerald-600"
                          : st === "in_progress"
                            ? "bg-amber-500"
                            : "bg-slate-200",
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block truncate text-[0.8125rem]",
                          on ? "font-semibold text-indigo-800" : "font-medium text-slate-900",
                        )}
                      >
                        {t.title}
                      </span>
                      <span className="mt-0.5 block truncate text-[0.75rem] text-slate-500">
                        {held(t.id)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-4 px-3">
            <p className="text-[0.75rem] leading-relaxed text-slate-500">
              Any order. Saved in this browser as you type
              {savedAt ? `, last at ${savedAt}` : ""}.
            </p>
            <button
              type="button"
              onClick={() => {
                clearOnboarding(clientSlug);
                setS(emptyOnboarding);
                setNote(null);
                setSavedAt(null);
              }}
              className="mt-2 inline-flex items-center gap-1.5 text-[0.75rem] text-slate-400 transition-colors hover:text-rose-700"
            >
              <RotateCcw className="h-3 w-3" />
              Clear
            </button>
          </div>

          {/*
            Scope, stated where it is always visible. The original intake
            checklist carried it and a client filling this in should not
            have to ask which side of the line a job sits on.
          */}
          <div className="mt-6 border-t border-slate-200 px-3 pt-4">
            <p className="label text-slate-400">We handle</p>
            <ul className="mt-2 space-y-1.5">
              {[
                "Weekly sweep of every center, from published directories and the field",
                "Lease abstraction into a clause record, reviewed by a person",
                "Mapping which leases entitle you to demand an occupancy statement",
                "Calendaring and serving those requests",
                "Occupancy math, credit calculation, and the notice package",
              ].map((x) => (
                <li key={x} className="flex gap-2 text-[0.75rem] leading-snug text-slate-500">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-200" />
                  {x}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <main className="min-w-0 self-start rounded-2xl border border-slate-200/60 bg-white p-6 shadow-xl shadow-slate-200/50">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-slate-200 pb-3">
            <h2 className="text-[1.0625rem] font-semibold text-slate-900">{task.title}</h2>
            <p className="text-[0.75rem] text-slate-500">
              {task.owner}
              {!task.required && " · optional"}
            </p>
          </div>
          <p className="mt-2 max-w-3xl text-[0.8125rem] leading-relaxed text-slate-500">
            {task.why}
          </p>

          <div className="mt-5 space-y-5">
            {open === "portfolio" && (
              <>
                <DeliveryPicker
                  only={["system", "share", "sftp", "upload", "email", "paste"]}
                  value={chan("portfolio")}
                  onChange={(c) => setChan("portfolio", c)}
                >
                  {chan("portfolio") && (
                    <ChannelDetail
                      channel={chan("portfolio")!}
                      account={clientSlug}
                      note={chanNote("portfolio")}
                      onNote={(v) => setChanNote("portfolio", v)}
                      upload={
                        <div className="space-y-3">
                          <p className="text-[0.8125rem] leading-relaxed text-slate-500">
                            Any columns, in any order. We map them and take
                            whatever is missing off the leases.
                          </p>
                          {chan("portfolio") === "upload" ? (
                            <FileDrop
                              onError={(m) => setNote({ kind: "bad", message: m })}
                              onLoad={(f: LoadedFile) => {
                                setNote({
                                  kind: "ok",
                                  message: `${f.name}: ${f.rowCount.toLocaleString("en-US")} rows${f.sheet ? ` from sheet "${f.sheet}"` : ""}.`,
                                });
                                loadRoster(f.text, f.name);
                              }}
                            />
                          ) : (
                            <>
                              <textarea
                                value={s.raw}
                                onChange={(e) => set("raw", e.target.value)}
                                rows={6}
                                spellCheck={false}
                                placeholder={"Store #,Address,City,ST,Center,Rentable SF\n4417,7007 Friars Road,San Diego,CA,Fashion Valley,8302"}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 shadow-sm p-3 font-mono text-[0.75rem] leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => s.raw.trim() && loadRoster(s.raw)}
                                disabled={!s.raw.trim()}
                                className="rounded-lg bg-indigo-800 px-4 py-2 text-[0.8125rem] font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-40"
                              >
                                Read the roster
                              </button>
                            </>
                          )}
                          {note && (
                            <p
                              className={cn(
                                "text-[0.8125rem]",
                                note.kind === "ok" ? "text-emerald-700" : "text-rose-700",
                              )}
                            >
                              {note.message}
                            </p>
                          )}
                        </div>
                      }
                    />
                  )}
                </DeliveryPicker>

                {s.parsed.length > 0 && (
                  <>
                    <Mapping
                      headers={s.headers}
                      mapping={s.mapping}
                      sample={s.parsed[0]}
                      onChange={(h, v) =>
                        setS((p) => ({ ...p, mapping: { ...p.mapping, [h]: v } }))
                      }
                    />
                    <IntakeReview
                      rows={s.parsed}
                      headers={s.headers}
                      mapping={s.mapping}
                    />
                    {centers && <Centers centers={centers} />}
                  </>
                )}
              </>
            )}

            {open === "leases" && (
              <>
                <DeliveryPicker
                  only={["share", "system", "sftp", "upload", "email", "courier", "session"]}
                  value={chan("leases")}
                  onChange={(c) => setChan("leases", c)}
                >
                  {chan("leases") && (
                    <ChannelDetail
                      channel={chan("leases")!}
                      account={clientSlug}
                      note={chanNote("leases")}
                      onNote={(v) => setChanNote("leases", v)}
                      upload={
                        <FileDrop
                          onError={(m) => setNote({ kind: "bad", message: m })}
                          onLoad={(f) =>
                            setNote({ kind: "ok", message: `${f.name} received.` })
                          }
                        />
                      }
                    />
                  )}
                </DeliveryPicker>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
                  <input
                    type="checkbox"
                    checked={s.leasesConfirmed}
                    onChange={(e) => set("leasesConfirmed", e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-indigo-600"
                  />
                  <span className="text-[0.8125rem] leading-relaxed text-slate-700">
                    <span className="font-medium text-slate-900">
                      Amendments are included.
                    </span>{" "}
                    We begin abstracting once this is ticked, and come back only
                    where a document is missing or a clause is ambiguous.
                  </span>
                </label>
              </>
            )}

            {open === "record" && (
              <>
                <RecordStep
                  value={s.record}
                  onChange={(patch) =>
                    setS((p) => ({ ...p, record: { ...p.record, ...patch } }))
                  }
                />
                {s.record.noticeLog === "yes" && (
                  <div>
                    <p className="text-[0.8125rem] font-medium text-slate-900">Notice log</p>
                    <p className="mt-1 mb-3 text-[0.8125rem] leading-relaxed text-slate-500">
                      Store, date sent, date received, subject.
                    </p>
                    <FileDrop
                      onError={(m) => setNote({ kind: "bad", message: m })}
                      onLoad={(f) => {
                        setS((p) => ({
                          ...p,
                          noticeRaw: f.text,
                          noticeFileName: f.name,
                        }));
                        setNote({ kind: "ok", message: `${f.name} received.` });
                      }}
                    />
                    {s.noticeFileName && (
                      <p className="mt-2 text-[0.75rem] text-emerald-700">
                        {s.noticeFileName} on file.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            {open === "sales" && (
              <>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
                  <input
                    type="checkbox"
                    checked={s.salesDeferred}
                    onChange={(e) => set("salesDeferred", e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-indigo-600"
                  />
                  <span className="text-[0.8125rem] leading-relaxed text-slate-700">
                    <span className="font-medium text-slate-900">
                      Send per store, only when a right arises.
                    </span>{" "}
                    We request the months we need for the stores that trigger.
                  </span>
                </label>

                {!s.salesDeferred && (
                  <DeliveryPicker
                    only={["system", "sftp", "upload", "email"]}
                    value={chan("sales")}
                    onChange={(c) => setChan("sales", c)}
                  >
                    {chan("sales") && (
                      <ChannelDetail
                        channel={chan("sales")!}
                        account={clientSlug}
                        note={chanNote("sales")}
                        onNote={(v) => setChanNote("sales", v)}
                        upload={
                          <FileDrop
                            onError={(m) => setNote({ kind: "bad", message: m })}
                            onLoad={(f) => {
                              setS((p) => ({
                                ...p,
                                salesRaw: f.text,
                                salesFileName: f.name,
                                salesRowCount: f.rowCount,
                              }));
                              setNote({
                                kind: "ok",
                                message: `${f.name}: ${f.rowCount.toLocaleString("en-US")} rows.`,
                              });
                            }}
                          />
                        }
                      />
                    )}
                  </DeliveryPicker>
                )}

                <p className="text-[0.75rem] leading-relaxed text-slate-500">
                  One row per store per month: store number, month, gross sales.
                  Monthly figures, not a total, because the remedy is computed
                  on each month&#8217;s own sales.
                </p>
              </>
            )}

            {open === "priorities" && (
              <TriageStep
                mode={s.triageMode}
                note={s.triageNote}
                total={s.parsed.length || storeEstimate}
                onMode={(v) => set("triageMode", v)}
                onNote={(v) => set("triageNote", v)}
              />
            )}

            {open === "people" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Authorized signatory"
                  value={s.signatory}
                  onChange={(v) => set("signatory", v)}
                  placeholder="Name"
                  hint="We assemble a notice; they serve it."
                />
                <Field
                  label="Title"
                  value={s.signatoryTitle}
                  onChange={(v) => set("signatoryTitle", v)}
                  placeholder="VP, Real Estate"
                />
                <Field
                  label="Counsel of record"
                  value={s.counselName}
                  onChange={(v) => set("counselName", v)}
                  placeholder="Name or firm"
                  hint="Reviews before anything is served."
                />
                <Field
                  label="Counsel email"
                  value={s.counselEmail}
                  onChange={(v) => set("counselEmail", v)}
                  placeholder="name@firm.com"
                />
                <div className="sm:col-span-2">
                  <Field
                    label="Notify on a finding"
                    value={s.notifyEmails}
                    onChange={(v) => set("notifyEmails", v)}
                    placeholder="realestate@company.com, leaseadmin@company.com"
                    hint="Comma separated."
                  />
                </div>
              </div>
            )}

            {open === "watch" && (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  {(
                    [
                      ["weekly", "Weekly", "Cure periods run in months. A week keeps the clock honest."],
                      ["biweekly", "Every two weeks", "Fewer updates, slower first signal."],
                      ["monthly", "Monthly", "Only where every clause runs a long qualifying period."],
                    ] as const
                  ).map(([id, label, why]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => set("cadence", id)}
                      className={cn(
                        "flex w-full items-start gap-3 border-b border-slate-200 px-4 py-3 text-left transition-colors last:border-0",
                        s.cadence === id ? "bg-indigo-50" : "hover:bg-slate-100",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border",
                          s.cadence === id
                            ? "border-indigo-600 bg-indigo-600 text-white"
                            : "border-slate-200",
                        )}
                      >
                        {s.cadence === id && <Check className="h-2.5 w-2.5" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[0.8125rem] font-medium text-slate-900">
                          {label}
                        </span>
                        <span className="mt-0.5 block text-[0.75rem] text-slate-500">
                          {why}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
                  <input
                    type="checkbox"
                    checked={s.fieldVisits}
                    onChange={(e) => set("fieldVisits", e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-indigo-600"
                  />
                  <span className="text-[0.8125rem] leading-relaxed text-slate-700">
                    <span className="font-medium text-slate-900">
                      Send someone to the premises before a notice.
                    </span>{" "}
                    A dated photograph of the premises, filed with the package.
                  </span>
                </label>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   pieces
   ------------------------------------------------------------------ */

function Figure({ k, v, tone }: { k: string; v: string; tone?: "open" | "watch" }) {
  return (
    <div>
      <dt className="label text-slate-400">{k}</dt>
      <dd
        className={cn(
          "tnum mt-0.5 text-[1.0625rem] font-semibold",
          tone === "open"
            ? "text-emerald-700"
            : tone === "watch"
              ? "text-amber-700"
              : "text-slate-900",
        )}
      >
        {v}
      </dd>
    </div>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="label text-slate-500">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white shadow-sm px-3 py-2 text-[0.875rem] text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 focus:outline-none"
      />
      {hint && <p className="mt-1 text-[0.75rem] text-slate-500">{hint}</p>}
    </div>
  );
}

function Centers({ centers }: { centers: ReturnType<typeof resolveAll> }) {
  const review = centers.rows.filter((r) => r.result.status === "review");
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <h3 className="text-[0.875rem] font-semibold text-slate-900">Centers</h3>
        <p className="tnum text-[0.75rem] text-slate-500">
          {centers.matched} matched · {centers.review} to confirm · {centers.fresh} new
        </p>
      </div>
      {review.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {review.slice(0, 6).map((r) => (
            <li key={r.row} className="px-4 py-2.5">
              <p className="text-[0.8125rem] text-slate-900">
                <span className="font-medium">Row {r.row}</span> &#8220;{r.supplied}&#8221;
              </p>
              <p className="mt-0.5 text-[0.75rem] leading-snug text-slate-500">
                {r.result.why}
              </p>
              {r.result.status === "review" && (
                <p className="mt-1 text-[0.75rem] text-slate-700">
                  {r.result.candidates
                    .map((c) => `${c.name} (${c.city}, ${c.state})`)
                    .join(" · ")}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      {centers.fresh > 0 && (
        <p className="border-t border-slate-200 px-4 py-2.5 text-[0.75rem] leading-relaxed text-slate-500">
          {centers.fresh} not in our index. We add them and begin watching.
          Nothing for you to do.
        </p>
      )}
    </div>
  );
}

function Mapping({
  headers,
  mapping,
  sample,
  onChange,
}: {
  headers: string[];
  mapping: Record<string, FieldKey>;
  sample: Record<string, string> | undefined;
  onChange: (header: string, v: FieldKey) => void;
}) {
  const matched = Object.values(mapping).filter((v) => v !== "ignore").length;
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <h3 className="text-[0.875rem] font-semibold text-slate-900">Columns</h3>
        <p className="tnum text-[0.75rem] text-slate-500">
          {matched} of {headers.length} mapped
        </p>
      </div>
      <div className="max-h-72 overflow-y-auto">
        <table className="w-full border-collapse text-left">
          <tbody className="divide-y divide-slate-100">
            {headers.map((h) => {
              const value = mapping[h] ?? "ignore";
              return (
                <tr key={h}>
                  <td className="px-4 py-2 align-middle">
                    <p className="font-mono text-[0.75rem] font-medium text-slate-900">
                      {h}
                    </p>
                    <p className="truncate text-[0.6875rem] text-slate-500">
                      {sample?.[h] || "empty"}
                    </p>
                  </td>
                  <td className="px-4 py-2 text-right align-middle">
                    <select
                      value={value}
                      onChange={(e) => onChange(h, e.target.value as FieldKey)}
                      className={cn(
                        "min-w-[11rem] rounded-md border px-2 py-1.5 text-[0.75rem] font-medium focus:outline-none",
                        value === "ignore"
                          ? "border-slate-200 bg-slate-100 text-slate-500"
                          : "border-petrol-200 bg-indigo-50 text-indigo-800",
                      )}
                    >
                      <option value="ignore">Ignore</option>
                      {FIELDS.map((f) => (
                        <option key={f.key} value={f.key}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
