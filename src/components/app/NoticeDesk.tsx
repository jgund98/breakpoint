"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Lock, X } from "lucide-react";
import { NOTICE_META, type NoticeStage } from "@/lib/workspace-store";
import { ROLES, type Permission, type RoleId } from "@/lib/team";
import { prettyDate } from "@/lib/clause";
import { cn } from "@/lib/cn";
import { ActionButton, Panel, PanelHead, Pill, type Tone } from "./ui";
import { RequestVerification } from "./RequestVerification";

/**
 * THE NOTICE DESK
 *
 * The package moves: assembled, reviewed by counsel, approved, served.
 *
 * Each transition is gated on the permission that actually governs it,
 * not on a flag. Legal can approve and cannot serve. A signatory can
 * serve and cannot approve. That separation is the reason the audit
 * trail behind a co-tenancy notice is worth anything, so the software
 * enforces it rather than describing it.
 */

export type NoticeCandidate = {
  id: string;
  center: string;
  city: string;
  stateLabel: string;
  stateTone: Tone;
  failing: string;
  monthly: string;
  verified: boolean;
};

const STAGE_TONE: Record<NoticeStage, Tone> = {
  not_started: "muted",
  assembled: "petrol",
  counsel_review: "watch",
  approved: "brass",
  served: "open",
  declined: "muted",
};

/** Which permission each forward transition requires. */
const NEEDS: Partial<Record<NoticeStage, Permission>> = {
  not_started: "assemble_notice",
  assembled: "assemble_notice",
  counsel_review: "approve_notice",
  approved: "serve_notice",
};

type FlowRow = {
  stage: NoticeStage;
  served_on: string | null;
  reason: string | null;
  updated_by: string | null;
};

