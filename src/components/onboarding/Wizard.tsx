"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/cn";
import {
  FIELDS,
  type FieldKey,
  type IngestRow,
  applyMapping,
  autoMap,
  parseDelimited,
  sampleCsv,
} from "@/lib/ingest";
import { ActionButton, Note, Panel, Pill } from "@/components/app/ui";
import { useWorkspace } from "@/lib/workspace-store";

/* ============================================================
   ONBOARDING

   A retailer with eight hundred doors cannot be onboarded with a
   form. This is a pipeline: take whatever they already have, map it,
   resolve it, read the leases, and put only the genuinely ambiguous
   items in front of a human.

   The whole flow is designed so a prospect can watch their own
   portfolio load before they have signed anything.
   ============================================================ */

const STEPS = [
  { id: "scale", label: "Your footprint", blurb: "How much we are watching" },
  { id: "company", label: "Company", blurb: "Who we are working for" },
  { id: "locations", label: "Locations", blurb: "The doors, mapped and resolved" },
  { id: "leases", label: "Leases", blurb: "Documents in, clauses out" },
  { id: "sales", label: "Sales", blurb: "What makes the money real" },
  { id: "watch", label: "Watch plan", blurb: "Cadence and evidence standard" },
  { id: "authority", label: "Authority", blurb: "Who can act on a finding" },
  { id: "launch", label: "Launch", blurb: "First answers inside 48 hours" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

type State = {
  scale: "small" | "mid" | "large" | null;
  company: string;
  legalName: string;
  contactName: string;
  contactEmail: string;
  raw: string;
  headers: string[];
  parsed: Record<string, string>[];
  mapping: Record<string, FieldKey>;
  leaseCount: number;
  leasesRead: boolean;
  salesMode: "monthly" | "annual" | "skip" | null;
  cadence: "weekly" | "biweekly" | "monthly";
  fieldVisits: boolean;
  priorityOnly: boolean;
  signatory: string;
  counselName: string;
  counselEmail: string;
  autoAssemble: boolean;
};

const initial: State = {
  scale: null,
  company: "",
  legalName: "",
  contactName: "",
  contactEmail: "",
  raw: "",
  headers: [],
  parsed: [],
  mapping: {},
  leaseCount: 0,
  leasesRead: false,
  salesMode: null,
  cadence: "weekly",
  fieldVisits: true,
  priorityOnly: false,
  signatory: "",
  counselName: "",
  counselEmail: "",
  autoAssemble: true,
};

export function Wizard() {
  const [stepIndex, setStepIndex] = useState(0);
  const [s, setS] = useState<State>(initial);
  const set = <K extends keyof State>(k: K, v: State[K]) =>
    setS((prev) => ({ ...prev, [k]: v }));

  const step = STEPS[stepIndex];

  const ingested: IngestRow[] = useMemo(
    () => (s.parsed.length ? applyMapping(s.parsed, s.mapping) : []),
    [s.parsed, s.mapping],
  );

  const stats = useMemo(() => {
    const matched = ingested.filter((r) => r.resolution === "matched").length;
    const review = ingested.filter((r) => r.resolution === "review").length;
    const unmatched = ingested.filter((r) => r.resolution === "unmatched").length;
    const problems = ingested.filter((r) => r.issues.length > 0).length;
    return { matched, review, unmatched, problems, total: ingested.length };
  }, [ingested]);

  const canContinue = (() => {
    switch (step.id) {
      case "scale":
        return s.scale !== null;
      case "company":
        return s.company.trim().length > 1 && s.contactEmail.includes("@");
      case "locations":
        return stats.total > 0 && stats.matched + stats.review > 0;
      case "leases":
        return s.leasesRead;
      case "sales":
        return s.salesMode !== null;
      case "watch":
        return true;
      case "authority":
        return s.signatory.trim().length > 1;
      default:
        return true;
    }
  })();

  const next = () => setStepIndex((i) => Math.min(STEPS.length - 1, i + 1));
  const back = () => setStepIndex((i) => Math.max(0, i - 1));

  const pct = ((stepIndex + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-surface-sunk/40">
      {/* ---- chrome ---- */}
      <header className="sticky top-0 z-30 border-b border-line bg-canvas">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-6 px-5 sm:px-8">
          <Link href="/" className="text-ink" aria-label="Breakpoint">
            <Logo />
          </Link>
          <p className="hidden text-[0.8125rem] text-muted sm:block">
            Account setup
          </p>
          <div className="ml-auto flex items-center gap-4">
            <p className="tnum hidden text-[0.8125rem] text-muted sm:block">
              Step {stepIndex + 1} of {STEPS.length}
            </p>
            <Link
              href="/app"
              className="text-[0.8125rem] font-medium text-muted hover:text-petrol-700"
            >
              Save and exit
            </Link>
          </div>
        </div>
        <div className="h-0.5 w-full bg-surface-sunk">
          <motion.div
            className="h-full bg-brass-500"
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </header>

      <div className="mx-auto grid max-w-[1280px] gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[248px_minmax(0,1fr)] lg:gap-12 lg:py-12">
        {/* ---- rail ---- */}
        <aside className="hidden lg:block">
          <ol className="sticky top-28 space-y-1">
            {STEPS.map((st, i) => {
              const done = i < stepIndex;
              const active = i === stepIndex;
              return (
                <li key={st.id}>
                  <button
                    type="button"
                    onClick={() => i <= stepIndex && setStepIndex(i)}
                    disabled={i > stepIndex}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-250",
                      active
                        ? "bg-petrol-50"
                        : done
                          ? "hover:bg-surface-sunk"
                          : "opacity-45",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[0.625rem] font-bold",
                        done
                          ? "bg-open-600 text-white"
                          : active
                            ? "bg-petrol-800 text-cream"
                            : "bg-surface-sunk text-muted",
                      )}
                    >
                      {done ? "✓" : i + 1}
                    </span>
                    <span className="min-w-0">
                      <span
                        className={cn(
                          "block text-[0.875rem] font-semibold",
                          active ? "text-petrol-800" : "text-ink",
                        )}
                      >
                        {st.label}
                      </span>
                      <span className="block text-[0.75rem] leading-snug text-muted">
                        {st.blurb}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>

        {/* ---- body ---- */}
        <div className="min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
            >
              {step.id === "scale" && <ScaleStep s={s} set={set} />}
              {step.id === "company" && <CompanyStep s={s} set={set} />}
              {step.id === "locations" && (
                <LocationsStep s={s} set={set} setS={setS} ingested={ingested} stats={stats} />
              )}
              {step.id === "leases" && (
                <LeasesStep s={s} set={set} locationCount={stats.total} />
              )}
              {step.id === "sales" && <SalesStep s={s} set={set} />}
              {step.id === "watch" && <WatchStep s={s} set={set} />}
              {step.id === "authority" && <AuthorityStep s={s} set={set} />}
              {step.id === "launch" && (
                <LaunchStep s={s} stats={stats} ingested={ingested} />
              )}
            </motion.div>
          </AnimatePresence>

          {/* ---- footer ---- */}
          {step.id !== "launch" && (
            <div className="mt-8 flex items-center justify-between gap-4 border-t border-line pt-6">
              <button
                type="button"
                onClick={back}
                disabled={stepIndex === 0}
                className="text-[0.875rem] font-medium text-muted transition-colors hover:text-ink disabled:opacity-30"
              >
                Back
              </button>
              <div className="flex items-center gap-3">
                {!canContinue && (
                  <span className="hidden text-[0.75rem] text-muted sm:block">
                    {hintFor(step.id)}
                  </span>
                )}
                <ActionButton onClick={next} disabled={!canContinue}>
                  Continue
                </ActionButton>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function hintFor(id: StepId) {
  switch (id) {
    case "scale":
      return "Pick the range that fits.";
    case "company":
      return "Company name and a contact email.";
    case "locations":
      return "Load a portfolio to continue.";
    case "leases":
      return "Run the read, or skip the sample.";
    case "sales":
      return "Choose how sales reach us, or skip it.";
    case "authority":
      return "Name someone who can authorise a notice.";
    default:
      return "";
  }
}

/* ------------------------------------------------------------------
   shared bits
   ------------------------------------------------------------------ */

function Head({
  step,
  title,
  lede,
}: {
  step: string;
  title: string;
  lede: React.ReactNode;
}) {
  return (
    <div className="max-w-2xl">
      <p className="label text-petrol-600">{step}</p>
      <h1 className="mt-2.5 text-[clamp(1.75rem,3.4vw,2.5rem)]">{title}</h1>
      <p className="lede no-orphan mt-3 text-ink-soft">{lede}</p>
    </div>
  );
}

function Choice({
  active,
  title,
  blurb,
  onClick,
}: {
  active: boolean;
  title: string;
  blurb: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-2xl border p-5 text-left transition-all duration-250",
        active
          ? "border-petrol-600 bg-petrol-50 ring-1 ring-petrol-600"
          : "border-line bg-surface hover:border-petrol-300 hover:bg-petrol-50/40",
      )}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "grid h-4 w-4 place-items-center rounded-full border-2 transition-colors",
            active ? "border-petrol-600" : "border-line",
          )}
        >
          {active && <span className="h-1.5 w-1.5 rounded-full bg-petrol-600" />}
        </span>
        <span className="text-[0.9375rem] font-semibold text-ink">{title}</span>
      </div>
      <p className="no-orphan mt-2 pl-6.5 text-[0.8125rem] leading-relaxed text-muted">
        {blurb}
      </p>
    </button>
  );
}

function Field({
  label,
  hint,
  ...rest
}: { label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-[0.8125rem] font-medium text-ink">{label}</span>
      <input
        {...rest}
        className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-[0.875rem] text-ink placeholder:text-faint focus:border-petrol-500 focus:outline-none"
      />
      {hint && <span className="mt-1.5 block text-[0.75rem] text-muted">{hint}</span>}
    </label>
  );
}

function Toggle({
  on,
  onChange,
  title,
  blurb,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  title: string;
  blurb: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className="flex w-full items-start gap-4 rounded-2xl border border-line bg-surface p-5 text-left transition-colors duration-250 hover:border-petrol-300"
    >
      <span
        className={cn(
          "mt-0.5 flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors duration-300",
          on ? "bg-petrol-600" : "bg-surface-sunk",
        )}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 500, damping: 34 }}
          className={cn(
            "h-5 w-5 rounded-full bg-white shadow-sm",
            on ? "ml-auto" : "",
          )}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-[0.9375rem] font-semibold text-ink">
          {title}
        </span>
        <span className="no-orphan mt-1 block text-[0.8125rem] leading-relaxed text-muted">
          {blurb}
        </span>
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------
   1. scale
   ------------------------------------------------------------------ */

function ScaleStep({
  s,
  set,
}: {
  s: State;
  set: <K extends keyof State>(k: K, v: State[K]) => void;
}) {
  return (
    <div>
      <Head
        step="Step one"
        title="How much are we watching?"
        lede="This only shapes how we load your data. The monitoring is identical whether you have one store or eight hundred, because the clause does not care how big you are."
      />

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <Choice
          active={s.scale === "small"}
          onClick={() => set("scale", "small")}
          title="1 to 10 doors"
          blurb="We will walk each location in one at a time. Nothing to upload."
        />
        <Choice
          active={s.scale === "mid"}
          onClick={() => set("scale", "mid")}
          title="11 to 100 doors"
          blurb="Send a spreadsheet. We map the columns and resolve the centers."
        />
        <Choice
          active={s.scale === "large"}
          onClick={() => set("scale", "large")}
          title="100 or more"
          blurb="Bulk pipeline: full portfolio ingest, document sweep, triage queue."
        />
      </div>

      <Note tone="petrol" title="What happens next">
        We take whatever you already have. A rent roll export, a lease
        administration extract, a spreadsheet somebody maintains by hand. We do
        not ask you to re-key anything, and we do not need your systems to talk
        to ours.
      </Note>
    </div>
  );
}

/* ------------------------------------------------------------------
   2. company
   ------------------------------------------------------------------ */

function CompanyStep({
  s,
  set,
}: {
  s: State;
  set: <K extends keyof State>(k: K, v: State[K]) => void;
}) {
  return (
    <div>
      <Head
        step="Step two"
        title="Who are we working for?"
        lede="The legal entity matters here. Co-tenancy rights are frequently personal to the originally named tenant, so the entity on the lease is the entity that can claim."
      />

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <Field
          label="Trade name"
          placeholder="Marlowe & Finch"
          value={s.company}
          onChange={(e) => set("company", e.target.value)}
        />
        <Field
          label="Legal entity on the leases"
          hint="If leases sit under several entities, list the primary one. We will map the rest during document intake."
          placeholder="Marlowe & Finch Retail Holdings, LLC"
          value={s.legalName}
          onChange={(e) => set("legalName", e.target.value)}
        />
        <Field
          label="Primary contact"
          placeholder="Full name"
          value={s.contactName}
          onChange={(e) => set("contactName", e.target.value)}
        />
        <Field
          label="Work email"
          type="email"
          placeholder="name@company.com"
          value={s.contactEmail}
          onChange={(e) => set("contactEmail", e.target.value)}
        />
      </div>

      <Note tone="muted" title="On assignments and subleases">
        If any of these locations were taken by assignment, flag them at
        document intake. A right that is personal to the original tenant does
        not travel with the lease, and that single fact voids more co-tenancy
        claims than any other.
      </Note>
    </div>
  );
}

/* ------------------------------------------------------------------
   3. locations
   ------------------------------------------------------------------ */

function LocationsStep({
  s,
  set,
  setS,
  ingested,
  stats,
}: {
  s: State;
  set: <K extends keyof State>(k: K, v: State[K]) => void;
  setS: React.Dispatch<React.SetStateAction<State>>;
  ingested: IngestRow[];
  stats: { matched: number; review: number; unmatched: number; problems: number; total: number };
}) {
  const [phase, setPhase] = useState<"input" | "map" | "resolve">(
    s.parsed.length ? "resolve" : "input",
  );

  const load = (text: string) => {
    const { headers, rows } = parseDelimited(text);
    setS((prev) => ({
      ...prev,
      raw: text,
      headers,
      parsed: rows,
      mapping: autoMap(headers),
    }));
    setPhase("map");
  };

  const autoMapped = Object.values(s.mapping).filter((v) => v !== "ignore").length;

  return (
    <div>
      <Head
        step="Step three"
        title="Load the portfolio"
        lede="Paste or drop whatever export you already have. We detect the delimiter, guess the columns, and tell you exactly what we could not resolve rather than guessing quietly."
      />

      {/* ---- phase: input ---- */}
      {phase === "input" && (
        <div className="mt-8 space-y-4">
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-[0.9375rem] font-semibold text-ink">
                  Paste your export
                </h2>
                <p className="mt-1 text-[0.8125rem] text-muted">
                  CSV, TSV, or straight out of a spreadsheet. Headers in the
                  first row.
                </p>
              </div>
              <ActionButton
                variant="secondary"
                onClick={() => load(sampleCsv(248))}
              >
                Load a sample portfolio
              </ActionButton>
            </div>

            <textarea
              value={s.raw}
              onChange={(e) => set("raw", e.target.value)}
              onBlur={() => s.raw.trim() && load(s.raw)}
              rows={9}
              spellCheck={false}
              placeholder={"Site #,Street Address,City,ST,Zip,Property Name,Rentable SF\n4103,1200 Market St,Dublin,OH,43017,Fairmount Collection,3850"}
              className="mt-4 w-full rounded-xl border border-line bg-surface-sunk p-4 font-mono text-[0.75rem] leading-relaxed text-ink placeholder:text-faint focus:border-petrol-500 focus:outline-none"
            />

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <ActionButton
                onClick={() => s.raw.trim() && load(s.raw)}
                disabled={!s.raw.trim()}
              >
                Read the file
              </ActionButton>
              <p className="text-[0.75rem] text-muted">
                Nothing leaves your browser at this step.
              </p>
            </div>
          </Panel>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Rent roll export", "Straight from Yardi, MRI or a property manager."],
              ["Lease admin extract", "Visual Lease, Tango, CoStar, Lucernex, TRIRIGA."],
              ["A spreadsheet somebody maintains", "The one with merged cells. That is fine."],
            ].map(([t, b]) => (
              <div key={t} className="rounded-xl border border-line bg-surface p-4">
                <p className="text-[0.8125rem] font-semibold text-ink">{t}</p>
                <p className="mt-1 text-[0.75rem] leading-relaxed text-muted">{b}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---- phase: map ---- */}
      {phase === "map" && (
        <div className="mt-8 space-y-4">
          <Note tone="open" title={`${s.parsed.length} rows read`}>
            We matched {autoMapped} of {s.headers.length} columns automatically.
            Check the ones below, change anything we got wrong, and ignore what
            you do not need.
          </Note>

          <Panel flush>
            <div className="border-b border-line px-5 py-4">
              <h2 className="text-[0.9375rem] font-semibold text-ink">
                Column mapping
              </h2>
              <p className="mt-1 text-[0.8125rem] text-muted">
                Your header on the left, our field on the right.
              </p>
            </div>
            <ul className="divide-y divide-line">
              {s.headers.map((h) => {
                const value = s.mapping[h] ?? "ignore";
                const sample = s.parsed[0]?.[h] ?? "";
                const field = FIELDS.find((f) => f.key === value);
                return (
                  <li
                    key={h}
                    className="flex flex-wrap items-center gap-3 px-5 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[0.8125rem] font-medium text-ink">
                        {h}
                      </p>
                      <p className="truncate text-[0.75rem] text-muted">
                        {sample || "empty"}
                      </p>
                    </div>
                    <span className="text-faint">to</span>
                    <select
                      value={value}
                      onChange={(e) =>
                        setS((prev) => ({
                          ...prev,
                          mapping: { ...prev.mapping, [h]: e.target.value as FieldKey },
                        }))
                      }
                      className={cn(
                        "min-w-[180px] rounded-lg border px-3 py-2 text-[0.8125rem] font-medium focus:outline-none",
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
                    {field?.required && (
                      <Pill tone="petrol">Required</Pill>
                    )}
                  </li>
                );
              })}
            </ul>
          </Panel>

          <div className="flex gap-3">
            <ActionButton onClick={() => setPhase("resolve")}>
              Resolve centers
            </ActionButton>
            <ActionButton variant="quiet" onClick={() => setPhase("input")}>
              Start over
            </ActionButton>
          </div>
        </div>
      )}

      {/* ---- phase: resolve ---- */}
      {phase === "resolve" && (
        <div className="mt-8 space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              ["Locations read", stats.total, "petrol"],
              ["Centers resolved", stats.matched, "open"],
              ["Need a look", stats.review, "watch"],
              ["Data issues", stats.problems, stats.problems ? "clay" : "muted"],
            ].map(([label, value, tone]) => (
              <div
                key={label as string}
                className="rounded-2xl border border-line bg-surface p-5"
              >
                <p className="label text-muted">{label as string}</p>
                <p
                  className={cn(
                    "tnum font-display mt-2 text-[1.75rem] leading-none",
                    tone === "open"
                      ? "text-open-700"
                      : tone === "watch"
                        ? "text-brass-600"
                        : tone === "clay"
                          ? "text-clay-600"
                          : "text-ink",
                  )}
                >
                  {value as number}
                </p>
              </div>
            ))}
          </div>

          <Note tone="petrol" title="Why this step exists">
            Matching a street address to the shopping center it sits inside is
            the step everyone underestimates. Get it wrong and you are watching
            the wrong rent roll. Anything we are not confident about goes into a
            queue rather than being guessed.
          </Note>

          <Panel flush>
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="text-[0.9375rem] font-semibold text-ink">
                Needs a look
              </h2>
              <Pill tone="watch">{stats.review + stats.problems} of {stats.total}</Pill>
            </div>
            <div className="max-h-[380px] overflow-y-auto">
              <table className="w-full border-collapse text-left">
                <thead className="sticky top-0 bg-surface-sunk">
                  <tr>
                    {["Store", "Address", "City", "Resolved center", "Flag"].map((h) => (
                      <th key={h} className="label px-4 py-2.5 font-semibold text-faint">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {ingested
                    .filter((r) => r.resolution !== "matched" || r.issues.length)
                    .slice(0, 40)
                    .map((r, i) => (
                      <tr key={`${r.storeNumber}-${i}`}>
                        <td className="px-4 py-2.5 text-[0.8125rem] font-medium text-ink">
                          {r.storeNumber || <span className="text-clay-600">missing</span>}
                        </td>
                        <td className="px-4 py-2.5 text-[0.8125rem] text-ink-soft">
                          {r.address || <span className="text-clay-600">missing</span>}
                        </td>
                        <td className="px-4 py-2.5 text-[0.8125rem] text-ink-soft">
                          {r.city}, {r.state}
                        </td>
                        <td className="px-4 py-2.5 text-[0.8125rem] text-muted">
                          {r.resolvedCenter || "Not resolved"}
                        </td>
                        <td className="px-4 py-2.5">
                          <Pill tone={r.issues.length ? "clay" : "watch"}>
                            {r.issues[0] ?? "Confirm center"}
                          </Pill>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-line px-5 py-3.5">
              <p className="text-[0.75rem] text-muted">
                These do not block onboarding. Our team clears this queue during
                the first 48 hours and comes back to you only for the rows we
                genuinely cannot settle.
              </p>
            </div>
          </Panel>

          <ActionButton variant="quiet" onClick={() => setPhase("map")}>
            Back to column mapping
          </ActionButton>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------
   4. leases
   ------------------------------------------------------------------ */

function LeasesStep({
  s,
  set,
  locationCount,
}: {
  s: State;
  set: <K extends keyof State>(k: K, v: State[K]) => void;
  locationCount: number;
}) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const timer = useRef<number | null>(null);

  /*
   * Calibrated against the real gold set: 175 tenant folders across two
   * malls produced 106 clauses, and 124 of the 175 records needed a
   * human. Auto-acceptance is roughly three in ten, not eight in ten.
   * See docs/gold-set-findings.md. Overstating this is how a pilot
   * fails in month two.
   */
  const total = Math.max(locationCount, 1);
  const withClause = Math.round(total * 0.61);
  const autoAccepted = Math.round(withClause * 0.29);
  const needsReview = withClause - autoAccepted;
  const noClause = total - withClause;
  const noTextLayer = Math.round(total * 0.49);

  const run = () => {
    set("leaseCount", total);
    setRunning(true);
    setProgress(0);
    const started = performance.now();
    const duration = 2600;
    const tick = () => {
      const t = Math.min(1, (performance.now() - started) / duration);
      setProgress(t);
      if (t < 1) timer.current = requestAnimationFrame(tick);
      else {
        setRunning(false);
        set("leasesRead", true);
      }
    };
    timer.current = requestAnimationFrame(tick);
  };

  useEffect(() => () => {
    if (timer.current) cancelAnimationFrame(timer.current);
  }, []);

  const read = Math.round(progress * total);

  return (
    <div>
      <Head
        step="Step four"
        title="Send the lease files"
        lede="Drop the whole repository. Original leases, amendments, assignments, estoppels, side letters. We read the file chronologically, because an amendment from 2021 can waive a clause the original grants and reading only the original produces confident, wrong answers."
      />

      {!s.leasesRead && !running && (
        <div className="mt-8 space-y-4">
          <div className="rounded-2xl border-2 border-dashed border-line bg-surface p-10 text-center">
            <p className="font-display text-[1.25rem] text-ink">
              Drop lease documents here
            </p>
            <p className="mx-auto mt-2 max-w-md text-[0.8125rem] leading-relaxed text-muted">
              PDF, scanned or native. Any file naming. We match documents to
              locations on store number, address and premises description, and
              queue the ones that do not match.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
              <ActionButton onClick={run}>
                Simulate reading {total} lease files
              </ActionButton>
              <ActionButton variant="secondary" onClick={run}>
                Connect a document repository
              </ActionButton>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Chronological", "The amendment stack is processed in date order so supersession is respected."],
              ["Verbatim source", "Every extracted field carries the exact sentence it came from, with a section cite."],
              ["Confidence routed", "Anything below our review threshold goes to a person, not into your dashboard."],
            ].map(([t, b]) => (
              <div key={t} className="rounded-xl border border-line bg-surface p-4">
                <p className="text-[0.8125rem] font-semibold text-ink">{t}</p>
                <p className="mt-1 text-[0.75rem] leading-relaxed text-muted">{b}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {running && (
        <div className="mt-8">
          <Panel>
            <div className="flex items-baseline justify-between">
              <p className="text-[0.9375rem] font-semibold text-ink">
                Reading documents
              </p>
              <p className="tnum text-[0.875rem] text-muted">
                {read} of {total}
              </p>
            </div>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-surface-sunk">
              <div
                className="h-full rounded-full bg-petrol-600 transition-[width] duration-150"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <ul className="mt-5 space-y-2 text-[0.8125rem] text-muted">
              {[
                "Locating co-tenancy language and every cross reference to it",
                "Resolving defined terms against Article I and the exhibits",
                "Applying amendments in date order",
                "Extracting triggers, measurement definitions, cure and remedy",
                "Scoring confidence and routing the uncertain to review",
              ].map((line, i) => (
                <li
                  key={line}
                  className={cn(
                    "flex items-center gap-2.5 transition-opacity duration-300",
                    progress > i / 5 ? "opacity-100" : "opacity-30",
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      progress > (i + 1) / 5 ? "bg-open-600" : "bg-petrol-600",
                    )}
                  />
                  {line}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}

      {s.leasesRead && !running && (
        <div className="mt-8 space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              ["Documents read", total, "text-ink"],
              ["Co-tenancy found", withClause, "text-petrol-800"],
              ["Auto-accepted", autoAccepted, "text-open-700"],
              ["Queued for review", needsReview, "text-brass-600"],
            ].map(([l, v, c]) => (
              <div key={l as string} className="rounded-2xl border border-line bg-surface p-5">
                <p className="label text-muted">{l as string}</p>
                <p className={cn("tnum font-display mt-2 text-[1.75rem] leading-none", c as string)}>
                  {v as number}
                </p>
              </div>
            ))}
          </div>

          <Note tone="watch" title={`${noTextLayer} documents arrived as scanned images`}>
            Roughly half of a real lease repository has no text layer. Those
            are put through optical character recognition before extraction,
            which is why the read takes hours rather than minutes, and why we
            quote first answers in 48 hours rather than instantly.
          </Note>

          <Note tone="petrol" title={`${noClause} leases carry no co-tenancy language`}>
            That is a finding, not an error, and it is worth knowing. Those
            locations have no protection if the center empties out. We surface
            them as a renewal list so your team can ask for the clause the next
            time the lease is open.
          </Note>

          <Panel>
            <p className="text-[0.9375rem] font-semibold text-ink">
              Every extraction is auditable
            </p>
            <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-muted">
              Each field we pull points back at the sentence it came from, so a
              lease administrator can verify a record in under a minute instead
              of trusting it. Nothing enters monitoring on a confidence score
              alone.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-line bg-surface-sunk p-4">
                <p className="label text-muted">Source</p>
                <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-soft">
                  &#8220;...less than seventy percent (70%) of the Gross Leasable
                  Area of the Shopping Center, excluding Anchor Premises and all
                  Outparcels, is open and operating for business with the
                  public...&#8221;
                </p>
              </div>
              <div className="rounded-xl border border-petrol-100 bg-petrol-50 p-4">
                <p className="label text-petrol-700">Extracted</p>
                <dl className="mt-2 space-y-1.5 text-[0.8125rem]">
                  {[
                    ["Threshold", "70%"],
                    ["Measurement basis", "Open and operating"],
                    ["Denominator", "Inline GLA"],
                    ["Exclusions", "Anchor premises, outparcels"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4">
                      <dt className="text-muted">{k}</dt>
                      <dd className="font-medium text-ink">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------
   5. sales
   ------------------------------------------------------------------ */

function SalesStep({
  s,
  set,
}: {
  s: State;
  set: <K extends keyof State>(k: K, v: State[K]) => void;
}) {
  return (
    <div>
      <Head
        step="Step five"
        title="Sales, if you can share them"
        lede="Two reasons this matters. Alternative rent is usually a percentage of gross sales, so without sales we can tell you a clause failed but not what it is worth. And some clauses condition relief on proving the closure actually hurt."
      />

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <Choice
          active={s.salesMode === "monthly"}
          onClick={() => set("salesMode", "monthly")}
          title="Monthly, per store"
          blurb="The strongest option. Supports the money math and any sales-decline precondition."
        />
        <Choice
          active={s.salesMode === "annual"}
          onClick={() => set("salesMode", "annual")}
          title="Annual, per store"
          blurb="Enough to quantify relief. Weaker for clauses that need a period comparison."
        />
        <Choice
          active={s.salesMode === "skip"}
          onClick={() => set("salesMode", "skip")}
          title="Not right now"
          blurb="We still monitor and still flag. Values show as estimates from category benchmarks and are labelled as such."
        />
      </div>

      {s.salesMode === "skip" && (
        <Note tone="watch" title="What you give up">
          Without sales we cannot compute alternative rent, so findings arrive
          without a number attached. Any clause conditioned on a documented
          sales decline stays theoretical until the data exists. You can turn
          this on later and we will backfill.
        </Note>
      )}

      {s.salesMode && s.salesMode !== "skip" && (
        <Note tone="open" title="How it reaches us">
          Monthly file drop to a private location, or a scheduled export from
          your POS or finance system. Sales figures are used only to quantify
          your own relief. They are never pooled, benchmarked across customers,
          or shared with any owner.
        </Note>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------
   6. watch plan
   ------------------------------------------------------------------ */

function WatchStep({
  s,
  set,
}: {
  s: State;
  set: <K extends keyof State>(k: K, v: State[K]) => void;
}) {
  return (
    <div>
      <Head
        step="Step six"
        title="Set the watch"
        lede="How often we sweep, and how hard we work to prove what we find. The second setting matters more than the first."
      />

      <div className="mt-8 space-y-4">
        <div>
          <p className="text-[0.8125rem] font-medium text-ink">Sweep cadence</p>
          <div className="mt-2.5 grid gap-3 sm:grid-cols-3">
            {(
              [
                ["weekly", "Weekly", "Every center, every week. The default."],
                ["biweekly", "Every two weeks", "Lower touch for stable portfolios."],
                ["monthly", "Monthly", "Minimum viable. Not recommended where relief runs from notice."],
              ] as const
            ).map(([id, title, blurb]) => (
              <Choice
                key={id}
                active={s.cadence === id}
                onClick={() => set("cadence", id)}
                title={title}
                blurb={blurb}
              />
            ))}
          </div>
        </div>

        <Toggle
          on={s.fieldVisits}
          onChange={(v) => set("fieldVisits", v)}
          title="Escalate to a field visit before any notice"
          blurb="A map listing is a signal. A dated photograph of a papered storefront is evidence. With this on, nothing reaches a notice package on secondary sources alone, and we send someone when a finding matters."
        />

        <Toggle
          on={s.priorityOnly}
          onChange={(v) => set("priorityOnly", v)}
          title="Prioritise centers with live exposure"
          blurb="Sweep every center on cadence, and increase frequency where a test is inside three points of its threshold or a cure clock is running."
        />
      </div>

      <Note tone="petrol" title="The evidence ladder">
        One secondary source is a signal and stays out of your dashboard alerts.
        Two independent secondary sources corroborate and open a verification
        task. A primary source, a field visit, an operator announcement, a
        landlord statement, verifies, and only a verified finding can enter a
        notice package. You will see which tier every finding sits at.
      </Note>
    </div>
  );
}

/* ------------------------------------------------------------------
   7. authority
   ------------------------------------------------------------------ */

function AuthorityStep({
  s,
  set,
}: {
  s: State;
  set: <K extends keyof State>(k: K, v: State[K]) => void;
}) {
  return (
    <div>
      <Head
        step="Step seven"
        title="Who can act on a finding?"
        lede="Breakpoint assembles the file. Your authorised signatory serves it. Notice under a lease is a legal act, so it goes out over your name and your counsel's review, never ours."
      />

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <Field
          label="Authorised signatory"
          hint="The person whose name goes on a co-tenancy notice."
          placeholder="Full name and title"
          value={s.signatory}
          onChange={(e) => set("signatory", e.target.value)}
        />
        <Field
          label="Reviewing counsel"
          hint="Internal or outside. They receive the package before anything is served."
          placeholder="Name or firm"
          value={s.counselName}
          onChange={(e) => set("counselName", e.target.value)}
        />
        <Field
          label="Counsel email"
          type="email"
          placeholder="counsel@company.com"
          value={s.counselEmail}
          onChange={(e) => set("counselEmail", e.target.value)}
        />
      </div>

      <div className="mt-5">
        <Toggle
          on={s.autoAssemble}
          onChange={(v) => set("autoAssemble", v)}
          title="Assemble the package automatically when a finding is verified"
          blurb="The draft notice, the clause extract with its cite, the evidence chain with timestamps and sources, the occupancy computation with its denominator shown, and the money math. It waits for your signatory. Nothing is ever sent on your behalf."
        />
      </div>

      <Note tone="clay" title="Where we stop">
        We are not your lawyers and we do not practise law. We do not decide
        whether a right exists, we do not serve notices, and we do not
        negotiate with your landlord unless you separately instruct us in
        writing and your counsel is copied. What we do is make sure the
        decision reaches your desk while it is still worth making.
      </Note>
    </div>
  );
}

/* ------------------------------------------------------------------
   8. launch
   ------------------------------------------------------------------ */

function LaunchStep({
  s,
  stats,
  ingested,
}: {
  s: State;
  stats: { matched: number; review: number; total: number };
  ingested: IngestRow[];
}) {
  const [ready, setReady] = useState(false);
  const { importOnboarding } = useWorkspace();
  const imported = useRef(false);

  useEffect(() => {
    // The portfolio the client just loaded becomes the portfolio the
    // workspace runs on. Onboarding output is dashboard input.
    if (!imported.current && ingested.length) {
      imported.current = true;
      importOnboarding(ingested, s.company || "Your portfolio");
    }
    const t = setTimeout(() => setReady(true), 2200);
    return () => clearTimeout(t);
  }, [ingested, importOnboarding, s.company]);

  const lines = [
    `Provisioning workspace for ${s.company || "your portfolio"}`,
    `Indexing ${stats.total} locations across ${stats.matched} resolved centers`,
    `Building a watch list for every named tenant in your clauses`,
    `Scheduling ${s.cadence} sweeps`,
    `Opening a verification queue for ${stats.review} unresolved centers`,
  ];

  return (
    <div>
      <Head
        step="Step eight"
        title={ready ? "Your workspace is live" : "Setting up"}
        lede={
          ready
            ? "First evaluation runs tonight. Your team gets an answer on every location inside 48 hours, including the locations where the answer is that nothing is wrong."
            : "This takes a moment. Nothing here needs you."
        }
      />

      <div className="mt-8 space-y-4">
        <Panel>
          <ul className="space-y-3">
            {lines.map((line, i) => (
              <motion.li
                key={line}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.28, duration: 0.4 }}
                className="flex items-center gap-3 text-[0.875rem] text-ink-soft"
              >
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.28 + 0.15, type: "spring", stiffness: 400, damping: 22 }}
                  className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-open-600 text-[0.625rem] font-bold text-white"
                >
                  ✓
                </motion.span>
                {line}
              </motion.li>
            ))}
          </ul>
        </Panel>

        {ready && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative overflow-hidden rounded-2xl border border-line bg-petrol-900 p-7"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full"
              style={{ background: "radial-gradient(closest-side, rgba(217,154,43,0.32), transparent 72%)" }}
            />
            <div className="relative">
              <p className="label text-brass-400">Ready</p>
              <h2 className="mt-2.5 text-[1.75rem] text-cream">
                {stats.total} doors under watch.
              </h2>
              <p className="mt-2 max-w-lg text-[0.9375rem] leading-relaxed text-cream-soft">
                Open the workspace to see the portfolio as we see it: every
                clause, every center, every clock.
              </p>
              <Link
                href="/app"
                className="mt-6 inline-flex items-center rounded-lg bg-brass-500 px-6 py-3.5 text-[0.875rem] font-semibold whitespace-nowrap text-petrol-950 transition-colors duration-250 hover:bg-brass-400"
              >
                Open the workspace
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
