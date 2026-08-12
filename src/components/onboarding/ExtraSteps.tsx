"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { Note, Panel } from "@/components/app/ui";

/**
 * Two things the original intake checklist calls for and the first
 * wizard had nowhere to put: what is already on the record against a
 * future claim, and which stores we start with.
 *
 * Each exists because of something the pilot portfolio proved rather
 * than because a form felt incomplete.
 */

/* ------------------------------------------------------------------
   shared controls
   ------------------------------------------------------------------ */

export function Choice<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T | null;
  onChange: (v: T) => void;
  options: { id: T; title: string; blurb: string; tag?: string }[];
}) {
  return (
    <div className="mt-5 grid gap-3">
      {options.map((o) => {
        const on = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={cn(
              "flex items-start gap-3 rounded-xl border p-4 text-left transition-colors duration-200",
              on
                ? "border-petrol-500 bg-petrol-50"
                : "border-line bg-surface hover:border-petrol-300",
            )}
          >
            <span
              className={cn(
                "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border",
                on ? "border-petrol-600 bg-petrol-600 text-cream" : "border-line",
              )}
            >
              {on && <Check className="h-3 w-3" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-[0.9375rem] font-semibold text-ink">
                  {o.title}
                </span>
                {o.tag && (
                  <span className="rounded-md bg-brass-50 px-2 py-0.5 text-[0.6875rem] font-semibold text-brass-700 ring-1 ring-inset ring-brass-200">
                    {o.tag}
                  </span>
                )}
              </span>
              <span className="mt-1 block text-[0.8125rem] leading-relaxed text-muted">
                {o.blurb}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export type Held = "yes" | "no" | "unsure";

function HeldRow({
  title,
  why,
  value,
  onChange,
}: {
  title: string;
  why: string;
  value: Held | null;
  onChange: (v: Held) => void;
}) {
  return (
    <li className="flex flex-wrap items-start gap-4 px-5 py-4">
      <div className="min-w-0 flex-1">
        <p className="text-[0.875rem] font-medium text-ink">{title}</p>
        <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-muted">{why}</p>
      </div>
      <div className="flex shrink-0 gap-1.5">
        {(
          [
            ["yes", "We have it"],
            ["no", "We do not"],
            ["unsure", "Not sure"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-[0.75rem] font-semibold transition-colors duration-200",
              value === id
                ? "border-petrol-500 bg-petrol-50 text-petrol-800"
                : "border-line bg-surface text-muted hover:border-petrol-300",
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------
   what is already on the record
   ------------------------------------------------------------------ */

export type RecordState = {
  occupancyStatements: Held | null;
  estoppels: Held | null;
  defaults: Held | null;
  noticeLog: Held | null;
  exhibits: Held | null;
  reas: Held | null;
};

export function RecordStep({
  value,
  onChange,
}: {
  value: RecordState;
  onChange: (patch: Partial<RecordState>) => void;
}) {
  return (
    <div>
      <Panel flush>
        <ul className="divide-y divide-line">
          <HeldRow
            title="Occupancy statements or certified leasing plans"
            why="Anything a landlord has already issued to you. A certified statement is primary evidence and can verify a condition without us demanding one."
            value={value.occupancyStatements}
            onChange={(v) => onChange({ occupancyStatements: v })}
          />
          <HeldRow
            title="Estoppel certificates you have signed"
            why="What you certified, and when. An estoppel stating no landlord defaults exist can bar a later claim on a condition that predates it."
            value={value.estoppels}
            onChange={(v) => onChange({ estoppels: v })}
          />
          <HeldRow
            title="Open defaults or disputes with a landlord"
            why="Including CAM disputes and late payment notices. Not in default is a precondition in nearly every co-tenancy provision."
            value={value.defaults}
            onChange={(v) => onChange({ defaults: v })}
          />
          <HeldRow
            title="Landlord correspondence and notice log"
            why="Several clauses run relief from the date you gave notice rather than from the date the condition arose, so a notice already served changes what a store is owed today."
            value={value.noticeLog}
            onChange={(v) => onChange({ noticeLog: v })}
          />
          <HeldRow
            title="Exhibits and site plans attached to your leases"
            why="A clause measuring a defined co-tenancy zone needs the exhibit that draws it. Attached to your own lease."
            value={value.exhibits}
            onChange={(v) => onChange({ exhibits: v })}
          />
          <HeldRow
            title="REAs or anchor operating covenants"
            why="Anchor obligations often sit outside the lease file. Some run in reverse, letting the anchor go dark if center occupancy falls below a floor."
            value={value.reas}
            onChange={(v) => onChange({ reas: v })}
          />
        </ul>
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------
   where we start
   ------------------------------------------------------------------ */

export type TriageMode = "priority" | "all";

export function TriageStep({
  mode,
  note,
  total,
  onMode,
  onNote,
}: {
  mode: TriageMode | null;
  note: string;
  total: number;
  onMode: (v: TriageMode) => void;
  onNote: (v: string) => void;
}) {
  return (
    <div>
      <Choice
        value={mode}
        onChange={onMode}
        options={[
          {
            id: "priority",
            title: "Start with the centers we are worried about",
            blurb:
              "Stores in centers where an anchor has gone dark, is rumored to, or where you have already had the conversation with the landlord. We abstract those leases first and the rest follow.",
          },
          {
            id: "all",
            title: "Take the whole portfolio",
            blurb:
              "Every lease abstracted in one pass, in the order received.",
          },
        ]}
      />

      {mode === "priority" && (
        <div className="mt-5">
          <label className="label text-muted">
            Which centers, or which stores
          </label>
          <textarea
            value={note}
            onChange={(e) => onNote(e.target.value)}
            rows={4}
            placeholder={"Store numbers, center names, or just a description.\n4417, 4422\nAnything in a Centennial or Washington Prime center"}
            className="mt-2 w-full rounded-xl border border-line bg-surface-sunk p-3.5 text-[0.8125rem] leading-relaxed text-ink placeholder:text-faint focus:border-petrol-500 focus:outline-none"
          />
          <p className="mt-2 text-[0.75rem] text-muted">
            Rough is fine. We will confirm the list against the roster you
            uploaded and come back to you with it.
          </p>
        </div>
      )}
    </div>
  );
}
