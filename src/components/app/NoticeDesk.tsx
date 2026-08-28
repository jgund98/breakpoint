"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Lock, X } from "lucide-react";
import {
  NOTICE_META,
  type NoticeStage,
  useWorkspace,
} from "@/lib/workspace-store";
import { ROLES, type Permission } from "@/lib/team";
import { DEMO_USER } from "@/lib/session";
import { prettyDate } from "@/lib/clause";
import { cn } from "@/lib/cn";
import { ActionButton, Panel, PanelHead, Pill, type Tone } from "./ui";

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

export function NoticeDesk({ candidates }: { candidates: NoticeCandidate[] }) {
  const { state, setNotice, ready } = useWorkspace();
  const [declining, setDeclining] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const role = DEMO_USER.role;
  const can = (p: Permission) => ROLES[role].permissions.includes(p);

  const stageOf = (id: string): NoticeStage =>
    state.notices[id]?.stage ?? "not_started";

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
      </div>

      <ul className="mt-4 divide-y divide-slate-100">
        {candidates.map((c) => {
          const stage = stageOf(c.id);
          const meta = NOTICE_META[stage];
          const record = state.notices[c.id];
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
                  {record?.servedOn && (
                    <p className="mt-1 text-[0.75rem] font-medium text-emerald-700">
                      Served {prettyDate(record.servedOn)}
                    </p>
                  )}
                  {record?.reason && (
                    <p className="mt-1 text-[0.75rem] text-slate-500">
                      Reason: {record.reason}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
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
                        <span className="text-[0.75rem] text-slate-500">
                          Awaiting primary evidence
                        </span>
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
              <ol className="mt-3 flex flex-wrap items-center gap-1.5">
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
                    <li key={s} className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "h-1.5 w-8 rounded-full transition-colors",
                          done ? "bg-indigo-600" : "bg-slate-100",
                        )}
                        title={NOTICE_META[s].label}
                      />
                    </li>
                  );
                })}
                <li className="ml-1 text-[0.6875rem] text-slate-400">
                  {NOTICE_META[stage].label}
                </li>
              </ol>

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
