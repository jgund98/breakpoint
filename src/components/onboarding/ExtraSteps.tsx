"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { Note, Panel } from "@/components/app/ui";

/**
 * The three steps the intake checklist calls for and the wizard did not
 * have: where the data is coming from, what is already on the record
 * against a future claim, and which stores we start with.
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
   how the portfolio is coming
   ------------------------------------------------------------------ */

export type SourceMode = "lease_admin" | "spreadsheet" | "manual";

export function SourceStep({
  source,
  system,
  onSource,
  onSystem,
}: {
  source: SourceMode | null;
  system: string;
  onSource: (v: SourceMode) => void;
  onSystem: (v: string) => void;
}) {
  return (
    <div>
      <Note tone="petrol" title="Answer this one first">
        A structured export from the system you already run replaces months
        of reading documents. It is the single biggest difference between an
        onboarding that takes a week and one that takes a quarter, so it is
        worth a call to your lease administration team before anything else.
      </Note>

      <Choice
        value={source}
        onChange={onSource}
        options={[
          {
            id: "lease_admin",
            title: "Export from our lease administration system",
            tag: "Fastest",
            blurb:
              "Tango, Visual Lease, MRI, Yardi, Lucernex, CoStar or similar. Critical dates, base rent, floor area and clause flags in one file. Usually an afternoon of your team's time.",
          },
          {
            id: "spreadsheet",
            title: "A spreadsheet we maintain",
            blurb:
              "A rent roll or store list kept outside a system. Perfectly workable. We will tell you what is missing rather than guess at it.",
          },
          {
            id: "manual",
            title: "We will enter them by hand",
            blurb:
              "Sensible under about twenty stores. Above that it is slower than an export and more prone to transcription errors.",
          },
        ]}
      />

      {source === "lease_admin" && (
        <div className="mt-5">
          <label className="label text-muted">Which system</label>
          <input
            value={system}
            onChange={(e) => onSystem(e.target.value)}
            placeholder="Tango, Visual Lease, MRI, Yardi, Lucernex…"
            className="mt-2 w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-[0.875rem] text-ink placeholder:text-faint focus:border-petrol-500 focus:outline-none"
          />
          <p className="mt-2 text-[0.75rem] leading-relaxed text-muted">
            Knowing the system tells us the export format and which fields it
            names differently, so the mapping on the next step is mostly done
            before you upload anything.
          </p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------
   what is already on the record
   ------------------------------------------------------------------ */

export type RecordState = {
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
      <Note tone="clay" title="This section is about losing, not winning">
        Every item here can defeat an otherwise sound claim. We would rather
        know now than discover it after a notice has been served, and none of
        it blocks us from starting.
      </Note>

      <Panel flush className="mt-5">
        <ul className="divide-y divide-line">
          <HeldRow
            title="Estoppel certificates you have signed"
            why="What you certified, and when. An estoppel saying no landlord defaults exist is routinely used to defeat a later claim on a condition that predates it."
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
            why="Several clauses run the cure clock from your notice rather than from the condition. In the pilot portfolio one right arose in December and notice followed in June, and the gap was worth about ninety-nine thousand dollars."
            value={value.noticeLog}
            onChange={(v) => onChange({ noticeLog: v })}
          />
          <HeldRow
            title="Exhibits and site plans attached to your leases"
            why="A clause measuring a defined co-tenancy zone cannot be computed without the exhibit that draws it. These are attached to your own lease."
            value={value.exhibits}
            onChange={(v) => onChange({ exhibits: v })}
          />
          <HeldRow
            title="REAs or anchor operating covenants"
            why="Anchor obligations often sit outside the lease file, and some run in reverse: the anchor may go dark if center occupancy falls below a floor."
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
  const big = total > 60;
  return (
    <div>
      <Note tone={big ? "petrol" : "muted"}>
        {big
          ? `You are bringing ${total.toLocaleString("en-US")} stores. Across a recent twenty center sample, eleven never triggered in two years, so starting everywhere spends most of the effort where nothing will happen. Naming a first cohort gets answers in weeks instead of quarters.`
          : "At this size we can take the whole portfolio at once. Naming a priority cohort is still useful if you already know where the trouble is."}
      </Note>

      <Choice
        value={mode}
        onChange={onMode}
        options={[
          {
            id: "priority",
            title: "Start with the centers we are worried about",
            tag: big ? "Recommended" : undefined,
            blurb:
              "Stores in centers where an anchor has gone dark, is rumored to, or where you have already had the conversation with the landlord. We abstract those leases first and the rest follow.",
          },
          {
            id: "all",
            title: "Take the whole portfolio",
            blurb:
              "Everything abstracted in one pass. Slower to the first answer, and the right call when you have no particular suspicion.",
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