export function NoticeDesk({ candidates }: { candidates: NoticeCandidate[] }) {
  /* The lifecycle is a system of record now: stages live in
     notice_workflow, transitions are permission-checked and audited
     SERVER-side, and this component only asks. */
  const [flows, setFlows] = useState<Record<string, FlowRow> | null>(null);
  const [role, setRole] = useState<RoleId>("viewer");
  const [err, setErr] = useState<string | null>(null);
  const [declining, setDeclining] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/app/api/notice-workflow", { cache: "no-store" });
      if (!r.ok) throw new Error();
      const d = await r.json();
      const map: Record<string, FlowRow> = {};
      for (const w of d.workflows ?? []) map[w.location_ref] = w;
      setFlows(map);
      setRole(d.role ?? "viewer");
    } catch {
      setFlows({});
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const setNotice = async (
    locationId: string,
    stage: NoticeStage,
    declineReason?: string,
  ) => {
    try {
      const r = await fetch("/app/api/notice-workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationRef: locationId, to: stage, reason: declineReason }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => null);
        setErr(d?.error ?? "That step was refused.");
      } else {
        setErr(null);
      }
    } finally {
      await load();
    }
  };

  const ready = flows !== null;

  /* The served notice's next chapter, shared with the team's board. */
  const [tracked, setTracked] = useState<
    Record<string, { stage: string; response: string | null }>
  >({});
  useEffect(() => {
    let alive = true;
    void fetch("/app/api/notice-status", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d) return;
        const map: Record<string, { stage: string; response: string | null }> = {};
        for (const s of d.statuses ?? [])
          map[s.location_ref] = { stage: s.stage, response: s.response };
        setTracked(map);
      });
    return () => {
      alive = false;
    };
  }, []);

  const can = (p: Permission) => ROLES[role].permissions.includes(p);

  const stageOf = (id: string): NoticeStage =>
    flows?.[id]?.stage ?? "not_started";

  if (!ready) return <div className="shimmer h-64 rounded-2xl" />;

  if (candidates.length === 0) {
    return (
      <Panel className="text-center">
        <div className="mx-auto max-w-md py-12">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
            <Check className="h-5 w-5" />
          </span>
          <h2 className="mt-4 text-[1.0625rem] font-semibold text-slate-900">
            Nothing to serve
          </h2>
          <p className="mt-2 text-[0.875rem] leading-relaxed text-slate-500">
            No location has a failing test that has cleared its cure period with
            preconditions met. Packages appear here automatically when one does.
          </p>
        </div>
      </Panel>
    );
  }

  return (
    <Panel flush>
      <div className="px-5 pt-5">
        <PanelHead
          title="Packages"
          hint={`Signed in as ${ROLES[role].label}. Actions you cannot take are shown locked.`}
        />
        {err && (
          <p className="mt-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-[0.8125rem] text-rose-700">
            {err}
          </p>
        )}
      </div>

      <ul className="mt-4 divide-y divide-slate-100">
        {candidates.map((c) => {
          const stage = stageOf(c.id);
          const meta = NOTICE_META[stage];
          const record = flows?.[c.id] ?? null;
          const needed = NEEDS[stage];
          const allowed = needed ? can(needed) : false;
          const blocked = !c.verified && stage === "not_started";

          return (
            <li key={c.id} className="px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/app/locations/${c.id}`}
                      className="text-[0.9375rem] font-semibold text-indigo-800 hover:underline"
                    >
                      {c.center}
                    </Link>
                    <Pill tone={STAGE_TONE[stage]} dot>
                      {meta.label}
                    </Pill>
                    {!c.verified && <Pill tone="muted">Unverified</Pill>}
                  </div>
                  <p className="mt-1 text-[0.8125rem] text-slate-500">
                    {c.id} · {c.city} · {c.failing} · {c.monthly}
                  </p>
                  <p className="mt-1 text-[0.8125rem] text-slate-700">
                    {meta.blurb}
                  </p>
                  {record?.served_on && (
                    <p className="mt-1 text-[0.75rem] font-medium text-emerald-700">
                      Served {prettyDate(record.served_on.slice(0, 10))}
                      {record.updated_by ? ` by ${record.updated_by}` : ""}
                    </p>
                  )}
                  {record?.reason && (
                    <p className="mt-1 text-[0.75rem] text-slate-500">
                      Reason: {record.reason}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {/* the package itself, timestamped at download */}
                  <a
                    href={`/app/api/notice-package?location=${c.id}`}
                    className="text-[0.75rem] font-semibold whitespace-nowrap text-indigo-700 hover:underline"
                  >
                    Download package
                  </a>
                  {stage === "served" || stage === "declined" ? (
                    <ActionButton
                      variant="quiet"
                      onClick={() => setNotice(c.id, "not_started")}
                    >
                      Reopen
                    </ActionButton>
                  ) : (
                    <>
                      {blocked ? (
                        /* The block IS the ask: a notice cannot rest on
                           secondary sources, so the button files the
                           field visit that fixes it. */
                        <RequestVerification
                          locationId={c.id}
                          centerName={c.center}
                          compact
                        />
                      ) : meta.next ? (
                        <ActionButton
                          variant={stage === "approved" ? "brass" : "primary"}
                          disabled={!allowed}
                          title={
                            allowed
                              ? undefined
                              : `Requires ${ROLES[role].label === "Legal" ? "a signatory" : "another role"}`
                          }
                          onClick={() => setNotice(c.id, meta.next!)}
                        >
                          {!allowed && <Lock className="h-3.5 w-3.5" />}
                          {meta.nextLabel}
                        </ActionButton>
                      ) : null}
                      <ActionButton
                        variant="quiet"
                        onClick={() => {
                          setDeclining(c.id);
                          setReason("");
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </ActionButton>
                    </>
                  )}
                </div>
              </div>

              {/* stage rail */}
              <ol className="mt-3 flex w-full max-w-xs items-center gap-1.5">
                {(
                  [
                    "not_started",
                    "assembled",
                    "counsel_review",
                    "approved",
                    "served",
                  ] as NoticeStage[]
                ).map((s, i, arr) => {
                  const idx = arr.indexOf(stage);
                  const done = idx >= 0 && i <= idx;
                  return (
                    <li key={s} className="flex-1">
                      <span
                        className={cn(
                          "block h-1.5 w-full rounded-full transition-colors",
                          done ? "bg-indigo-600" : "bg-slate-100",
                        )}
                        title={NOTICE_META[s].label}
                      />
                    </li>
                  );
                })}
                <li className="ml-2 shrink-0 whitespace-nowrap text-[0.6875rem] font-medium text-slate-400">
                  {NOTICE_META[stage].label}
                </li>
              </ol>

              {stage === "served" && (
                <ResponseTracker
                  locationRef={c.id}
                  servedOn={record?.served_on?.slice(0, 10) ?? null}
                  current={tracked[c.id] ?? null}
                  onSaved={(v) => setTracked((p) => ({ ...p, [c.id]: v }))}
                />
              )}

              <AnimatePresence>
                {declining === c.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 p-3">
                      <input
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Why are you not pursuing this?"
                        className="min-w-[220px] flex-1 rounded-xl border border-slate-200 bg-white shadow-sm px-3 py-2 text-[0.8125rem] focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 focus:outline-none"
                      />
                      <ActionButton
                        onClick={() => {
                          setNotice(c.id, "declined", reason || "No reason given");
                          setDeclining(null);
                        }}
                      >
                        Close it
                      </ActionButton>
                      <ActionButton
                        variant="quiet"
                        onClick={() => setDeclining(null)}
                      >
                        Cancel
                      </ActionButton>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>

      <p className="border-t border-slate-200 px-5 py-3 text-[0.75rem] leading-relaxed text-slate-500">
        Recording a package as served does not send anything. It records that
        your signatory served it, so the date the co-tenancy rent runs from is
        on file with the evidence behind it.
      </p>
    </Panel>
  );
}

/* ------------------------------------------------------------------
   after service: what the landlord did about it
   ------------------------------------------------------------------ */

const RESPONSE_STAGES = [
  { id: "served", label: "No response yet", tone: "muted" as Tone },
  { id: "acknowledged", label: "Acknowledged", tone: "petrol" as Tone },
  { id: "disputed", label: "Disputed", tone: "clay" as Tone },
  { id: "cured", label: "Cured", tone: "open" as Tone },
  { id: "resolved", label: "Resolved", tone: "open" as Tone },
];

function ResponseTracker({
  locationRef,
  servedOn,
  current,
  onSaved,
}: {
  locationRef: string;
  servedOn: string | null;
  current: { stage: string; response: string | null } | null;
  onSaved: (v: { stage: string; response: string | null }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [stage, setStage] = useState(current?.stage ?? "served");
  const [response, setResponse] = useState(current?.response ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStage(current?.stage ?? "served");
    setResponse(current?.response ?? "");
  }, [current]);

  const meta =
    RESPONSE_STAGES.find((s) => s.id === (current?.stage ?? "served")) ??
    RESPONSE_STAGES[0];

  const save = async () => {
    setSaving(true);
    const res = await fetch("/app/api/notice-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locationRef,
        stage,
        servedOn: servedOn ?? undefined,
        response: response.trim() || undefined,
      }),
    });
    setSaving(false);
    if (res.ok) {
      onSaved({ stage, response: response.trim() || null });
      setEditing(false);
    }
  };

  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <span className="text-[0.75rem] font-semibold text-slate-700">
            Landlord response
          </span>
          <Pill tone={meta.tone} dot>
            {meta.label}
          </Pill>
        </span>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-[0.75rem] font-semibold text-indigo-600 hover:text-indigo-800"
          >
            {current ? "Update" : "Record it"}
          </button>
        )}
      </div>
      {current?.response && !editing && (
        <p className="mt-1.5 text-[0.75rem] leading-snug text-slate-600">
          {current.response}
        </p>
      )}
      {editing && (
        <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-wrap gap-1.5">
            {RESPONSE_STAGES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStage(s.id)}
                className={cn(
                  "rounded-lg border px-2.5 py-1.5 text-[0.75rem] font-semibold transition-all",
                  stage === s.id
                    ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 bg-white text-slate-500 hover:text-slate-800",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            rows={2}
            placeholder="What the landlord said, and any documents received."
            className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-[0.8125rem] text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
          />
          <div className="flex items-center gap-2">
            <ActionButton disabled={saving} onClick={() => void save()}>
              {saving ? "Saving" : "Save"}
            </ActionButton>
            <ActionButton variant="quiet" onClick={() => setEditing(false)}>
              Cancel
            </ActionButton>
          </div>
        </div>
      )}
    </div>
  );
}
