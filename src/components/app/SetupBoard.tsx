"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Building2,
  CheckCircle2,
  FileText,
  Plus,
  ScanSearch,
  ShieldQuestion,
  Trash2,
} from "lucide-react";
import {
  SETUP_META,
  type ClientLocation,
  type SetupStage,
  useWorkspace,
} from "@/lib/workspace-store";
import { prettyDate } from "@/lib/clause";
import { cn } from "@/lib/cn";
import {
  ActionButton,
  LinkButton,
  Note,
  PageHead,
  Panel,
  PanelHead,
  Pill,
  type Tone,
} from "./ui";

/**
 * PORTFOLIO SETUP
 *
 * Where the rollout actually happens. A retailer does not arrive fully
 * monitored: locations land here, get their center confirmed, get a
 * lease attached, get abstracted, and only then go live.
 *
 * Everything on this page is the client's own data from onboarding,
 * plus anything they add themselves. Each row says plainly whose move
 * it is, ours or theirs, because the fastest way to stall a rollout is
 * for both sides to think they are waiting on the other.
 */

const STAGE_ICON: Record<SetupStage, React.ElementType> = {
  center_review: Building2,
  awaiting_lease: FileText,
  abstracting: ScanSearch,
  clause_review: ShieldQuestion,
  watched: CheckCircle2,
  no_clause: ShieldQuestion,
};

const STAGE_TONE: Record<SetupStage, Tone> = {
  center_review: "clay",
  awaiting_lease: "clay",
  abstracting: "petrol",
  clause_review: "watch",
  watched: "open",
  no_clause: "muted",
};

const ORDER: SetupStage[] = [
  "center_review",
  "awaiting_lease",
  "abstracting",
  "clause_review",
  "watched",
  "no_clause",
];

