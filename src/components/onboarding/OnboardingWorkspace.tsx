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
        return n === 0 ? "Not started" : `${n} of 5 answered`;
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
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-[74rem] flex-wrap items-end justify-between gap-x-8 gap-y-4 px-6 py-5">
          <div className="min-w-0">
            <p className="label text-faint">Onboarding</p>
            <h1 className="mt-1 truncate text-[1.25rem] font-semibold text-ink">
              {clientName}
            </h1>
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
          </dl>
        </div>
        <div className="h-0.5 w-full bg-surface-sunk">
          <div
            className="h-full bg-brass-500 transition-[width] duration-500"
            style={{ width: `${progress.pct}%` }}
          />
        </div>
      </header>

      <div className="mx-auto grid max-w-[74rem] gap-6 px-6 py-6 lg:grid-cols-[17.5rem_1fr]">
        <aside>
          <ul>
            {TASKS.map((t) => {
              const st = statusOf(s, t.id);
              const on = open === t.id;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setOpen(t.id)}
                    className={cn(
                      "flex w-full items-start gap-2.5 border-b border-line px-3 py-2.5 text-left transition-colors duration-150",
                      on ? "bg-petrol-50" : "hover:bg-surface-sunk",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-1 h-2 w-2 shrink-0 rounded-full",
                        st === "complete"
                          ? "bg-open-600"
                          : st === "in_progress"
                            ? "bg-brass-500"
                            : "bg-line",
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block truncate text-[0.8125rem]",
                          on ? "font-semibold text-petrol-800" : "font-medium text-ink",
                        )}
                      >
                        {t.title}
                      </span>
                      <span className="mt-0.5 block truncate text-[0.75rem] text-muted">
                        {held(t.id)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-4 px-3">
            <p className="text-[0.75rem] leading-relaxed text-muted">
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
              className="mt-2 inline-flex items-center gap-1.5 text-[0.75rem] text-faint transition-colors hover:text-clay-700"
            >
              <RotateCcw className="h-3 w-3" />
              Clear
            </button>
          </div>
        </aside>

        <main className="min-w-0">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-line pb-3">
            <h2 className="text-[1.0625rem] font-semibold text-ink">{task.title}</h2>
            <p className="text-[0.75rem] text-muted">
              {task.owner}
              {!task.required && " · optional"}
            </p>
          </div>
          <p className="mt-2 max-w-3xl text-[0.8125rem] leading-relaxed text-muted">
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
                          <p className="text-[0.8125rem] leading-relaxed text-muted">
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
                                className="w-full rounded-lg border border-line bg-surface-sunk p-3 font-mono text-[0.75rem] leading-relaxed text-ink placeholder:text-faint focus:border-petrol-500 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => s.raw.trim() && loadRoster(s.raw)}
                                disabled={!s.raw.trim()}
                                className="rounded-lg bg-petrol-800 px-4 py-2 text-[0.8125rem] font-semibold text-cream transition-colors hover:bg-petrol-700 disabled:opacity-40"
                              >
                                Read the roster
                              </button>
                            </>
                          )}
                          {note && (
                            <p
                              className={cn(
                                "text-[0.8125rem]",
                                note.kind === "ok" ? "text-open-700" : "text-clay-700",
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

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface p-4">
                  <input
                    type="checkbox"
                    checked={s.leasesConfirmed}
                    onChange={(e) => set("leasesConfirmed", e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-petrol-600"
                  />
                  <span className="text-[0.8125rem] leading-relaxed text-ink-soft">
                    <span className="font-medium text-ink">
                      Amendments are included.
                    </span>{" "}
                    A lease without them reads as a right that may not exist. We
                    begin abstracting on this and return only where a document
                    is missing or a clause is ambiguous.
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
                    <p className="text-[0.8125rem] font-medium text-ink">Notice log</p>
                    <p className="mt-1 mb-3 text-[0.8125rem] leading-relaxed text-muted">
                      Store, date sent, date received, subject. Dates decide what
                      a store is owed today, because several clauses run relief
                      from the notice rather than from the condition.
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
                      <p className="mt-2 text-[0.75rem] text-open-700">
                        {s.noticeFileName} on file.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            {open === "sales" && (
              <>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface p-4">
                  <input
                    type="checkbox"
                    checked={s.salesDeferred}
                    onChange={(e) => set("salesDeferred", e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-petrol-600"
                  />
                  <span className="text-[0.8125rem] leading-relaxed text-ink-soft">
                    <span className="font-medium text-ink">
                      Send per store, only when a right arises.
                    </span>{" "}
                    Sales price a claim rather than find one, and most stores
                    never trigger. This keeps portfolio-wide figures out of a
                    vendor&#8217;s hands.
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

                <p className="text-[0.75rem] leading-relaxed text-muted">
                  One row per store per month. A percentage-of-sales remedy is
                  computed on the month&#8217;s own sales, so monthly figures
                  matter more than a total.
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
                <div className="overflow-hidden rounded-xl border border-line">
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
                        "flex w-full items-start gap-3 border-b border-line px-4 py-3 text-left transition-colors last:border-0",
                        s.cadence === id ? "bg-petrol-50" : "hover:bg-surface-sunk",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border",
                          s.cadence === id
                            ? "border-petrol-600 bg-petrol-600 text-cream"
                            : "border-line",
                        )}
                      >
                        {s.cadence === id && <Check className="h-2.5 w-2.5" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[0.8125rem] font-medium text-ink">
                          {label}
                        </span>
                        <span className="mt-0.5 block text-[0.75rem] text-muted">
                          {why}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface p-4">
                  <input
                    type="checkbox"
                    checked={s.fieldVisits}
                    onChange={(e) => set("fieldVisits", e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-petrol-600"
                  />
                  <span className="text-[0.8125rem] leading-relaxed text-ink-soft">
                    <span className="font-medium text-ink">
                      Send someone to the premises before a notice.
                    </span>{" "}
                    A directory listing is a signal. A dated photograph is what a
                    package rests on.
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
      <dt className="label text-faint">{k}</dt>
      <dd
        className={cn(
          "tnum mt-0.5 text-[1.0625rem] font-semibold",
          tone === "open"
            ? "text-open-700"
            : tone === "watch"
              ? "text-brass-700"
              : "text-ink",
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
      <label className="label text-muted">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2 text-[0.875rem] text-ink placeholder:text-faint focus:border-petrol-500 focus:outline-none"
      />
      {hint && <p className="mt-1 text-[0.75rem] text-muted">{hint}</p>}
    </div>
  );
}

function Centers({ centers }: { centers: ReturnType<typeof resolveAll> }) {
  const review = centers.rows.filter((r) => r.result.status === "review");
  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line px-4 py-3">
        <h3 className="text-[0.875rem] font-semibold text-ink">Centers</h3>
        <p className="tnum text-[0.75rem] text-muted">
          {centers.matched} matched · {centers.review} to confirm · {centers.fresh} new
        </p>
      </div>
      {review.length > 0 && (
        <ul className="divide-y divide-line">
          {review.slice(0, 6).map((r) => (
            <li key={r.row} className="px-4 py-2.5">
              <p className="text-[0.8125rem] text-ink">
                <span className="font-medium">Row {r.row}</span> &#8220;{r.supplied}&#8221;
              </p>
              <p className="mt-0.5 text-[0.75rem] leading-snug text-muted">
                {r.result.why}
              </p>
              {r.result.status === "review" && (
                <p className="mt-1 text-[0.75rem] text-ink-soft">
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
        <p className="border-t border-line px-4 py-2.5 text-[0.75rem] leading-relaxed text-muted">
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
    <div className="overflow-hidden rounded-xl border border-line">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line px-4 py-3">
        <h3 className="text-[0.875rem] font-semibold text-ink">Columns</h3>
        <p className="tnum text-[0.75rem] text-muted">
          {matched} of {headers.length} mapped
        </p>
      </div>
      <div className="max-h-72 overflow-y-auto">
        <table className="w-full border-collapse text-left">
          <tbody className="divide-y divide-line">
            {headers.map((h) => {
              const value = mapping[h] ?? "ignore";
              return (
                <tr key={h}>
                  <td className="px-4 py-2 align-middle">
                    <p className="font-mono text-[0.75rem] font-medium text-ink">
                      {h}
                    </p>
                    <p className="truncate text-[0.6875rem] text-muted">
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
                          ? "border-line bg-surface-sunk text-muted"
                          : "border-petrol-200 bg-petrol-50 text-petrol-800",
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
