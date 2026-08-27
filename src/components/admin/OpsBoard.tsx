"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { ActionButton, Pill, type Tone } from "@/components/app/ui";
import { scanSheetHtml } from "@/lib/scan-sheet";

/**
 * THE OPERATIONS BOARD
 *
 * Internal. This is where the team programs how a portfolio is watched:
 * the scan schedule the org inherits, the exceptions per location, the
 * Places id for each storefront, and the directory links a scan reads
 * for each center. It is also the queue of everything clients have
 * asked for from inside the workspace.
 *
 * The design rule is exceptions-only. At a thousand stores nobody edits
 * a thousand rows: the org schedule covers everyone, sources attach to
 * centers rather than stores, and the board leads with the gaps —
 * what is missing, what is due, what a client is waiting on.
 */

export type LocationSnapshot = {
  id: string;
  centerRef: string;
  centerName: string;
  city: string;
  state: string;
  evalLabel: string;
  evalTone: string;
  watched: { name: string; status: string }[];
  tightest: string;
};

type Schedule =
  | { cadence: "weekly"; weekday: number }
  | { cadence: "monthly_days"; days: (number | "last")[] };

type LocationConfig = {
  location_ref: string;
  status: "active" | "paused" | "removed";
  scan_schedule: Schedule | null;
  place_id: string | null;
  lease_updated_on: string | null;
  notes: string | null;
};

type Source = {
  id: string;
  center_ref: string;
  kind: string;
  url: string | null;
  place_id: string | null;
  label: string | null;
};

type Submission = {
  id: string;
  org_slug: string;
  client_name: string;
  store_estimate: number | null;
  row_count: number | null;
  submitted_at: string;
  processed_at: string | null;
};

type Directive = {
  id: string;
  scope: string;
  topic: string;
  body: string;
  active: boolean;
};

