"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check, Store } from "lucide-react";
import {
  type CenterFacts,
  type Clause,
  type ClaimStatus,
  type LeaseEconomics,
  STATE_META,
  evaluateClause,
} from "@/lib/clause";
import { normalizeTenantName } from "@/lib/matching";
import { cn } from "@/lib/cn";
import { ActionButton, Panel, PanelHead, Pill, type Tone } from "./ui";

/**
 * THE WEEKLY CHECK
 *
 * Before any crawler exists, a person serves the first customers: they
 * open each center's published directory and record who is listed. This
 * is the tool that makes that a twenty minute job across a portfolio
 * rather than an afternoon, and it is deliberately built for that
 * person rather than for a machine.
 *
 * The operator pastes the directory as it appears on the page. Store
 * names arrive one per line, or separated by pipes and commas, because
 * that is what a copy off a mall website actually looks like. We diff
 * that against the roster we hold and report three things:
 *
 *   gone      on our roster, absent from the paste. Candidate closure.
 *   returned  marked dark before, listed again now.
 *   new       listed now, not on our roster at all.
 *
 * Nothing is saved automatically. A paste is a secondary source and a
 * missing line can mean a redesigned page as easily as a closed store,
 * so the operator confirms each change and the clause impact is shown
 * before anything is written.
 */

export type CheckCenter = {
  locationId: string;
  center: CenterFacts;
  clause: Clause;
  econ: LeaseEconomics;
  claim: ClaimStatus;
  /** Suite ids the clause actually depends on, so those sort first. */
  watched: string[];
};

type Diff = {
  gone: { id: string; name: string; watched: boolean }[];
  returned: { id: string; name: string; watched: boolean }[];
  fresh: string[];
  /** Suites a listing cannot tell apart. */
  ambiguous: { id: string; name: string }[];
  /** Share of the roster this listing accounted for. */
  coverage: number;
  matched: number;
};

/**
 * Below this, a listing is treated as incomplete rather than as
 * evidence that the center emptied. Chosen high on purpose: a real
 * directory copy accounts for nearly the whole roster, and the cost of
 * pausing on a good paste is a click, while the cost of accepting a bad
 * one is a notice served on a store that never closed.
 */
const COVERAGE_FLOOR = 0.6;

