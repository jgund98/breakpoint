"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BellRing,
  Check,
  ChevronDown,
  FileSearch,
  FileSignature,
  Link2Off,
  MapPinOff,
  MessageSquareDot,
  Printer,
  Radar,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import {
  Badge,
  Btn,
  Rise,
  Section,
  SearchInput,
  StatCard,
  Th,
  EmptyNote,
  inputCls,
  selectCls,
  textareaCls,
  EVAL_BADGE,
} from "@/components/admin/ui";
import { KIND_LABEL } from "@/components/admin/useConsole";
import { ScanRecorder } from "@/components/admin/ScanRecorder";
import Link from "next/link";
import { scanSheetHtml } from "@/lib/scan-sheet";

/**
 * ONE CLIENT'S OPERATIONS BOARD
 *
 * Internal. This is where the team programs how a portfolio is watched:
 * the scan schedule the org inherits, the exceptions per location, the
 * Places id for each storefront, the directory links a scan reads for
 * each center, and the lease papers each location's record is extracted
 * from. It is also the queue of everything this client has asked for.
 *
 * The design rule is exceptions-only, because clients arrive with
 * hundreds or thousands of stores: the org schedule covers everyone,
 * sources attach to centers rather than stores, the table is searchable
 * and filterable to exceptions, and the board leads with the gaps.
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

type LeaseDoc = {
  id: string;
  kind: string;
  filename: string;
  byte_size: number;
  created_at: string;
};

type AlertRow = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  location_ref: string | null;
  created_at: string;
  read_at: string | null;
};

type PipelineRow = { location_ref: string; stage: string; note: string | null };

type NoticeStatusRow = {
  location_ref: string;
  stage: string;
  served_on: string | null;
  response: string | null;
  updated_at: string;
};

type ScanRunRow = {
  id: string;
  ran_by: string;
  note: string | null;
  locations: number;
  stores: number;
  changes: number;
  created_at: string;
};

type FlagAdminRow = {
  id: number;
  location_ref: string;
  center_name: string;
  kind: string;
  headline: string;
  flagged_on: string;
  status: "new" | "in_review" | "handled";
  actor: string | null;
  handled_at: string | null;
  created_at: string;
};

type Account = {
  accountManager: string | null;
  contractStart: string | null;
  contractRenewal: string | null;
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

/* Show this many rows before asking for a narrower search: a
   thousand-store client must not render a thousand expandable rows. */
const MAX_ROWS = 200;

const fmtSize = (n: number) =>
  n >= 1024 * 1024
    ? `${(n / 1048576).toFixed(1)} MB`
    : `${Math.max(1, Math.round(n / 1024))} KB`;

function describeSchedule(s: Schedule | null | undefined): string {
  if (!s) return "—";
  if (s.cadence === "weekly") return `Weekly, ${WEEKDAYS[s.weekday]}`;
  return `Monthly: ${s.days.map((d) => (d === "last" ? "last day" : `${d}th`)).join(", ")}`;
}

