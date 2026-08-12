"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { Check, CircleDashed, Clock, RotateCcw } from "lucide-react";
import {
  TASKS,
  type OnboardingState,
  type TaskId,
  clearOnboarding,
  completion,
  emptyOnboarding,
  loadOnboarding,
  saveOnboarding,
  statusOf,
} from "@/lib/onboarding-store";
import { FIELDS, applyMapping, autoMap, parseDelimited, type FieldKey } from "@/lib/ingest";
import { cn } from "@/lib/cn";
import { ActionButton, Note, Panel, Pill, type Tone } from "@/components/app/ui";
import { FileDrop, type LoadedFile } from "./FileDrop";
import { IntakeReview, TemplateButton } from "./IntakeReview";
import { RecordStep, SourceStep, TriageStep, Choice } from "./ExtraSteps";
import { buildCenterIndex, resolveAll } from "@/lib/centers";
import { portfolio } from "@/lib/portfolio";

/**
 * THE ONBOARDING WORKSPACE
 *
 * This is not a funnel and the client is not a prospect. They have paid,
 * we already know who they are and how many stores they run, and the
 * only job left is to move a large amount of information out of their
 * systems and into ours without wasting their time.
 *
 * Three things follow from that, and each is the opposite of how a
 * signup flow is built:
 *
 *   NOT LINEAR   lease administration owns the roster, legal owns the
 *                estoppels, real estate owns which centers matter. They
 *                work at the same time, so the tasks are a board and any
 *                of them can be opened in any order.
 *
 *   SAVED        it runs over days. Everything is written as it is typed
 *                and picked up where it was left, because losing a
 *                morning's work is how an expensive customer starts to
 *                feel like staff.
 *
 *   NO SELLING   no qualifying questions, no promises about how fast we
 *                are. Every screen either takes data or explains what a
 *                missing piece costs.
 */

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
  const [fileNote, setFileNote] = useState<
    { kind: "ok" | "clay"; message: string } | null
  >(null);
  const first = useRef(true);

  /* Load once on mount. Two effects rather than one, because Strict Mode
     double-invokes and a combined version consumed the saved state on
     the first pass and rendered empty on the second. */
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
    setSavedAt(new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }));
  }, [s, ready, clientSlug]);

  const set = <K extends keyof OnboardingState>(k: K, v: OnboardingState[K]) =>
    setS((p) => ({ ...p, [k]: v }));

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

  /*
   * Which mall each row actually refers to. Separate from column
   * mapping on purpose: a perfectly mapped roster still has to be tied
   * to real centers, and that is where a confident wrong answer comes
   * from. Matching a store to the wrong mall evaluates its clause
   * against another center's occupancy and nobody notices for months.
   */
  const centers = useMemo(() => {
    if (!s.parsed.length) return null;
    const index = buildCenterIndex(portfolio);
    return resolveAll(
      resolved.map((r) => ({ name: r.centerName, city: r.city, state: r.state })),
      index,
    );
  }, [resolved, s.parsed.length]);

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-surface-sunk/40">
      {/* ---- header ---- */}
      <header className="sticky top-0 z-20 border-b border-line bg-canvas">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-5 py-4 sm:px-8">
          <div className="min-w-0 flex-1">
            <p className="label text-faint">Onboarding</p>
            <h1 className="mt-0.5 truncate text-[1.125rem] font-semibold text-ink">
              {clientName}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block">
              <p className="tnum text-right text-[0.8125rem] font-semibold text-ink">
                {progress.done} of {progress.total} complete
              </p>
              <div className="mt-1.5 h-1.5 w-40 overflow-hidden rounded-full bg-surface-sunk">
                <motion.div
                  className="h-full rounded-full bg-brass-500"
                  animate={{ width: `${progress.pct}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
            <span className="flex items-center gap-1.5 text-[0.75rem] text-muted">
              <Clock className="h-3.5 w-3.5" />
              {savedAt ? `Saved ${savedAt}` : "Saves as you go"}
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[19rem_1fr]">
        {/* ---- the board ---- */}
        <aside className="space-y-3">
          <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
            {TASKS.map((t) => {
              const st = statusOf(s, t.id);
              const on = open === t.id;
              return (
                <li key={t.id} className="border-b border-line last:border-0">
                  <button
                    type="button"
                    onClick={() => setOpen(t.id)}
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors duration-200",
                      on ? "bg-petrol-50" : "hover:bg-surface-sunk",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full",
                        st === "complete"
                          ? "bg-open-600 text-cream"
                          : st === "in_progress"
                            ? "bg-brass-500 text-petrol-950"
                            : "bg-surface-sunk text-faint ring-1 ring-line",
                      )}
                    >
                      {st === "complete" ? (
                        <Check className="h-3 w-3" />
                      ) : st === "in_progress" ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      ) : (
                        <CircleDashed className="h-3 w-3" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block text-[0.875rem]",
                          on ? "font-semibold text-petrol-800" : "font-medium text-ink",
                        )}
                      >
                        {t.title}
                        {!t.required && (
                          <span className="ml-1.5 text-[0.6875rem] font-normal text-faint">
                            optional
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-[0.75rem] text-muted">
                        {t.owner}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-[0.75rem] leading-relaxed text-muted">
              Work these in any order and hand any of them to the team that
              owns it. Everything is saved in this browser as you type.
            </p>
            <button
              type="button"
              onClick={() => {
                clearOnboarding(clientSlug);
                setS(emptyOnboarding);
                setFileNote(null);
                setSavedAt(null);
              }}
              className="mt-3 inline-flex items-center gap-1.5 text-[0.75rem] font-medium text-muted transition-colors hover:text-clay-700"
            >
              <RotateCcw className="h-3 w-3" />
              Clear everything and start again
            </button>
          </div>
        </aside>

        {/* ---- the open task ---- */}
        <main className="min-w-0 space-y-5">
          {open === "portfolio" && (
            <TaskShell
              title="Store portfolio"
              lede="Every location with a co-tenancy clause. An export from the system you already run is faster than anything else here."
            >
              <SourceStep
                source={s.source}
                system={s.leaseAdminSystem}
                onSource={(v) => set("source", v)}
                onSystem={(v) => set("leaseAdminSystem", v)}
              />

              {s.source && (
                <div className="mt-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-[0.9375rem] font-semibold text-ink">
                        Send whatever your system exports
                      </h3>
                      <p className="mt-1 max-w-xl text-[0.8125rem] leading-relaxed text-muted">
                        Any columns, any order, any format. We map it, repair
                        what we can, and take everything else off the leases
                        rather than asking you to retype it.
                      </p>
                    </div>
                    <TemplateButton />
                  </div>

                  <FileDrop
                    onError={(m) => setFileNote({ kind: "clay", message: m })}
                    onLoad={(f: LoadedFile) => {
                      setFileNote({
                        kind: "ok",
                        message: f.sheet
                          ? `${f.name}: ${f.rowCount.toLocaleString("en-US")} rows from sheet "${f.sheet}"${
                              f.otherSheets?.length
                                ? `. Other sheets in this workbook: ${f.otherSheets.join(", ")}.`
                                : "."
                            }`
                          : `${f.name}: ${f.rowCount.toLocaleString("en-US")} rows.`,
                      });
                      loadRoster(f.text, f.name);
                    }}
                  />

                  {fileNote && (
                    <Note tone={fileNote.kind === "ok" ? "open" : "clay"}>
                      {fileNote.message}
                    </Note>
                  )}

                  <details className="rounded-xl border border-line bg-surface-sunk p-4">
                    <summary className="cursor-pointer text-[0.8125rem] font-medium text-ink">
                      Or paste it instead
                    </summary>
                    <textarea
                      value={s.raw}
                      onChange={(e) => set("raw", e.target.value)}
                      onBlur={() => s.raw.trim() && loadRoster(s.raw)}
                      rows={7}
                      spellCheck={false}
                      placeholder={"Store #,Address,City,ST,Center,Rentable SF\n4417,7007 Friars Road,San Diego,CA,Fashion Valley,8302"}
                      className="mt-3 w-full rounded-lg border border-line bg-surface p-3 font-mono text-[0.75rem] leading-relaxed text-ink placeholder:text-faint focus:border-petrol-500 focus:outline-none"
                    />
                    {/* Explicit, because loading on blur alone means a
                        client pastes and watches nothing happen. */}
                    <ActionButton
                      className="mt-3"
                      onClick={() => s.raw.trim() && loadRoster(s.raw)}
                      disabled={!s.raw.trim()}
                    >
                      Read the roster
                    </ActionButton>
                  </details>

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
                      {centers && (
                        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
                          <div className="border-b border-line px-5 py-4">
                            <h3 className="text-[0.9375rem] font-semibold text-ink">
                              Centers
                            </h3>
                            <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted">
                              Each store tied to the mall it actually sits in.
                              We never match on the name alone: two of the
                              centers we already watch are called The
                              Galleria, and two more are one letter apart in
                              different states.
                            </p>
                          </div>
                          <div className="grid gap-px bg-line sm:grid-cols-3">
                            {(
                              [
                                ["Resolved", centers.matched, "open"],
                                ["Need a person", centers.review, "watch"],
                                ["New to us", centers.fresh, "muted"],
                              ] as const
                            ).map(([label, n, tone]) => (
                              <div key={label} className="bg-surface px-5 py-4">
                                <p className="label text-muted">{label}</p>
                                <p
                                  className={cn(
                                    "tnum font-display mt-1.5 text-[1.5rem] leading-none",
                                    tone === "open"
                                      ? "text-open-700"
                                      : tone === "watch"
                                        ? "text-brass-700"
                                        : "text-ink",
                                  )}
                                >
                                  {n.toLocaleString("en-US")}
                                </p>
                              </div>
                            ))}
                          </div>

                          {centers.review > 0 && (
                            <ul className="divide-y divide-line border-t border-line">
                              {centers.rows
                                .filter((r) => r.result.status === "review")
                                .slice(0, 8)
                                .map((r) => (
                                  <li key={r.row} className="px-5 py-3">
                                    <p className="text-[0.875rem] font-medium text-ink">
                                      Row {r.row}: &#8220;{r.supplied}&#8221;
                                    </p>
                                    <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-muted">
                                      {r.result.why}
                                    </p>
                                    {r.result.status === "review" && (
                                      <div className="mt-2 flex flex-wrap gap-1.5">
                                        {r.result.candidates.map((c) => (
                                          <span
                                            key={c.id}
                                            className="rounded-md bg-surface-sunk px-2 py-1 text-[0.6875rem] font-medium text-ink-soft"
                                          >
                                            {c.name} · {c.city}, {c.state}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </li>
                                ))}
                            </ul>
                          )}

                          {centers.fresh > 0 && (
                            <p className="border-t border-line px-5 py-3 text-[0.8125rem] leading-relaxed text-muted">
                              {centers.fresh.toLocaleString("en-US")} center
                              {centers.fresh === 1 ? " is" : "s are"} not in our
                              index yet. That is normal on a first load and it
                              is our job, not yours: we add them and begin
                              watching before abstraction finishes.
                            </p>
                          )}
                        </div>
                      )}

                      <Note tone="open">
                        {resolved.length.toLocaleString("en-US")} locations read
                        {storeEstimate > 0 && (
                          <>
                            {" "}
                            against the {storeEstimate.toLocaleString("en-US")} we
                            expected.{" "}
                            {Math.abs(resolved.length - storeEstimate) > storeEstimate * 0.1
                              ? "That is a wider gap than usual, so it is worth checking the export covered every region."
                              : "That lines up."}
                          </>
                        )}
                      </Note>
                    </>
                  )}
                </div>
              )}
            </TaskShell>
          )}

          {open === "leases" && (
            <TaskShell
              title="Lease documents"
              lede="The executed lease and every amendment, for the stores above. Amendments routinely delete, suspend or rewrite co-tenancy, so a lease without them reads as a right that may not exist."
            >
              <Choice
                value={s.leaseDelivery}
                onChange={(v) => set("leaseDelivery", v)}
                options={[
                  {
                    id: "share",
                    title: "Share a folder we can pull from",
                    tag: "Fastest at scale",
                    blurb:
                      "SharePoint, Box, Google Drive or an S3 bucket. Read access is enough. For several hundred stores this is the only approach that does not involve someone uploading files for a week.",
                  },
                  {
                    id: "upload",
                    title: "Upload them here",
                    blurb:
                      "Sensible up to a few dozen leases. Drag them in and we match each to a store by store number or center.",
                  },
                  {
                    id: "mail",
                    title: "Our lease abstractor already has them",
                    blurb:
                      "If a third party holds your abstracts, name them and we will request the file directly rather than putting you in the middle.",
                  },
                ]}
              />

              <div className="mt-5">
                <label className="label text-muted">
                  Where they are, or who holds them
                </label>
                <textarea
                  value={s.leaseNote}
                  onChange={(e) => set("leaseNote", e.target.value)}
                  rows={3}
                  placeholder="A folder link, a system name, or the contact who can grant access."
                  className="mt-2 w-full rounded-xl border border-line bg-surface-sunk p-3.5 text-[0.8125rem] text-ink placeholder:text-faint focus:border-petrol-500 focus:outline-none"
                />
              </div>

              <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface p-4">
                <input
                  type="checkbox"
                  checked={s.leasesConfirmed}
                  onChange={(e) => set("leasesConfirmed", e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-petrol-600"
                />
                <span className="text-[0.8125rem] leading-relaxed text-ink-soft">
                  <span className="font-medium text-ink">
                    Access is arranged, including amendments.
                  </span>{" "}
                  We start abstracting as soon as this is ticked, and we come
                  back to you only where a document is missing or a clause is
                  ambiguous.
                </span>
              </label>
            </TaskShell>
          )}

          {open === "record" && (
            <TaskShell
              title="What is already on the record"
              lede="Answer every line, including not sure. Each of these can defeat a claim that would otherwise stand, and finding out afterward is considerably worse."
            >
              <RecordStep
                value={s.record}
                onChange={(patch) =>
                  setS((p) => ({ ...p, record: { ...p.record, ...patch } }))
                }
              />

              {s.record.noticeLog === "yes" && (
                <div className="mt-5">
                  <h3 className="text-[0.9375rem] font-semibold text-ink">
                    Send the notice log
                  </h3>
                  <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted">
                    Store, date sent, date received, and what it concerned.
                    Dates are what matter: several clauses run relief from your
                    notice rather than from the condition, so a served notice
                    already on file changes what a store is owed today.
                  </p>
                  <FileDrop
                    className="mt-4"
                    onError={(m) => setFileNote({ kind: "clay", message: m })}
                    onLoad={(f: LoadedFile) => {
                      setS((prev) => ({
                        ...prev,
                        noticeRaw: f.text,
                        noticeFileName: f.name,
                      }));
                      setFileNote({
                        kind: "ok",
                        message: `${f.name}: ${f.rowCount.toLocaleString("en-US")} notice rows read.`,
                      });
                    }}
                  />
                  {s.noticeFileName && (
                    <p className="mt-2 text-[0.75rem] text-open-700">
                      {s.noticeFileName} received.
                    </p>
                  )}
                </div>
              )}
            </TaskShell>
          )}

          {open === "sales" && (
            <TaskShell
              title="Store sales"
              lede="Sales price a claim; they do not find one. We can watch every store and tell you a right has arisen without them, and we can only tell you what it is worth with them."
            >
              <Note tone="petrol">
                A percentage-of-sales remedy is computed on the month's own
                sales, not an annual average. In the pilot portfolio a strong
                December wiped out a saving that the February either side of it
                paid in full, so monthly figures matter more than a total.
              </Note>

              <Choice
                value={s.salesDelivery}
                onChange={(v) => set("salesDelivery", v)}
                options={[
                  {
                    id: "on_request",
                    title: "Send them per store, when something triggers",
                    tag: "Least exposure",
                    blurb:
                      "We ask only for the stores where a right has actually arisen. Most stores never trigger, so this keeps portfolio-wide sales out of a vendor's hands entirely.",
                  },
                  {
                    id: "upload",
                    title: "Upload monthly sales now",
                    blurb:
                      "One row per store per month. Pricing is immediate and nothing waits on a request when a clock is already running.",
                  },
                  {
                    id: "feed",
                    title: "Connect a feed",
                    blurb:
                      "A scheduled export from your reporting system. Best where remedies are already running and the figures move every month.",
                  },
                ]}
              />

              {s.salesDelivery === "upload" && (
                <div className="mt-5 space-y-4">
                  <FileDrop
                    onError={(m) => setFileNote({ kind: "clay", message: m })}
                    onLoad={(f: LoadedFile) => {
                      setS((prev) => ({
                        ...prev,
                        salesRaw: f.text,
                        salesFileName: f.name,
                        salesRowCount: f.rowCount,
                      }));
                      setFileNote({
                        kind: "ok",
                        message: `${f.name}: ${f.rowCount.toLocaleString("en-US")} sales rows read.`,
                      });
                    }}
                  />
                  <p className="text-[0.75rem] leading-relaxed text-muted">
                    Store number, month, gross sales. Any column order, any date
                    format we can read.
                  </p>
                </div>
              )}

              {s.salesRowCount > 0 && (
                <Note tone="open">
                  {s.salesFileName}: {s.salesRowCount.toLocaleString("en-US")}{" "}
                  rows held for pricing.
                </Note>
              )}
            </TaskShell>
          )}

          {open === "priorities" && (
            <TaskShell
              title="Where we start"
              lede="Abstracting a large portfolio takes time. Telling us where the trouble already is means the first answers land in weeks rather than at the end."
            >
              <TriageStep
                mode={s.triageMode}
                note={s.triageNote}
                total={s.parsed.length || storeEstimate}
                onMode={(v) => set("triageMode", v)}
                onNote={(v) => set("triageNote", v)}
              />
            </TaskShell>
          )}

          {open === "people" && (
            <TaskShell
              title="People and authority"
              lede="We assemble a notice package. Your authorized signatory serves it. Deciding who that is now rather than against a cure deadline is worth more than it sounds."
            >
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field
                  label="Authorized signatory"
                  hint="Who signs a co-tenancy notice."
                  value={s.signatory}
                  onChange={(v) => set("signatory", v)}
                  placeholder="Name"
                />
                <Field
                  label="Their title"
                  value={s.signatoryTitle}
                  onChange={(v) => set("signatoryTitle", v)}
                  placeholder="VP, Real Estate"
                />
                <Field
                  label="Counsel of record"
                  hint="Who reviews before anything is served."
                  value={s.counselName}
                  onChange={(v) => set("counselName", v)}
                  placeholder="Name or firm"
                />
                <Field
                  label="Counsel email"
                  value={s.counselEmail}
                  onChange={(v) => set("counselEmail", v)}
                  placeholder="name@firm.com"
                />
              </div>

              <div className="mt-4">
                <Field
                  label="Who else hears about a finding"
                  hint="Comma separated. These are the people a trigger notification reaches."
                  value={s.notifyEmails}
                  onChange={(v) => set("notifyEmails", v)}
                  placeholder="realestate@company.com, leaseadmin@company.com"
                />
              </div>
            </TaskShell>
          )}

          {open === "watch" && (
            <TaskShell
              title="Watch preferences"
              lede="Defaults are set. Change them if your leases or your appetite call for something else."
            >
              <Choice
                value={s.cadence}
                onChange={(v) => set("cadence", v)}
                options={[
                  {
                    id: "weekly",
                    title: "Weekly",
                    tag: "Default",
                    blurb:
                      "A sweep every week. Cure periods are usually measured in months, so a week keeps the clock honest without noise.",
                  },
                  {
                    id: "biweekly",
                    title: "Every two weeks",
                    blurb: "Lower volume of updates, and a slower first signal.",
                  },
                  {
                    id: "monthly",
                    title: "Monthly",
                    blurb:
                      "Only sensible where every clause in your portfolio runs a long qualifying period.",
                  },
                ]}
              />

              <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface p-4">
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
                  A directory listing is a signal. A dated photograph is
                  evidence, and it is what a package rests on.
                </span>
              </label>
            </TaskShell>
          )}

          {/* ---- what is outstanding ---- */}
          <Panel>
            <h3 className="text-[0.9375rem] font-semibold text-ink">
              Outstanding
            </h3>
            <ul className="mt-3 space-y-2">
              {TASKS.filter((t) => statusOf(s, t.id) !== "complete").map((t) => (
                <li key={t.id} className="flex items-start gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brass-500" />
                  <p className="text-[0.8125rem] text-ink-soft">
                    <button
                      type="button"
                      onClick={() => setOpen(t.id)}
                      className="font-medium text-ink underline underline-offset-2 hover:text-petrol-700"
                    >
                      {t.title}
                    </button>{" "}
                    {t.why}
                  </p>
                </li>
              ))}
              {TASKS.every((t) => statusOf(s, t.id) === "complete") && (
                <li className="text-[0.8125rem] text-muted">
                  Nothing outstanding. Your account manager has been notified
                  and abstraction begins on the priority cohort.
                </li>
              )}
            </ul>
          </Panel>
        </main>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   pieces
   ------------------------------------------------------------------ */

function TaskShell({
  title,
  lede,
  children,
}: {
  title: string;
  lede: string;
  children: React.ReactNode;
}) {
  return (
    <Panel>
      <h2 className="text-[1.125rem] font-semibold text-ink">{title}</h2>
      <p className="mt-1.5 max-w-2xl text-[0.875rem] leading-relaxed text-muted">
        {lede}
      </p>
      {children}
    </Panel>
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
        className="mt-2 w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-[0.875rem] text-ink placeholder:text-faint focus:border-petrol-500 focus:outline-none"
      />
      {hint && <p className="mt-1.5 text-[0.75rem] text-muted">{hint}</p>}
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
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="border-b border-line px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[0.9375rem] font-semibold text-ink">
            Column mapping
          </h3>
          <Pill tone={(matched === headers.length ? "open" : "watch") as Tone}>
            {matched} of {headers.length} matched
          </Pill>
        </div>
        <p className="mt-1 text-[0.8125rem] text-muted">
          Your header on the left, ours on the right. Change anything we read
          wrong and ignore what you do not need.
        </p>
      </div>
      <ul className="max-h-[22rem] divide-y divide-line overflow-y-auto">
        {headers.map((h) => {
          const value = mapping[h] ?? "ignore";
          return (
            <li key={h} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[0.8125rem] font-medium text-ink">
                  {h}
                </p>
                <p className="truncate text-[0.75rem] text-muted">
                  {sample?.[h] || "empty"}
                </p>
              </div>
              <select
                value={value}
                onChange={(e) => onChange(h, e.target.value as FieldKey)}
                className={cn(
                  "min-w-[190px] rounded-lg border px-3 py-2 text-[0.8125rem] font-medium focus:outline-none",
                  value === "ignore"
                    ? "border-line bg-surface-sunk text-muted"
                    : "border-petrol-300 bg-petrol-50 text-petrol-800",
                )}
              >
                <option value="ignore">Ignore this column</option>
                {FIELDS.map((f) => (
                  <option key={f.key} value={f.key}>
                    {f.label}
                    {f.required ? " (required)" : ""}
                  </option>
                ))}
              </select>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