export function CenterCheck({
  centers,
  asOf,
}: {
  centers: CheckCenter[];
  asOf: string;
}) {
  const [activeId, setActiveId] = useState(centers[0]?.locationId ?? "");
  const [paste, setPaste] = useState("");
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});
  const [recording, setRecording] = useState(false);
  const [recorded, setRecorded] = useState<string | null>(null);
  const [recordError, setRecordError] = useState<string | null>(null);

  const active = centers.find((c) => c.locationId === activeId) ?? centers[0];

  /**
   * Split a pasted directory into names.
   *
   * Line breaks win whenever there are any, because a copy off a
   * directory page is one store per line and retailers put the other
   * delimiters inside their own names: this portfolio alone carries
   * "A|X Armani Exchange" and "White House | Black Market". Splitting
   * those on the pipe shredded two real stores into four fragments and
   * reported both as closed.
   */
  const pastedNames = useMemo(() => {
    const raw = /[\n\r]/.test(paste)
      ? paste.split(/[\n\r]+/)
      : paste.split(/[,;\t]+/);
    /* Normalize first, then drop what is empty. Filtering on length
       before normalizing threw away a real store: Fashion Valley has one
       named "Q", and a two character minimum reported it closed every
       week. Bullets and stray punctuation normalize to nothing and fall
       out here anyway. */
    return raw
      .map((s) => normalizeTenantName(s.trim()))
      .filter((s) => s.length > 0);
  }, [paste]);

  const diff: Diff | null = useMemo(() => {
    if (!active || pastedNames.length === 0) return null;
    const seen = new Set(pastedNames);
    const watched = new Set(active.watched);

    const gone: Diff["gone"] = [];
    const returned: Diff["returned"] = [];
    const known = new Set<string>();

    /*
     * Two suites can share a normalized name and be different stores.
     * Fashion Valley lists "jcpenney" and "JCPenney" as separate anchors
     * forty-two thousand square feet apart, and only one of them closed.
     * A pasted listing gives us names and nothing else, so it cannot
     * tell them apart, and guessing which one a line refers to is the
     * same mistake that lost the claim in the first place. They are held
     * out of the diff and named for a person instead.
     */
    const byNorm = new Map<string, number>();
    for (const s of active.center.suites) {
      const n = normalizeTenantName(s.name);
      byNorm.set(n, (byNorm.get(n) ?? 0) + 1);
    }

    const ambiguous: Diff["ambiguous"] = [];

    for (const s of active.center.suites) {
      const n = normalizeTenantName(s.name);
      known.add(n);
      if ((byNorm.get(n) ?? 0) > 1) {
        if (seen.has(n)) ambiguous.push({ id: s.id, name: s.name });
        continue;
      }
      const listed = seen.has(n);
      if (s.status === "open" && !listed)
        gone.push({ id: s.id, name: s.name, watched: watched.has(s.id) });
      if (s.status !== "open" && listed)
        returned.push({ id: s.id, name: s.name, watched: watched.has(s.id) });
    }

    const fresh = [...new Set(pastedNames)].filter((n) => !known.has(n));
    /* Sort what the clause depends on to the top. A named anchor going
       missing is the whole job; a food court kiosk is not. */
    gone.sort((a, b) => Number(b.watched) - Number(a.watched));

    /*
     * How much of the roster this listing actually accounted for.
     *
     * A paste covering a fraction of the center is nearly always a
     * partial copy or a page that has been redesigned, not a mall that
     * emptied overnight. Left unguarded, four pasted names against a two
     * hundred store roster reads as two hundred closures, and that is
     * the shape of an error that ends up in a notice.
     */
    const matched = active.center.suites.filter((s) =>
      seen.has(normalizeTenantName(s.name)),
    ).length;
    const coverage = active.center.suites.length
      ? matched / active.center.suites.length
      : 0;

    return { gone, returned, fresh, ambiguous, coverage, matched };
  }, [active, pastedNames]);

  /** The clause re-evaluated as though every accepted change were true. */
  const impact = useMemo(() => {
    if (!active) return null;
    const working: CenterFacts = {
      ...active.center,
      suites: active.center.suites.map((s) =>
        accepted[s.id]
          ? { ...s, status: s.status === "open" ? "dark" : "open" }
          : s,
      ),
    };
    const before = evaluateClause(
      active.clause,
      active.center,
      active.econ,
      active.claim,
      asOf,
    );
    const after = evaluateClause(
      active.clause,
      working,
      active.econ,
      active.claim,
      asOf,
    );
    return { before, after, changed: before.state !== after.state };
  }, [active, accepted, asOf]);

  const acceptedCount = Object.values(accepted).filter(Boolean).length;

  /*
   * Filing the check. Each confirmed change goes in as its own store
   * report, because that is what it is: a person looked at the
   * directory and attests to what it said. One row per store keeps the
   * queue workable when a real sweep confirms twelve changes at once.
   */
  const record = async () => {
    if (!active) return;
    setRecording(true);
    setRecordError(null);
    const changes = active.center.suites.filter((su) => accepted[su.id]);
    try {
      for (const su of changes) {
        const closing = su.status === "open";
        const res = await fetch("/app/api/requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "closure_report",
            locationId: active.locationId,
            centerName: active.center.name,
            storeName: su.name,
            observedOn: new Date().toISOString().slice(0, 10),
            body: closing
              ? "Weekly check: absent from the published directory."
              : "Weekly check: listed again after being marked closed.",
          }),
        });
        if (!res.ok) throw new Error("filing failed");
      }
      setRecorded(
        `${changes.length} change${changes.length === 1 ? "" : "s"} filed`,
      );
      setAccepted({});
    } catch {
      setRecordError("The check did not file. Nothing was lost; try again.");
    } finally {
      setRecording(false);
    }
  };

  if (!active) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-[15rem_1fr]">
      {/* ---- which center ---- */}
      <Panel flush className="h-fit">
        <div className="px-4 pt-4">
          <p className="label text-muted">Centers</p>
        </div>
        <ul className="mt-2 max-h-[28rem] overflow-y-auto">
          {centers.map((c) => {
            const on = c.locationId === active.locationId;
            return (
              <li key={c.locationId}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveId(c.locationId);
                    setPaste("");
                    setAccepted({});
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-4 py-2 text-left text-[0.8125rem] transition-colors",
                    on
                      ? "bg-petrol-50 font-semibold text-petrol-800"
                      : "text-ink-soft hover:bg-surface-sunk",
                  )}
                >
                  <Store className="h-3.5 w-3.5 shrink-0 text-faint" />
                  <span className="min-w-0 flex-1 truncate">{c.center.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </Panel>

      <div className="space-y-4">
        {/* ---- paste ---- */}
        <Panel>
          <PanelHead
            title={`Directory for ${active.center.name}`}
            hint={`Paste the center's tenant listing. ${active.center.suites.length} stores on file, ${active.watched.length} named by this clause.`}
            right={
              <Pill tone={"muted" as Tone}>
                {pastedNames.length} names read
              </Pill>
            }
          />
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            rows={5}
            spellCheck={false}
            placeholder="Macy&#39;s, Nordstrom, Sephora&#10;Zara&#10;Apple Computer"
            className="mt-3 w-full rounded-xl border border-line bg-surface-sunk p-3 font-mono text-[0.75rem] leading-relaxed text-ink outline-none focus:border-petrol-300"
          />
          <p className="mt-2 text-[0.75rem] text-muted">
            One per line, or separated by commas or pipes. Case and
            punctuation are ignored when matching.
          </p>
        </Panel>

        {/* ---- what changed ---- */}
        {diff && (
          <Panel flush>
            <div className="px-5 pt-5">
              <PanelHead
                title="Changes to confirm"
                hint="A name missing from a paste can mean a redesigned page as easily as a closed store. Confirm each one."
              />
            </div>

            {diff.coverage < COVERAGE_FLOOR ? (
              <div className="px-5 py-5">
                <div className="rounded-xl border border-clay-100 bg-clay-50 p-4">
                  <p className="text-[0.8125rem] font-semibold text-clay-700">
                    This listing looks incomplete
                  </p>
                  <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-soft">
                    It accounts for {diff.matched} of{" "}
                    {active.center.suites.length} stores on file, which is{" "}
                    {Math.round(diff.coverage * 100)}% of the roster. That is
                    almost always a partial copy or a directory page that has
                    changed, rather than{" "}
                    {diff.gone.length} closures. Paste the full listing before
                    recording anything.
                  </p>
                </div>
              </div>
            ) : diff.gone.length === 0 && diff.returned.length === 0 ? (
              <p className="px-5 py-6 text-[0.8125rem] text-muted">
                Nothing changed against the roster on file. That is still a
                result and worth recording.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-line border-t border-line">
                {[...diff.gone, ...diff.returned].map((s) => {
                  const isGone = diff.gone.some((g) => g.id === s.id);
                  return (
                    <li
                      key={s.id}
                      className="flex flex-wrap items-center gap-3 px-5 py-3"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setAccepted((p) => ({ ...p, [s.id]: !p[s.id] }))
                        }
                        className={cn(
                          "grid h-6 w-6 shrink-0 place-items-center rounded-md border transition-colors",
                          accepted[s.id]
                            ? "border-petrol-600 bg-petrol-600 text-cream"
                            : "border-line bg-surface hover:border-petrol-300",
                        )}
                        aria-pressed={Boolean(accepted[s.id])}
                        aria-label={`Confirm ${s.name}`}
                      >
                        {accepted[s.id] && <Check className="h-3.5 w-3.5" />}
                      </button>

                      <span className="min-w-0 flex-1">
                        <span className="block text-[0.875rem] font-medium text-ink">
                          {s.name}
                        </span>
                        <span className="block text-[0.75rem] text-muted">
                          {isGone
                            ? "On file as open, not in this listing"
                            : "On file as closed, listed again"}
                        </span>
                      </span>

                      {s.watched && (
                        <Pill tone={"brass" as Tone} dot>
                          Named by the clause
                        </Pill>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {diff.ambiguous.length > 0 && (
              <div className="border-t border-line px-5 py-3">
                <p className="text-[0.75rem] leading-relaxed text-muted">
                  {diff.ambiguous.map((a) => a.name).join(", ")} share a name
                  with another store in this center and cannot be told apart
                  from a listing. Confirm those on site.
                </p>
              </div>
            )}

            {diff.fresh.length > 0 && (
              <div className="border-t border-line px-5 py-3">
                <p className="text-[0.75rem] text-muted">
                  {diff.fresh.length} listed{" "}
                  {diff.fresh.length === 1 ? "name is" : "names are"} not on the
                  roster at all. New tenants are recorded during setup, not
                  here.
                </p>
              </div>
            )}
          </Panel>
        )}

        {/* ---- impact ---- */}
        <AnimatePresence>
          {impact && acceptedCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Panel>
                <PanelHead
                  title="Effect on the clause"
                  hint={`${acceptedCount} change${acceptedCount === 1 ? "" : "s"} confirmed. Nothing is saved yet.`}
                />
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Pill tone={STATE_META[impact.before.state].tone as Tone} dot>
                    {STATE_META[impact.before.state].label}
                  </Pill>
                  <ArrowRight className="h-4 w-4 text-faint" />
                  <Pill tone={STATE_META[impact.after.state].tone as Tone} dot>
                    {STATE_META[impact.after.state].label}
                  </Pill>
                  {!impact.changed && (
                    <span className="text-[0.8125rem] text-muted">
                      No change of state.
                    </span>
                  )}
                </div>

                <ul className="mt-4 space-y-2 border-t border-line pt-3">
                  {impact.after.triggers.map((t) => (
                    <li key={t.id} className="flex items-start gap-2.5">
                      <span
                        className={cn(
                          "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                          t.failing ? "bg-clay-500" : "bg-open-600",
                        )}
                      />
                      <p className="text-[0.8125rem] text-ink-soft">
                        <span className="font-medium text-ink">{t.label}</span>{" "}
                        {t.observed}
                      </p>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-3">
                  <ActionButton
                    variant="primary"
                    onClick={() => void record()}
                    disabled={recording || acceptedCount === 0}
                  >
                    {recording ? "Filing" : "Record this check"}
                  </ActionButton>
                  {recorded && (
                    <p className="text-[0.75rem] text-open-700">{recorded}.</p>
                  )}
                  {recordError && (
                    <p className="text-[0.75rem] text-clay-700">{recordError}</p>
                  )}
                  {!recorded && !recordError && (
                    <p className="text-[0.75rem] text-muted">
                      Files each confirmed change as a store report.
                    </p>
                  )}
                </div>
              </Panel>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