/* Local accessors on purpose: "due today" means the operator's today,
   and this renders only after the client fetch, never at SSR. */
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
        className={selectCls}
      >
        {inheritable && <option value="inherit">Inherit org schedule</option>}
        <option value="weekly">Weekly</option>
        <option value="monthly_days">Days of the month</option>
      </select>

      {value?.cadence === "weekly" && (
        <select
          value={value.weekday}
          onChange={(e) => onChange({ cadence: "weekly", weekday: Number(e.target.value) })}
          className={selectCls}
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
          className={cn(inputCls, "w-28 font-mono")}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------
   the board
   ------------------------------------------------------------------ */

export function OpsBoard({
  orgSlug,
  orgName,
  hasPortfolio,
  locations,
}: {
  orgSlug: string;
  orgName: string;
  /** False while the client's roster is not yet imported into the engine. */
  hasPortfolio: boolean;
  locations: LocationSnapshot[];
}) {
  const [orgSchedule, setOrgSchedule] = useState<Schedule | null>(null);
  const [configs, setConfigs] = useState<Map<string, LocationConfig>>(new Map());
  const [sources, setSources] = useState<Source[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [pipeline, setPipeline] = useState<PipelineRow[]>([]);
  const [noticeStatus, setNoticeStatus] = useState<NoticeStatusRow[]>([]);
  const [scanRuns, setScanRuns] = useState<ScanRunRow[]>([]);
  const [flags, setFlags] = useState<FlagAdminRow[]>([]);
  const [account, setAccount] = useState<Account>({
    accountManager: null,
    contractStart: null,
    contractRenewal: null,
  });
  const [loaded, setLoaded] = useState(false);
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [exceptionsOnly, setExceptionsOnly] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/admin/api?org=${encodeURIComponent(orgSlug)}`, {
      cache: "no-store",
    });
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
    setAlerts(data.alerts ?? []);
    setPipeline(data.pipeline ?? []);
    setNoticeStatus(data.noticeStatus ?? []);
    setScanRuns(data.scanRuns ?? []);
    setFlags(data.flags ?? []);
    setAccount({
      accountManager: data.org?.accountManager ?? null,
      contractStart: data.org?.contractStart?.slice?.(0, 10) ?? null,
      contractRenewal: data.org?.contractRenewal?.slice?.(0, 10) ?? null,
    });
    setLoaded(true);
  }, [orgSlug]);

  useEffect(() => {
    void load();
  }, [load]);

  const post = useCallback(
    async (payload: Record<string, unknown>) => {
      const res = await fetch("/admin/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org: orgSlug, ...payload }),
      });
      if (res.ok) {
        await load();
        setFlash(new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }));
      }
      return res.ok;
    },
    [load, orgSlug],
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

  const isException = useCallback(
    (l: LocationSnapshot) => {
      const cfg = configs.get(l.id);
      return (
        (cfg?.status && cfg.status !== "active") ||
        Boolean(cfg?.scan_schedule) ||
        !cfg?.place_id ||
        !directoryByCenter.has(l.centerRef)
      );
    },
    [configs, directoryByCenter],
  );

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = locations;
    if (q)
      list = list.filter((l) =>
        [l.id, l.centerName, l.city, l.state]
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    if (exceptionsOnly) list = list.filter(isException);
    return list;
  }, [locations, query, exceptionsOnly, isException]);

  if (!loaded) {
    return <p className="py-16 text-center text-[0.8125rem] text-slate-400">Loading the board.</p>;
  }

  const dueIds = new Set(
    locations
      .filter((l) => {
        const cfg = configs.get(l.id);
        if (cfg?.status === "paused" || cfg?.status === "removed") return false;
        return dueToday(cfg?.scan_schedule ?? orgSchedule);
      })
      .map((l) => l.id),
  );

  const printSheet = () => {
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
  };

  return (
    <div className="space-y-6">
      {/* ---- the numbers that are the to-do list ---- */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Open requests"
          value={gaps.openRequests}
          icon={<MessageSquareDot className="h-5 w-5" />}
          color="indigo"
          hot={gaps.openRequests > 0}
          delay={0}
        />
        <StatCard
          label="Scans due today"
          value={gaps.due}
          icon={<Radar className="h-5 w-5" />}
          color="sky"
          hot={gaps.due > 0}
          delay={50}
        />
        <StatCard
          label="Missing Places ids"
          value={gaps.missingPlace}
          icon={<MapPinOff className="h-5 w-5" />}
          color="violet"
          hot={gaps.missingPlace > 0}
          delay={100}
        />
        <StatCard
          label="Missing directory links"
          value={gaps.missingDirectory}
          icon={<Link2Off className="h-5 w-5" />}
          color="emerald"
          hot={gaps.missingDirectory > 0}
          delay={150}
        />
      </div>

      {/* ---- org schedule ---- */}
      <Rise delay={100}>
        <Section
          title={`Scan schedule · ${orgName}`}
          blurb="Every location inherits this unless it carries an override below."
          aside={
            <p className="text-[0.8125rem] font-medium text-slate-500">
              {describeSchedule(orgSchedule)}
            </p>
          }
        >
          <div className="flex flex-wrap items-center gap-3">
            <ScheduleEditor value={orgSchedule} onChange={setOrgSchedule} />
            <Btn
              variant="secondary"
              onClick={() => void post({ action: "org_schedule", schedule: orgSchedule })}
            >
              Save schedule
            </Btn>
            {flash && (
              <span className="text-[0.75rem] font-medium text-emerald-600">
                Saved {flash}
              </span>
            )}
          </div>
        </Section>
      </Rise>

      {/* ---- records pulled back for review ---- */}
      {pipeline.length > 0 && (
        <Rise delay={120}>
          <Link
            href="/admin/extraction"
            className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 shadow-sm transition-all hover:shadow-md"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                <FileSearch className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-[0.875rem] font-semibold text-slate-900">
                  {pipeline.length} record{pipeline.length === 1 ? "" : "s"} awaiting
                  human approval
                </span>
                <span className="block text-[0.75rem] text-slate-600">
                  {pipeline.map((p) => p.location_ref).join(", ")} · review on the
                  extraction desk
                </span>
              </span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-amber-500" />
          </Link>
        </Rise>
      )}

      {/* ---- the account facts ---- */}
      <Rise delay={130}>
        <Section
          title="Account"
          blurb="Who owns this client and when the contract turns. The renewal date is when the watch record earns the invoice."
        >
          <AccountEditor
            key={account.accountManager ?? "" + account.contractRenewal}
            account={account}
            onSave={(a) => void post({ action: "org_update", ...a })}
          />
        </Section>
      </Rise>

      {/* ---- requests queue ---- */}
      <Rise delay={150}>
        <Section
          title="Client requests"
          flush
          aside={
            <Badge tone={gaps.openRequests > 0 ? "amber" : "emerald"} dot>
              {gaps.openRequests > 0 ? `${gaps.openRequests} open` : "Clear"}
            </Badge>
          }
        >
          {requests.length === 0 ? (
            <EmptyNote>Nothing filed yet.</EmptyNote>
          ) : (
            <ul className="divide-y divide-slate-100">
              {requests.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-start justify-between gap-3 px-6 py-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.8125rem] text-slate-800">
                      <span className="font-semibold">{KIND_LABEL[r.kind] ?? r.kind}</span>
                      {r.center_name ? ` · ${r.center_name}` : ""}
                      {r.store_name ? ` · ${r.store_name}` : ""}
                      {r.location_ref ? (
                        <span className="ml-1.5 text-slate-400">{r.location_ref}</span>
                      ) : null}
                    </p>
                    {r.body && (
                      <p className="mt-0.5 text-[0.75rem] leading-snug text-slate-500">
                        {r.body}
                      </p>
                    )}
                    <p className="mt-0.5 text-[0.6875rem] text-slate-400">
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
                    <Badge tone="emerald" dot>
                      Handled
                    </Badge>
                  ) : (
                    <Btn
                      variant="secondary"
                      onClick={() => void post({ action: "request_handled", id: r.id })}
                    >
                      Mark handled
                    </Btn>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>
      </Rise>

      {/* ---- locations ---- */}
      <Rise delay={200}>
        <Section
          title="Locations"
          blurb="Exceptions only: a row needs touching when it is paused, scheduled apart from the org, or missing its Places id or directory link."
          flush
          aside={
            hasPortfolio ? (
              <>
                <SearchInput
                  value={query}
                  onChange={setQuery}
                  placeholder="Find a location…"
                />
                <button
                  type="button"
                  onClick={() => setExceptionsOnly((v) => !v)}
                  className={cn(
                    "h-10 rounded-xl border px-3 text-[0.8125rem] font-semibold transition-all duration-200 active:scale-95",
                    exceptionsOnly
                      ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 bg-white text-slate-500 shadow-sm hover:border-slate-300 hover:text-slate-800",
                  )}
                >
                  Exceptions only
                </button>
                <Btn
                  variant="secondary"
                  disabled={gaps.due === 0}
                  onClick={printSheet}
                >
                  <Printer className="h-4 w-4" /> Print the scan sheet
                </Btn>
              </>
            ) : undefined
          }
        >
          {!hasPortfolio ? (
            <div className="px-6 py-6">
              <p className="text-[0.875rem] font-semibold text-slate-900">
                No locations yet — awaiting portfolio import.
              </p>
              <p className="mt-1 max-w-[44rem] text-[0.8125rem] leading-snug text-slate-500">
                The roster from this client&#8217;s onboarding submission becomes
                locations when it is imported into the monitoring engine. Their
                schedule above and anything they file meanwhile are already
                live.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    {["Location", "Position", "Status", "Schedule", "Places id", "Directory", ""].map(
                      (h) => (
                        <Th key={h}>{h}</Th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shown.slice(0, MAX_ROWS).map((l) => {
                    const cfg = configs.get(l.id);
                    const open = openRow === l.id;
                    const dirCount = directoryByCenter.get(l.centerRef) ?? 0;
                    return (
                      <RowEditor
                        key={l.id}
                        orgSlug={orgSlug}
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
                  {shown.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-[0.8125rem] text-slate-400">
                        No locations match.
                      </td>
                    </tr>
                  )}
                  {shown.length > MAX_ROWS && (
                    <tr>
                      <td colSpan={7} className="px-6 py-3 text-[0.75rem] text-slate-500">
                        Showing the first {MAX_ROWS} of {shown.length}. Narrow the
                        search to reach the rest.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </Rise>

      {/* ---- the client's flag inbox, ops view: what the client has
              or has not acted on, and the power to move it for them
              on the record ---- */}
      {flags.length > 0 && (
        <Rise delay={210}>
          <Section
            title="Client flag inbox"
            blurb={`${flags.filter((f) => f.status === "new").length} new · ${flags.filter((f) => f.status === "in_review").length} in review · ${flags.filter((f) => f.status === "handled").length} handled`}
            flush
          >
            <ul className="divide-y divide-slate-100">
              {flags.slice(0, 12).map((f) => (
                <li
                  key={f.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-6 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-[0.8125rem]">
                      <span className="font-semibold text-slate-900">
                        {f.center_name}
                      </span>
                      <span className="text-slate-400">{f.location_ref}</span>
                      <Badge
                        tone={
                          f.status === "new"
                            ? "rose"
                            : f.status === "in_review"
                              ? "indigo"
                              : "emerald"
                        }
                      >
                        {f.status === "new"
                          ? "New"
                          : f.status === "in_review"
                            ? "In review"
                            : "Handled"}
                      </Badge>
                    </p>
                    <p className="mt-0.5 text-[0.75rem] text-slate-500">
                      {f.headline} · flagged {f.flagged_on?.slice(0, 10)}
                      {f.status === "handled" && f.actor ? ` · by ${f.actor}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {f.status !== "handled" ? (
                      <Btn
                        variant="ghost"
                        onClick={() =>
                          void post({
                            action: "finding_move",
                            id: f.id,
                            status: "handled",
                          })
                        }
                      >
                        Mark handled
                      </Btn>
                    ) : (
                      <Btn
                        variant="ghost"
                        onClick={() =>
                          void post({
                            action: "finding_move",
                            id: f.id,
                            status: "new",
                          })
                        }
                      >
                        Reopen
                      </Btn>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        </Rise>
      )}

      {/* ---- the recorder: monitoring as a record ---- */}
      {hasPortfolio && (
        <Rise delay={220}>
          <ScanRecorder
            orgSlug={orgSlug}
            locations={locations}
            dueIds={dueIds}
            onFiled={() => void load()}
          />
        </Rise>
      )}

      {scanRuns.length > 0 && (
        <Rise delay={240}>
          <Section title="Filed passes" flush>
            <ul className="divide-y divide-slate-100">
              {scanRuns.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-6 py-3"
                >
                  <span className="text-[0.8125rem] text-slate-700">
                    <span className="tnum font-semibold text-slate-900">
                      {new Date(r.created_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="tnum ml-2 text-slate-500">
                      {r.stores} stores · {r.locations} locations
                    </span>
                    {r.note && <span className="ml-2 text-slate-400">{r.note}</span>}
                  </span>
                  <Badge tone={r.changes > 0 ? "amber" : "emerald"} dot>
                    {r.changes > 0
                      ? r.changes + " change" + (r.changes === 1 ? "" : "s")
                      : "No change"}
                  </Badge>
                </li>
              ))}
            </ul>
          </Section>
        </Rise>
      )}

      {/* ---- what the client was told ---- */}
      <Rise delay={260}>
        <Section
          title="Alerts sent"
          blurb="Every alert filed to this client's bell, with whether they've read it. When a client asks whether anyone told them, this answers in one look."
          flush
          aside={
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <BellRing className="h-4 w-4" />
            </span>
          }
        >
          {alerts.length === 0 ? (
            <EmptyNote>
              Nothing sent yet. Handling a request or filing a pass with a
              change alerts the client automatically.
            </EmptyNote>
          ) : (
            <ul className="divide-y divide-slate-100">
              {alerts.slice(0, 10).map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-start justify-between gap-3 px-6 py-3"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.8125rem] font-medium text-slate-800">
                      {a.title}
                      {a.location_ref && (
                        <span className="ml-1.5 text-slate-400">{a.location_ref}</span>
                      )}
                    </span>
                    <span className="block text-[0.6875rem] text-slate-400">
                      {new Date(a.created_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </span>
                  <Badge tone={a.read_at ? "emerald" : "amber"} dot>
                    {a.read_at ? "Read" : "Unread"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </Rise>

      {/* ---- served notices, tracked by the client ---- */}
      {noticeStatus.length > 0 && (
        <Rise delay={280}>
          <Section
            title="Served notices"
            blurb="The client's record of where each served notice stands with the landlord."
            flush
            aside={
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <FileSignature className="h-4 w-4" />
              </span>
            }
          >
            <ul className="divide-y divide-slate-100">
              {noticeStatus.map((n) => (
                <li
                  key={n.location_ref}
                  className="flex flex-wrap items-start justify-between gap-3 px-6 py-3"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.8125rem] font-semibold text-slate-900">
                      {n.location_ref}
                      {n.served_on && (
                        <span className="ml-2 font-normal text-slate-400">
                          served {n.served_on.slice(0, 10)}
                        </span>
                      )}
                    </span>
                    {n.response && (
                      <span className="block text-[0.75rem] leading-snug text-slate-500">
                        {n.response}
                      </span>
                    )}
                  </span>
                  <Badge
                    tone={
                      n.stage === "disputed"
                        ? "rose"
                        : n.stage === "cured" || n.stage === "resolved"
                          ? "emerald"
                          : n.stage === "acknowledged"
                            ? "indigo"
                            : "slate"
                    }
                    dot
                  >
                    {n.stage}
                  </Badge>
                </li>
              ))}
            </ul>
          </Section>
        </Rise>
      )}

      <p className="text-[0.6875rem] text-slate-400">
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
  orgSlug,
  location,
  cfg,
  dirCount,
  sources,
  open,
  onToggle,
  onSave,
}: {
  orgSlug: string;
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

  /* The papers on file for this location, fetched when the row opens. */
  const [docs, setDocs] = useState<LeaseDoc[] | null>(null);
  const [docKind, setDocKind] = useState("lease");
  const [docBusy, setDocBusy] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);

  const loadDocs = useCallback(async () => {
    const res = await fetch(
      `/admin/api/documents?org=${encodeURIComponent(orgSlug)}&location=${encodeURIComponent(location.id)}`,
      { cache: "no-store" },
    );
    if (res.ok) setDocs((await res.json()).documents ?? []);
  }, [orgSlug, location.id]);

  useEffect(() => {
    if (open && docs === null) void loadDocs();
  }, [open, docs, loadDocs]);

  const upload = async (file: File) => {
    setDocError(null);
    if (file.size > 4 * 1024 * 1024) {
      setDocError("Files up to 4 MB. Compress the scan and try again.");
      return;
    }
    setDocBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("org", orgSlug);
    fd.append("locationRef", location.id);
    fd.append("kind", docKind);
    const res = await fetch("/admin/api/documents", { method: "POST", body: fd });
    setDocBusy(false);
    if (res.ok) void loadDocs();
    else {
      const data = await res.json().catch(() => null);
      setDocError(data?.error ?? "The upload did not go through.");
    }
  };

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
        className={cn(
          "cursor-pointer transition-colors",
          open ? "bg-indigo-50/60" : "hover:bg-slate-50",
        )}
      >
        <td className="px-6 py-3">
          <p className="text-[0.8125rem] font-semibold text-slate-900">
            {location.centerName}
          </p>
          <p className="text-[0.6875rem] text-slate-400">
            {location.id} · {location.city}, {location.state}
          </p>
        </td>
        <td className="px-6 py-3">
          <Badge tone={EVAL_BADGE[location.evalTone] ?? "slate"} dot>
            {location.evalLabel}
          </Badge>
        </td>
        <td className="px-6 py-3 text-[0.75rem] text-slate-600">
          {cfg?.status && cfg.status !== "active" ? (
            <Badge tone="rose">{cfg.status}</Badge>
          ) : (
            "active"
          )}
        </td>
        <td className="px-6 py-3 text-[0.75rem] text-slate-600">
          {cfg?.scan_schedule ? describeSchedule(cfg.scan_schedule) : "inherits"}
        </td>
        <td className="px-6 py-3">
          {cfg?.place_id ? (
            <Check className="h-4 w-4 text-emerald-500" />
          ) : (
            <span className="text-[0.75rem] font-medium text-amber-600">missing</span>
          )}
        </td>
        <td className="px-6 py-3">
          {dirCount > 0 ? (
            <span className="tnum text-[0.75rem] text-slate-600">{dirCount}</span>
          ) : (
            <span className="text-[0.75rem] font-medium text-amber-600">missing</span>
          )}
        </td>
        <td className="px-6 py-3 text-right">
          <ChevronDown
            className={cn(
              "h-4 w-4 text-slate-300 transition-transform",
              open && "rotate-180",
            )}
          />
        </td>
      </tr>

      {open && (
        <tr className="bg-slate-50/60">
          <td colSpan={7} className="px-6 py-5">
            <div
              className="grid gap-6 lg:grid-cols-2"
              onClick={(e) => e.stopPropagation()}
            >
              {/* ---- the location itself ---- */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="w-20 text-[0.75rem] font-medium text-slate-500">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as LocationConfig["status"])}
                    className={selectCls}
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused, keep on file</option>
                    <option value="removed">Removed, store closed or sold</option>
                  </select>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="w-20 text-[0.75rem] font-medium text-slate-500">
                    Schedule
                  </label>
                  <ScheduleEditor value={schedule} inheritable onChange={setSchedule} />
                </div>

                <div>
                  <label className="mb-1 block text-[0.75rem] font-medium text-slate-500">
                    Google Places id, this storefront
                  </label>
                  <input
                    value={placeId}
                    onChange={(e) => setPlaceId(e.target.value)}
                    placeholder="ChIJ…"
                    className={cn(inputCls, "w-full font-mono")}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="text-[0.75rem] font-medium text-slate-500">
                    Lease updated
                  </label>
                  <input
                    type="date"
                    value={leaseDate}
                    onChange={(e) => setLeaseDate(e.target.value)}
                    className={inputCls}
                  />
                  <span className="text-[0.6875rem] text-slate-400">
                    Setting this queues re-extraction of the clause record.
                  </span>
                </div>

                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Ops notes for this location."
                  className={cn(textareaCls, "w-full")}
                />

                <div className="flex items-center gap-3">
                  <Btn onClick={() => void save()}>Save location</Btn>
                  {saved && (
                    <span className="text-[0.75rem] font-medium text-emerald-600">
                      Saved
                    </span>
                  )}
                </div>
              </div>

              {/* ---- the center's sources, shared by every store in it ---- */}
              <div className="space-y-2">
                <p className="text-[0.75rem] font-semibold text-slate-700">
                  Sources for {location.centerName}
                </p>
                <p className="text-[0.6875rem] leading-snug text-slate-400">
                  Shared across every location in this center. The scan reads
                  these each pass.
                </p>
                <ul className="space-y-1.5">
                  {sources.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"
                    >
                      <p className="min-w-0 truncate font-mono text-[0.6875rem] text-slate-600">
                        <span className="mr-1.5 rounded-md bg-slate-100 px-1.5 py-0.5 text-[0.625rem] font-bold uppercase text-slate-500">
                          {s.kind}
                        </span>
                        {s.url ?? s.place_id}
                      </p>
                      <button
                        type="button"
                        onClick={() => void onSave({ action: "source_remove", id: s.id })}
                        className="text-slate-300 transition-colors hover:text-rose-600"
                        aria-label="Remove source"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                  {sources.length === 0 && (
                    <li className="rounded-xl border border-dashed border-slate-200 px-3 py-2.5 text-[0.75rem] text-slate-400">
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
                    className={cn(inputCls, "min-w-0 flex-1 font-mono text-[0.6875rem]")}
                  />
                  <Btn
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
                  </Btn>
                </div>
              </div>
            </div>

            {/* ---- the papers behind this location ---- */}
            <div
              className="mt-5 border-t border-slate-200/70 pt-4"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-[0.75rem] font-semibold text-slate-700">
                Lease papers on file
              </p>
              <p className="mt-0.5 text-[0.6875rem] leading-snug text-slate-400">
                The lease, its amendments, and any estoppels. This location&#8217;s
                clause record is extracted from these, so an amendment landing
                here is what triggers re-extraction.
              </p>
              <ul className="mt-2 space-y-1.5">
                {(docs ?? []).map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"
                  >
                    <p className="min-w-0 truncate text-[0.75rem] text-slate-600">
                      <span className="mr-1.5 rounded-md bg-slate-100 px-1.5 py-0.5 text-[0.625rem] font-bold uppercase text-slate-500">
                        {d.kind}
                      </span>
                      {d.filename}
                      <span className="ml-1.5 text-[0.6875rem] text-slate-400">
                        {fmtSize(d.byte_size)} ·{" "}
                        {new Date(d.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </p>
                    <span className="flex shrink-0 items-center gap-2.5">
                      <a
                        href={`/admin/api/documents?id=${d.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[0.75rem] font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        View
                      </a>
                      <button
                        type="button"
                        onClick={async () => {
                          await fetch(
                            `/admin/api/documents?id=${d.id}&org=${encodeURIComponent(orgSlug)}`,
                            { method: "DELETE" },
                          );
                          void loadDocs();
                        }}
                        className="text-slate-300 transition-colors hover:text-rose-600"
                        aria-label="Remove document"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  </li>
                ))}
                {docs !== null && docs.length === 0 && (
                  <li className="rounded-xl border border-dashed border-slate-200 px-3 py-2.5 text-[0.75rem] text-slate-400">
                    Nothing on file yet. Until the papers are here, the clause
                    record rests on the client&#8217;s abstract alone.
                  </li>
                )}
              </ul>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <select
                  value={docKind}
                  onChange={(e) => setDocKind(e.target.value)}
                  className={selectCls}
                >
                  {["lease", "amendment", "estoppel", "other"].map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
                <label className="inline-flex h-10 cursor-pointer items-center rounded-xl border border-slate-200 bg-white px-4 text-[0.8125rem] font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 active:scale-95">
                  {docBusy ? "Uploading…" : "Upload a document"}
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                    className="hidden"
                    disabled={docBusy}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void upload(f);
                      e.target.value = "";
                    }}
                  />
                </label>
                {docError && (
                  <span className="text-[0.6875rem] text-rose-600">{docError}</span>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/* ------------------------------------------------------------------
   the account facts
   ------------------------------------------------------------------ */

function AccountEditor({
  account,
  onSave,
}: {
  account: {
    accountManager: string | null;
    contractStart: string | null;
    contractRenewal: string | null;
  };
  onSave: (v: {
    accountManager: string;
    contractStart: string;
    contractRenewal: string;
  }) => void;
}) {
  const [am, setAm] = useState(account.accountManager ?? "");
  const [start, setStart] = useState(account.contractStart ?? "");
  const [renewal, setRenewal] = useState(account.contractRenewal ?? "");

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label className="mb-1 block text-[0.75rem] font-medium text-slate-500">
          Account manager
        </label>
        <input
          value={am}
          onChange={(e) => setAm(e.target.value)}
          placeholder="Who owns this client"
          className={cn(inputCls, "w-52")}
        />
      </div>
      <div>
        <label className="mb-1 block text-[0.75rem] font-medium text-slate-500">
          Contract start
        </label>
        <input
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className={inputCls}
        />
      </div>
      <div>
        <label className="mb-1 block text-[0.75rem] font-medium text-slate-500">
          Renewal
        </label>
        <input
          type="date"
          value={renewal}
          onChange={(e) => setRenewal(e.target.value)}
          className={inputCls}
        />
      </div>
      <Btn
        variant="secondary"
        onClick={() =>
          onSave({ accountManager: am, contractStart: start, contractRenewal: renewal })
        }
      >
        Save account
      </Btn>
    </div>
  );
}