type RequestRow = {
  id: string;
  location_ref: string | null;
  center_name: string | null;
  kind: string;
  store_name: string | null;
  observed_on: string | null;
  body: string | null;
  created_at: string;
  handled_at: string | null;
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const KIND_LABEL: Record<string, string> = {
  manual_scan: "Scan now",
  closure_report: "Closure report",
  estoppel_review: "Estoppel review",
};

function describeSchedule(s: Schedule | null | undefined): string {
  if (!s) return "—";
  if (s.cadence === "weekly") return `Weekly, ${WEEKDAYS[s.weekday]}`;
  return `Monthly: ${s.days.map((d) => (d === "last" ? "last day" : `${d}th`)).join(", ")}`;
}

function dueToday(s: Schedule | null | undefined, now = new Date()): boolean {
  if (!s) return false;
  if (s.cadence === "weekly") return now.getDay() === s.weekday;
  const day = now.getDate();
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return s.days.some((d) => (d === "last" ? day === last : d === day));
}

/* ------------------------------------------------------------------
   schedule editor, shared by org and location
   ------------------------------------------------------------------ */

function ScheduleEditor({
  value,
  inheritable,
  onChange,
}: {
  value: Schedule | null;
  /** Offer "inherit" (location level) instead of forcing a value. */
  inheritable?: boolean;
  onChange: (s: Schedule | null) => void;
}) {
  const mode = !value ? "inherit" : value.cadence;
  const [custom, setCustom] = useState(
    value?.cadence === "monthly_days"
      ? value.days.map((d) => (d === "last" ? "last" : String(d))).join(", ")
      : "15, last",
  );

  const parseCustom = (raw: string): Schedule | null => {
    const days = raw
      .split(/[,\s]+/)
      .filter(Boolean)
      .map((d) => (d.toLowerCase() === "last" ? ("last" as const) : Number(d)))
      .filter((d) => d === "last" || (Number.isInteger(d) && d >= 1 && d <= 28));
    return days.length ? { cadence: "monthly_days", days } : null;
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={mode}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "inherit") onChange(null);
          else if (v === "weekly") onChange({ cadence: "weekly", weekday: 1 });
          else onChange(parseCustom(custom) ?? { cadence: "monthly_days", days: [15, "last"] });
        }}
        className="rounded-md border border-line bg-surface px-2 py-1.5 text-[0.75rem] text-ink focus:border-petrol-500 focus:outline-none"
      >
        {inheritable && <option value="inherit">Inherit org schedule</option>}
        <option value="weekly">Weekly</option>
        <option value="monthly_days">Days of the month</option>
      </select>

      {value?.cadence === "weekly" && (
        <select
          value={value.weekday}
          onChange={(e) => onChange({ cadence: "weekly", weekday: Number(e.target.value) })}
          className="rounded-md border border-line bg-surface px-2 py-1.5 text-[0.75rem] text-ink focus:border-petrol-500 focus:outline-none"
        >
          {WEEKDAYS.map((d, i) => (
            <option key={d} value={i}>
              {d}
            </option>
          ))}
        </select>
      )}

      {value?.cadence === "monthly_days" && (
        <input
          value={custom}
          onChange={(e) => {
            setCustom(e.target.value);
            const parsed = parseCustom(e.target.value);
            if (parsed) onChange(parsed);
          }}
          placeholder="15, last"
          className="w-28 rounded-md border border-line bg-surface px-2 py-1.5 font-mono text-[0.75rem] text-ink focus:border-petrol-500 focus:outline-none"
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------
   the board
   ------------------------------------------------------------------ */

export function OpsBoard({
  orgName,
  locations,
}: {
  orgName: string;
  locations: LocationSnapshot[];
}) {
  const [orgSchedule, setOrgSchedule] = useState<Schedule | null>(null);
  const [configs, setConfigs] = useState<Map<string, LocationConfig>>(new Map());
  const [sources, setSources] = useState<Source[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [directives, setDirectives] = useState<Directive[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/admin/api", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setOrgSchedule(data.orgSchedule ?? { cadence: "monthly_days", days: [15, "last"] });
    setConfigs(
      new Map(
        (data.locations as LocationConfig[]).map((c) => [c.location_ref, c]),
      ),
    );
    setSources(data.sources);
    setRequests(data.requests);
    setSubmissions(data.submissions ?? []);
    setDirectives(data.directives ?? []);
    setLoaded(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const post = useCallback(
    async (payload: Record<string, unknown>) => {
      const res = await fetch("/admin/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        await load();
        setFlash(new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }));
      }
      return res.ok;
    },
    [load],
  );

  /* ---- derived gaps ---- */
  const directoryByCenter = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of sources)
      if (s.kind === "directory")
        m.set(s.center_ref, (m.get(s.center_ref) ?? 0) + 1);
    return m;
  }, [sources]);

  const centers = useMemo(() => {
    const m = new Map<string, { name: string; locations: number }>();
    for (const l of locations) {
      const e = m.get(l.centerRef) ?? { name: l.centerName, locations: 0 };
      e.locations += 1;
      m.set(l.centerRef, e);
    }
    return m;
  }, [locations]);

  const gaps = useMemo(() => {
    const missingPlace = locations.filter((l) => !configs.get(l.id)?.place_id).length;
    const missingDirectory = [...centers.keys()].filter(
      (c) => !directoryByCenter.has(c),
    ).length;
    const openRequests = requests.filter((r) => !r.handled_at).length;
    const due = locations.filter((l) => {
      const cfg = configs.get(l.id);
      if (cfg?.status === "paused" || cfg?.status === "removed") return false;
      return dueToday(cfg?.scan_schedule ?? orgSchedule);
    }).length;
    return { missingPlace, missingDirectory, openRequests, due };
  }, [locations, configs, centers, directoryByCenter, requests, orgSchedule]);

  if (!loaded) {
    return <p className="px-6 py-10 text-[0.8125rem] text-muted">Loading the board.</p>;
  }

  return (
    <div className="mx-auto max-w-[80rem] space-y-6 px-6 py-6">
      {/* ---- the numbers that are the to-do list ---- */}
      <div className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
        {(
          [
            ["Open requests", gaps.openRequests, gaps.openRequests > 0],
            ["Scans due today", gaps.due, gaps.due > 0],
            ["Locations without a Places id", gaps.missingPlace, gaps.missingPlace > 0],
            ["Centers without a directory link", gaps.missingDirectory, gaps.missingDirectory > 0],
          ] as const
        ).map(([k, n, hot]) => (
          <div key={k} className="bg-surface px-4 py-3">
            <p className="label text-faint">{k}</p>
            <p
              className={cn(
                "tnum font-display mt-1 text-[1.375rem] leading-none",
                hot ? "text-brass-700" : "text-open-700",
              )}
            >
              {n}
            </p>
          </div>
        ))}
      </div>

      {/* ---- today's sheet: the manual sweep as a work packet ---- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[0.8125rem] text-muted">
          {gaps.due > 0
            ? `${gaps.due} location${gaps.due === 1 ? " is" : "s are"} due a scan today.`
            : "Nothing is due today on the current schedules."}
        </p>
        <ActionButton
          variant="secondary"
          disabled={gaps.due === 0}
          onClick={() => {
            const due = locations.filter((l) => {
              const cfg = configs.get(l.id);
              if (cfg?.status === "paused" || cfg?.status === "removed") return false;
              return dueToday(cfg?.scan_schedule ?? orgSchedule);
            });
            const html = scanSheetHtml(
              due.map((l) => ({
                id: l.id,
                centerName: l.centerName,
                city: l.city,
                state: l.state,
                sources: sources
                  .filter((s) => s.center_ref === l.centerRef)
                  .map((s) => ({ kind: s.kind, url: s.url, placeId: s.place_id })),
                watched: l.watched,
                tightest: l.tightest,
              })),
              {
                orgName,
                date: new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                }),
              },
            );
            const w = window.open("", "_blank");
            if (!w) return;
            w.document.write(html);
            w.document.close();
          }}
        >
          Print the scan sheet
        </ActionButton>
      </div>

      {/* ---- org schedule ---- */}
      <section className="rounded-xl border border-line">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            <h2 className="text-[0.875rem] font-semibold text-ink">
              Scan schedule · {orgName}
            </h2>
            <p className="mt-0.5 text-[0.75rem] text-muted">
              Every location inherits this unless it carries an override below.
            </p>
          </div>
          <p className="text-[0.75rem] text-muted">{describeSchedule(orgSchedule)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          <ScheduleEditor value={orgSchedule} onChange={setOrgSchedule} />
          <ActionButton
            variant="secondary"
            onClick={() => void post({ action: "org_schedule", schedule: orgSchedule })}
          >
            Save schedule
          </ActionButton>
          {flash && <span className="text-[0.75rem] text-open-700">Saved {flash}</span>}
        </div>
      </section>

      {/* ---- onboarding submissions: the work orders ---- */}
      {submissions.length > 0 && (
        <section className="overflow-hidden rounded-xl border border-line">
          <div className="border-b border-line px-4 py-3">
            <h2 className="text-[0.875rem] font-semibold text-ink">
              Onboarding submissions
            </h2>
            <p className="mt-0.5 text-[0.75rem] text-muted">
              A submission is the work order an account is set up from.
            </p>
          </div>
          <ul className="divide-y divide-line">
            {submissions.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-[0.8125rem] font-medium text-ink">
                    {s.client_name}
                  </p>
                  <p className="text-[0.6875rem] text-muted">
                    {s.row_count ?? 0} roster rows
                    {s.store_estimate ? ` of ${s.store_estimate} expected` : ""}
                    {" · "}
                    {new Date(s.submitted_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                {s.processed_at ? (
                  <Pill tone={"open" as Tone} dot>
                    Set up
                  </Pill>
                ) : (
                  <ActionButton
                    variant="secondary"
                    onClick={() =>
                      void post({ action: "submission_processed", id: s.id })
                    }
                  >
                    Mark set up
                  </ActionButton>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---- requests queue ---- */}
      <section className="overflow-hidden rounded-xl border border-line">
        <div className="border-b border-line px-4 py-3">
          <h2 className="text-[0.875rem] font-semibold text-ink">Client requests</h2>
        </div>
        {requests.length === 0 ? (
          <p className="px-4 py-4 text-[0.8125rem] text-muted">Nothing filed yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {requests.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-start justify-between gap-3 px-4 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[0.8125rem] text-ink">
                    <span className="font-medium">{KIND_LABEL[r.kind] ?? r.kind}</span>
                    {r.center_name ? ` · ${r.center_name}` : ""}
                    {r.store_name ? ` · ${r.store_name}` : ""}
                    {r.location_ref ? (
                      <span className="ml-1.5 text-faint">{r.location_ref}</span>
                    ) : null}
                  </p>
                  {r.body && (
                    <p className="mt-0.5 text-[0.75rem] leading-snug text-muted">
                      {r.body}
                    </p>
                  )}
                  <p className="mt-0.5 text-[0.6875rem] text-faint">
                    {new Date(r.created_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                    {r.observed_on ? ` · observed ${r.observed_on.slice(0, 10)}` : ""}
                  </p>
                </div>
                {r.handled_at ? (
                  <Pill tone={"open" as Tone} dot>
                    Handled
                  </Pill>
                ) : (
                  <ActionButton
                    variant="secondary"
                    onClick={() => void post({ action: "request_handled", id: r.id })}
                  >
                    Mark handled
                  </ActionButton>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---- locations ---- */}
      <section className="overflow-hidden rounded-xl border border-line">
        <div className="border-b border-line px-4 py-3">
          <h2 className="text-[0.875rem] font-semibold text-ink">Locations</h2>
          <p className="mt-0.5 text-[0.75rem] text-muted">
            Exceptions only: a row needs touching when it is paused, scheduled
            apart from the org, or missing its Places id or directory link.
          </p>
        </div>
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-surface-sunk/50">
              {["Location", "Position", "Status", "Schedule", "Places id", "Directory", ""].map(
                (h) => (
                  <th key={h} className="label px-3 py-2 font-semibold text-faint">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {locations.map((l) => {
              const cfg = configs.get(l.id);
              const open = openRow === l.id;
              const dirCount = directoryByCenter.get(l.centerRef) ?? 0;
              return (
                <RowEditor
                  key={l.id}
                  location={l}
                  cfg={cfg}
                  dirCount={dirCount}
                  sources={sources.filter((s) => s.center_ref === l.centerRef)}
                  open={open}
                  onToggle={() => setOpenRow(open ? null : l.id)}
                  onSave={post}
                />
              );
            })}
          </tbody>
        </table>
      </section>

      {/* ---- agent programming ---- */}
      <DirectiveEditor directives={directives} orgName={orgName} onPost={post} />

      <p className="text-[0.6875rem] text-faint">
        Internal. Changes persist to the account database and drive the scan
        queue the team works from.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------
   one location row, expandable into its editor
   ------------------------------------------------------------------ */

function RowEditor({
  location,
  cfg,
  dirCount,
  sources,
  open,
  onToggle,
  onSave,
}: {
  location: LocationSnapshot;
  cfg: LocationConfig | undefined;
  dirCount: number;
  sources: Source[];
  open: boolean;
  onToggle: () => void;
  onSave: (payload: Record<string, unknown>) => Promise<boolean>;
}) {
  const [status, setStatus] = useState<LocationConfig["status"]>(cfg?.status ?? "active");
  const [schedule, setSchedule] = useState<Schedule | null>(cfg?.scan_schedule ?? null);
  const [placeId, setPlaceId] = useState(cfg?.place_id ?? "");
  const [leaseDate, setLeaseDate] = useState(cfg?.lease_updated_on?.slice(0, 10) ?? "");
  const [notes, setNotes] = useState(cfg?.notes ?? "");
  const [newUrl, setNewUrl] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setStatus(cfg?.status ?? "active");
    setSchedule(cfg?.scan_schedule ?? null);
    setPlaceId(cfg?.place_id ?? "");
    setLeaseDate(cfg?.lease_updated_on?.slice(0, 10) ?? "");
    setNotes(cfg?.notes ?? "");
  }, [cfg]);

  const save = async () => {
    const ok = await onSave({
      action: "location",
      locationRef: location.id,
      status,
      schedule,
      placeId,
      leaseUpdatedOn: leaseDate,
      notes,
    });
    if (ok) setSaved(true);
  };

  return (
    <>
      <tr
        onClick={onToggle}
        className={cn("cursor-pointer", open ? "bg-petrol-50" : "hover:bg-surface-sunk")}
      >
        <td className="px-3 py-2">
          <p className="text-[0.8125rem] font-medium text-ink">{location.centerName}</p>
          <p className="text-[0.6875rem] text-muted">
            {location.id} · {location.city}, {location.state}
          </p>
        </td>
        <td className="px-3 py-2">
          <Pill tone={location.evalTone as Tone} dot>
            {location.evalLabel}
          </Pill>
        </td>
        <td className="px-3 py-2 text-[0.75rem] text-ink-soft">
          {cfg?.status && cfg.status !== "active" ? (
            <Pill tone={"clay" as Tone}>{cfg.status}</Pill>
          ) : (
            "active"
          )}
        </td>
        <td className="px-3 py-2 text-[0.75rem] text-ink-soft">
          {cfg?.scan_schedule ? describeSchedule(cfg.scan_schedule) : "inherits"}
        </td>
        <td className="px-3 py-2">
          {cfg?.place_id ? (
            <Check className="h-3.5 w-3.5 text-open-600" />
          ) : (
            <span className="text-[0.75rem] text-brass-700">missing</span>
          )}
        </td>
        <td className="px-3 py-2">
          {dirCount > 0 ? (
            <span className="tnum text-[0.75rem] text-ink-soft">{dirCount}</span>
          ) : (
            <span className="text-[0.75rem] text-brass-700">missing</span>
          )}
        </td>
        <td className="px-3 py-2 text-right">
          <ChevronDown
            className={cn("h-3.5 w-3.5 text-faint transition-transform", open && "rotate-180")}
          />
        </td>
      </tr>

      {open && (
        <tr className="bg-surface-sunk/40">
          <td colSpan={7} className="px-4 py-4">
            <div
              className="grid gap-4 lg:grid-cols-2"
              onClick={(e) => e.stopPropagation()}
            >
              {/* ---- the location itself ---- */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="label text-muted">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as LocationConfig["status"])}
                    className="rounded-md border border-line bg-surface px-2 py-1.5 text-[0.75rem] text-ink focus:border-petrol-500 focus:outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused, keep on file</option>
                    <option value="removed">Removed, store closed or sold</option>
                  </select>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="label text-muted">Schedule</label>
                  <ScheduleEditor value={schedule} inheritable onChange={setSchedule} />
                </div>

                <div>
                  <label className="label text-muted">
                    Google Places id, this storefront
                  </label>
                  <input
                    value={placeId}
                    onChange={(e) => setPlaceId(e.target.value)}
                    placeholder="ChIJ…"
                    className="mt-1 w-full rounded-md border border-line bg-surface px-2.5 py-1.5 font-mono text-[0.75rem] text-ink placeholder:text-faint focus:border-petrol-500 focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="label text-muted">Lease updated</label>
                  <input
                    type="date"
                    value={leaseDate}
                    onChange={(e) => setLeaseDate(e.target.value)}
                    className="rounded-md border border-line bg-surface px-2.5 py-1.5 text-[0.75rem] text-ink focus:border-petrol-500 focus:outline-none"
                  />
                  <span className="text-[0.6875rem] text-muted">
                    Setting this queues re-extraction of the clause record.
                  </span>
                </div>

                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Ops notes for this location."
                  className="w-full rounded-md border border-line bg-surface p-2.5 text-[0.75rem] text-ink placeholder:text-faint focus:border-petrol-500 focus:outline-none"
                />

                <div className="flex items-center gap-3">
                  <ActionButton onClick={() => void save()}>Save location</ActionButton>
                  {saved && <span className="text-[0.75rem] text-open-700">Saved</span>}
                </div>
              </div>

              {/* ---- the center's sources, shared by every store in it ---- */}
              <div className="space-y-2">
                <p className="label text-muted">
                  Sources for {location.centerName}
                </p>
                <p className="text-[0.6875rem] leading-snug text-muted">
                  Shared across every location in this center. The scan reads
                  these each pass.
                </p>
                <ul className="space-y-1.5">
                  {sources.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between gap-2 rounded-md border border-line bg-surface px-2.5 py-1.5"
                    >
                      <p className="min-w-0 truncate font-mono text-[0.6875rem] text-ink-soft">
                        <span className="mr-1.5 rounded bg-surface-sunk px-1 py-0.5 text-[0.625rem] font-semibold text-muted">
                          {s.kind}
                        </span>
                        {s.url ?? s.place_id}
                      </p>
                      <button
                        type="button"
                        onClick={() => void onSave({ action: "source_remove", id: s.id })}
                        className="text-faint transition-colors hover:text-clay-700"
                        aria-label="Remove source"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                  {sources.length === 0 && (
                    <li className="rounded-md border border-dashed border-line px-2.5 py-2 text-[0.75rem] text-muted">
                      Nothing linked. The scan for this center has nowhere to
                      look yet.
                    </li>
                  )}
                </ul>
                <div className="flex gap-2">
                  <input
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="https://the-mall.com/directory"
                    className="min-w-0 flex-1 rounded-md border border-line bg-surface px-2.5 py-1.5 font-mono text-[0.6875rem] text-ink placeholder:text-faint focus:border-petrol-500 focus:outline-none"
                  />
                  <ActionButton
                    variant="secondary"
                    disabled={!newUrl.trim()}
                    onClick={async () => {
                      const ok = await onSave({
                        action: "source_add",
                        centerRef: location.centerRef,
                        kind: "directory",
                        url: newUrl.trim(),
                      });
                      if (ok) setNewUrl("");
                    }}
                  >
                    Add
                  </ActionButton>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}


/* ------------------------------------------------------------------
   agent programming
   ------------------------------------------------------------------ */

function DirectiveEditor({
  directives,
  orgName,
  onPost,
}: {
  directives: Directive[];
  orgName: string;
  onPost: (payload: Record<string, unknown>) => Promise<boolean>;
}) {
  const [scope, setScope] = useState<"global" | "org">("global");
  const [topic, setTopic] = useState("general");
  const [body, setBody] = useState("");

  const groups: [string, Directive[]][] = [
    ["Breakpoint-wide", directives.filter((d) => d.scope === "global")],
    [orgName, directives.filter((d) => d.scope !== "global")],
  ];

  return (
    <section className="overflow-hidden rounded-xl border border-line">
      <div className="border-b border-line px-4 py-3">
        <h2 className="text-[0.875rem] font-semibold text-ink">Agent programming</h2>
        <p className="mt-0.5 text-[0.75rem] text-muted">
          Assembled into every extraction and scan run, Breakpoint-wide first,
          then the client&#8217;s own. A row edit here reaches the agent
          without a deploy.
        </p>
      </div>

      <div className="grid gap-px bg-line lg:grid-cols-2">
        {groups.map(([title, list]) => (
          <div key={title} className="bg-surface px-4 py-3">
            <p className="label text-faint">{title}</p>
            <ul className="mt-2 space-y-1.5">
              {list.map((d) => (
                <li
                  key={d.id}
                  className={cn(
                    "flex items-start justify-between gap-2 rounded-md border border-line px-2.5 py-2",
                    !d.active && "opacity-50",
                  )}
                >
                  <p className="min-w-0 text-[0.75rem] leading-snug text-ink-soft">
                    <span className="mr-1.5 rounded bg-surface-sunk px-1 py-0.5 text-[0.625rem] font-semibold text-muted">
                      {d.topic}
                    </span>
                    {d.body}
                  </p>
                  <span className="flex shrink-0 gap-1.5">
                    <button
                      type="button"
                      onClick={() => void onPost({ action: "directive_toggle", id: d.id })}
                      className="text-[0.6875rem] font-medium text-muted hover:text-ink"
                    >
                      {d.active ? "Disable" : "Enable"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void onPost({ action: "directive_remove", id: d.id })}
                      className="text-faint hover:text-clay-700"
                      aria-label="Remove directive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                </li>
              ))}
              {list.length === 0 && (
                <li className="rounded-md border border-dashed border-line px-2.5 py-2 text-[0.75rem] text-muted">
                  Nothing yet.
                </li>
              )}
            </ul>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value as "global" | "org")}
          className="rounded-md border border-line bg-surface px-2 py-1.5 text-[0.75rem] text-ink focus:border-petrol-500 focus:outline-none"
        >
          <option value="global">Breakpoint-wide</option>
          <option value="org">{orgName} only</option>
        </select>
        <select
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="rounded-md border border-line bg-surface px-2 py-1.5 text-[0.75rem] text-ink focus:border-petrol-500 focus:outline-none"
        >
          {["general", "extraction", "scanning", "matching", "notices"].map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="One instruction, stated plainly."
          className="min-w-0 flex-1 rounded-md border border-line bg-surface px-2.5 py-1.5 text-[0.75rem] text-ink placeholder:text-faint focus:border-petrol-500 focus:outline-none"
        />
        <ActionButton
          variant="secondary"
          disabled={!body.trim()}
          onClick={async () => {
            const ok = await onPost({ action: "directive_add", scope, topic, body });
            if (ok) setBody("");
          }}
        >
          Add
        </ActionButton>
      </div>
    </section>
  );
}