export function SetupBoard() {
  const { state, ready, addLocation, editLocation, removeLocation, setStage } =
    useWorkspace();
  const [filter, setFilter] = useState<SetupStage | "all" | "yours">("yours");
  const [adding, setAdding] = useState(false);

  const counts = useMemo(() => {
    const m = new Map<SetupStage, number>();
    for (const l of state.locations) m.set(l.stage, (m.get(l.stage) ?? 0) + 1);
    return m;
  }, [state.locations]);

  const yours = state.locations.filter(
    (l) => SETUP_META[l.stage].who === "you",
  );

  const visible = useMemo(() => {
    if (filter === "all") return state.locations;
    if (filter === "yours") return yours;
    return state.locations.filter((l) => l.stage === filter);
  }, [filter, state.locations, yours]);

  const total = state.locations.length;
  const live = counts.get("watched") ?? 0;
  const pct = total ? Math.round((live / total) * 100) : 0;

  if (!ready) {
    return (
      <div className="space-y-4">
        <div className="shimmer h-24 rounded-2xl" />
        <div className="shimmer h-64 rounded-2xl" />
      </div>
    );
  }

  /* ---- empty ---- */
  if (total === 0) {
    return (
      <div className="space-y-6">
        <PageHead
          eyebrow="Portfolio setup"
          title="No portfolio loaded yet"
          lede="Run onboarding to bring your locations in, or add a single store by hand. Both end up in the same pipeline."
        />
        <Panel className="text-center">
          <div className="mx-auto max-w-md py-10">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-700">
              <Building2 className="h-6 w-6" />
            </span>
            <h2 className="mt-5 text-[1.125rem] font-semibold text-slate-900">
              Bring your portfolio in
            </h2>
            <p className="no-orphan mt-2 text-[0.875rem] leading-relaxed text-slate-500">
              Send whatever export you already have. We map the columns, resolve
              each store to its shopping center, and tell you exactly what we
              could not settle.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2.5">
              <LinkButton href="/onboarding" variant="primary">
                Start onboarding
              </LinkButton>
              <ActionButton variant="secondary" onClick={() => setAdding(true)}>
                Add a single store
              </ActionButton>
            </div>
          </div>
        </Panel>
        <AddPanel
          open={adding}
          onClose={() => setAdding(false)}
          onSave={(l) => {
            addLocation(l);
            setAdding(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHead
        eyebrow="Portfolio setup"
        title={`${live} of ${total} locations live`}
        lede="Every location you sent us, and exactly what each one is waiting on. Rows marked as yours need something only you can provide."
        right={
          <>
            <ActionButton variant="secondary" onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4" />
              Add location
            </ActionButton>
            <LinkButton href="/onboarding" variant="primary">
              Import more
            </LinkButton>
          </>
        }
      />

      {/* progress */}
      <Panel className="card-enter d-1">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <p className="text-[0.9375rem] font-semibold text-slate-900">
            Rollout progress
          </p>
          <p className="tnum text-[0.875rem] text-slate-500">
            {pct}% monitoring
            {state.onboardedAt && ` · imported ${prettyDate(state.onboardedAt)}`}
          </p>
        </div>
        <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          {ORDER.map((stage) => {
            const n = counts.get(stage) ?? 0;
            if (!n) return null;
            const w = (n / total) * 100;
            const bg =
              stage === "watched"
                ? "bg-emerald-600"
                : stage === "clause_review"
                  ? "bg-amber-500"
                  : stage === "abstracting"
                    ? "bg-indigo-600"
                    : stage === "no_clause"
                      ? "bg-slate-400"
                      : "bg-rose-500";
            return (
              <div
                key={stage}
                className={cn("bar-fill h-full", bg)}
                style={{ width: `${w}%` }}
                title={`${SETUP_META[stage].label}: ${n}`}
              />
            );
          })}
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {ORDER.map((stage) => {
            const Icon = STAGE_ICON[stage];
            const n = counts.get(stage) ?? 0;
            return (
              <button
                key={stage}
                type="button"
                onClick={() => setFilter(stage)}
                className={cn(
                  "rounded-xl border p-3 text-left transition-colors duration-250",
                  filter === stage
                    ? "border-indigo-600 bg-indigo-50"
                    : "border-slate-200 bg-white hover:border-indigo-300",
                )}
              >
                <span className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-slate-500" />
                  <span className="tnum font-display text-[1.125rem] leading-none text-slate-900">
                    {n}
                  </span>
                </span>
                <span className="mt-1.5 block text-[0.75rem] leading-snug text-slate-500">
                  {SETUP_META[stage].label}
                </span>
              </button>
            );
          })}
        </div>
      </Panel>

      {yours.length > 0 && (
        <Note tone="clay" title={`${yours.length} waiting on you`}>
          These cannot move without you. Confirming a center takes a click.
          Uploading a lease starts abstraction the same day.
        </Note>
      )}

      {/* the queue */}
      <Panel flush className="card-enter d-2">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-5 py-3">
          {(
            [
              ["yours", `Waiting on you (${yours.length})`],
              ["all", `All locations (${total})`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={cn(
                "rounded-lg px-3 py-2 text-[0.8125rem] font-medium transition-colors duration-250",
                filter === id
                  ? "bg-indigo-50 text-indigo-800"
                  : "text-slate-500 hover:text-slate-900",
              )}
            >
              {label}
            </button>
          ))}
          {filter !== "yours" && filter !== "all" && (
            <span className="rounded-lg bg-indigo-50 px-3 py-2 text-[0.8125rem] font-medium text-indigo-800">
              {SETUP_META[filter].label}
            </span>
          )}
        </div>

        <div className="max-h-[560px] overflow-y-auto">
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-slate-100">
              <tr>
                {["Store", "Address", "Center", "Stage", "Owner", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.slice(0, 120).map((l) => (
                <SetupRow
                  key={l.id}
                  location={l}
                  onEdit={editLocation}
                  onRemove={removeLocation}
                  onAdvance={setStage}
                />
              ))}
            </tbody>
          </table>
        </div>

        {visible.length > 120 && (
          <p className="border-t border-slate-200 px-5 py-3 text-[0.75rem] text-slate-500">
            Showing the first 120 of {visible.length}. Filter to narrow.
          </p>
        )}
        {visible.length === 0 && (
          <p className="px-5 py-14 text-center text-[0.875rem] text-slate-500">
            Nothing in this stage. That is the good outcome.
          </p>
        )}
      </Panel>

      {/* audit */}
      {state.audit.length > 0 && (
        <Panel className="card-enter d-3">
          <PanelHead
            title="Change history"
            hint="Every edit is recorded. An evidence chain that supports a notice has to show who changed what, and when."
          />
          <ul className="mt-4 divide-y divide-slate-100">
            {state.audit.slice(0, 8).map((a) => (
              <li key={a.id} className="flex items-baseline gap-3 py-2.5">
                <span className="text-[0.8125rem] font-medium text-slate-900">
                  {a.action}
                </span>
                <span className="text-[0.8125rem] text-slate-500">{a.target}</span>
                {a.detail && (
                  <span className="truncate text-[0.75rem] text-slate-400">
                    {a.detail}
                  </span>
                )}
                <span className="tnum ml-auto shrink-0 text-[0.75rem] text-slate-400">
                  {a.actor}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <AddPanel
        open={adding}
        onClose={() => setAdding(false)}
        onSave={(l) => {
          addLocation(l);
          setAdding(false);
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------
   a row, editable in place
   ------------------------------------------------------------------ */

function SetupRow({
  location,
  onEdit,
  onRemove,
  onAdvance,
}: {
  location: ClientLocation;
  onEdit: (id: string, patch: Partial<ClientLocation>) => void;
  onRemove: (id: string) => void;
  onAdvance: (id: string, stage: SetupStage) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [center, setCenter] = useState(location.centerName);
  const meta = SETUP_META[location.stage];

  return (
    <tr className="align-top transition-colors hover:bg-indigo-50/40">
      <td className="px-4 py-3">
        <p className="text-[0.875rem] font-semibold text-slate-900">
          {location.storeNumber}
        </p>
        <p className="text-[0.75rem] text-slate-500">{location.id}</p>
      </td>
      <td className="px-4 py-3 text-[0.8125rem] text-slate-700">
        {location.address || <span className="text-rose-600">Missing</span>}
        <span className="block text-[0.75rem] text-slate-500">
          {location.city}
          {location.state && `, ${location.state}`}
        </span>
      </td>
      <td className="px-4 py-3">
        {editing ? (
          <div className="flex items-center gap-1.5">
            <input
              value={center}
              onChange={(e) => setCenter(e.target.value)}
              placeholder="Shopping center name"
              className="w-44 rounded-xl border border-indigo-300 bg-white shadow-sm px-2.5 py-1.5 text-[0.8125rem] focus:outline-none"
            />
            <ActionButton
              className="px-2.5 py-1.5"
              onClick={() => {
                onEdit(location.id, { centerName: center });
                if (location.stage === "center_review")
                  onAdvance(location.id, "awaiting_lease");
                setEditing(false);
              }}
            >
              Save
            </ActionButton>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-left text-[0.8125rem] text-slate-700 hover:text-indigo-700"
          >
            {location.centerName || (
              <span className="text-rose-600 underline decoration-dotted">
                Confirm center
              </span>
            )}
          </button>
        )}
      </td>
      <td className="px-4 py-3">
        <Pill tone={STAGE_TONE[location.stage]} dot>
          {meta.label}
        </Pill>
      </td>
      <td className="px-4 py-3">
        <span
          className={cn(
            "text-[0.75rem] font-semibold uppercase tracking-wider",
            meta.who === "you" ? "text-rose-600" : "text-slate-500",
          )}
        >
          {meta.who === "you" ? "You" : "Breakpoint"}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1.5">
          {location.stage === "awaiting_lease" && (
            <ActionButton
              variant="secondary"
              className="px-2.5 py-1.5"
              onClick={() => onAdvance(location.id, "abstracting")}
            >
              Upload lease
            </ActionButton>
          )}
          {location.stage === "center_review" && !editing && (
            <ActionButton
              variant="secondary"
              className="px-2.5 py-1.5"
              onClick={() => setEditing(true)}
            >
              Confirm
            </ActionButton>
          )}
          <button
            type="button"
            onClick={() => onRemove(location.id)}
            aria-label={`Remove ${location.storeNumber}`}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ------------------------------------------------------------------
   add a store
   ------------------------------------------------------------------ */

function AddPanel({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (l: Omit<ClientLocation, "id" | "addedAt" | "source">) => void;
}) {
  const [f, setF] = useState({
    storeNumber: "",
    address: "",
    city: "",
    state: "",
    centerName: "",
    gla: "",
    rentPsf: "",
  });

  const set = (k: keyof typeof f, v: string) =>
    setF((prev) => ({ ...prev, [k]: v }));

  const valid = f.storeNumber.trim() && f.city.trim() && f.state.trim();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex justify-end bg-petrol-950/35"
        >
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute inset-0"
          />
          <motion.div
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="relative h-full w-full max-w-md overflow-y-auto border-l border-slate-200 bg-white p-6"
          >
            <h2 className="text-[1.125rem] font-semibold text-slate-900">
              Add a location
            </h2>
            <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-slate-500">
              Enter what you know. We resolve the shopping center and start the
              lease request. Nothing else is required to get it into the queue.
            </p>

            <div className="mt-6 space-y-4">
              {(
                [
                  ["storeNumber", "Store number", "4412", true],
                  ["address", "Street address", "1200 Market St", false],
                  ["city", "City", "Dublin", true],
                  ["state", "State", "OH", true],
                  ["centerName", "Center name, if known", "Fairmount Collection", false],
                  ["gla", "Premises area, SF", "3850", false],
                  ["rentPsf", "Minimum rent, per SF", "92", false],
                ] as const
              ).map(([key, label, placeholder, required]) => (
                <label key={key} className="block">
                  <span className="text-[0.8125rem] font-medium text-slate-900">
                    {label}
                    {required && <span className="text-rose-500"> *</span>}
                  </span>
                  <input
                    value={f[key]}
                    onChange={(e) => set(key, e.target.value)}
                    placeholder={placeholder}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white shadow-sm px-3.5 py-2.5 text-[0.875rem] text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 focus:outline-none"
                  />
                </label>
              ))}
            </div>

            <div className="mt-7 flex gap-2.5">
              <ActionButton
                disabled={!valid}
                onClick={() =>
                  onSave({
                    storeNumber: f.storeNumber.trim(),
                    address: f.address.trim(),
                    city: f.city.trim(),
                    state: f.state.trim().toUpperCase(),
                    centerName: f.centerName.trim(),
                    gla: f.gla ? Number(f.gla) : null,
                    rentPsf: f.rentPsf ? Number(f.rentPsf) : null,
                    ttmSales: null,
                    stage: f.centerName.trim() ? "awaiting_lease" : "center_review",
                  })
                }
              >
                Add to portfolio
              </ActionButton>
              <ActionButton variant="quiet" onClick={onClose}>
                Cancel
              </ActionButton>
            </div>

            <p className="mt-5 text-[0.75rem] leading-relaxed text-slate-500">
              Adding a store here does not start monitoring on its own. A lease
              has to be read before there is a clause to watch, and we will ask
              you for it.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
