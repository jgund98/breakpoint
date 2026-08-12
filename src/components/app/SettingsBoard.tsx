"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Building2,
  Check,
  Lock,
  Mail,
  MessageSquare,
  Plus,
  Send,
  ShieldCheck,
  Smartphone,
  Users,
} from "lucide-react";
import {
  ALERT_META,
  type AlertKind,
  type Member,
  type RoleId,
  type RoutingRule,
  type Thread,
  ROLES,
  THREAD_META,
  defaultRouting,
  members as seedMembers,
  threads as seedThreads,
} from "@/lib/team";
import { PERMISSION_LABEL } from "@/lib/team";
import { prettyDate, shortDate } from "@/lib/clause";
import { org } from "@/lib/portfolio";
import { contract } from "@/lib/value";
import { cn } from "@/lib/cn";
import {
  ActionButton,
  KeyValue,
  Note,
  PageHead,
  Panel,
  PanelHead,
  Pill,
  type Tone,
} from "./ui";

const TABS = [
  { id: "team", label: "Team and roles", Icon: Users },
  { id: "alerts", label: "Alerts", Icon: Mail },
  { id: "messages", label: "Messages", Icon: MessageSquare },
  { id: "account", label: "Account", Icon: Building2 },
  { id: "security", label: "Data and security", Icon: Lock },
] as const;

type TabId = (typeof TABS)[number]["id"];

/** Column headers for the permission matrix. Truncating the full label
 *  to its first word turned "Real estate" and "Lease administration"
 *  into "Real" and "Lease", which read as nothing. */
const ROLE_SHORT: Record<RoleId, string> = {
  owner: "Owner",
  real_estate: "Real est.",
  lease_admin: "Lease adm.",
  counsel: "Legal",
  signatory: "Signatory",
  viewer: "Viewer",
};

export function SettingsBoard() {
  const [tab, setTab] = useState<TabId>("team");
  const [members, setMembers] = useState<Member[]>(seedMembers);
  const [routing, setRouting] = useState<RoutingRule[]>(defaultRouting);
  const [threads, setThreads] = useState<Thread[]>(seedThreads);
  const [inviting, setInviting] = useState(false);

  const openThreads = threads.filter((t) => t.status !== "resolved").length;

  return (
    <div className="space-y-5">
      <PageHead
        eyebrow="Act"
        title="Settings"
        lede="Who can do what, who hears about it, and how to reach us."
      />

      {/* tabs */}
      <div className="scroll-x-clean flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "relative flex items-center gap-2 rounded-t-lg px-3.5 py-2.5 text-[0.8125rem] font-medium whitespace-nowrap transition-colors duration-250",
                active ? "text-petrol-800" : "text-muted hover:text-ink",
              )}
            >
              <t.Icon className="h-3.5 w-3.5" />
              {t.label}
              {t.id === "messages" && openThreads > 0 && (
                <span className="tnum rounded bg-brass-500 px-1.5 py-0.5 text-[0.625rem] font-bold text-petrol-950">
                  {openThreads}
                </span>
              )}
              {active && (
                <motion.span
                  layoutId="settings-tab"
                  className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-petrol-700"
                />
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.25 }}
          className="space-y-4"
        >
          {tab === "team" && (
            <TeamTab
              members={members}
              onRole={(id, role) =>
                setMembers((m) =>
                  m.map((x) => (x.id === id ? { ...x, role } : x)),
                )
              }
              onInvite={() => setInviting(true)}
              onRemove={(id) => setMembers((m) => m.filter((x) => x.id !== id))}
            />
          )}
          {tab === "alerts" && (
            <AlertsTab routing={routing} onChange={setRouting} members={members} />
          )}
          {tab === "messages" && (
            <MessagesTab threads={threads} onThreads={setThreads} />
          )}
          {tab === "account" && <AccountTab />}
          {tab === "security" && <SecurityTab />}
        </motion.div>
      </AnimatePresence>

      <InviteDrawer
        open={inviting}
        onClose={() => setInviting(false)}
        onSave={(m) => {
          setMembers((prev) => [...prev, m]);
          setInviting(false);
        }}
      />
    </div>
  );
}

/* ==================================================================
   team
   ================================================================== */

function TeamTab({
  members,
  onRole,
  onInvite,
  onRemove,
}: {
  members: Member[];
  onRole: (id: string, role: RoleId) => void;
  onInvite: () => void;
  onRemove: (id: string) => void;
}) {
  const signatories = members.filter(
    (m) => m.role === "signatory" || m.role === "owner",
  );
  const reviewers = members.filter(
    (m) => m.role === "counsel" || m.role === "owner",
  );

  return (
    <>
      {(signatories.length === 0 || reviewers.length === 0) && (
        <Note tone="clay" title="Your notice workflow is incomplete">
          {signatories.length === 0 &&
            "Nobody can record a notice as served, so a verified finding cannot be actioned. "}
          {reviewers.length === 0 &&
            "Nobody can approve a package after review, so nothing reaches a signatory."}
        </Note>
      )}

      <Panel flush>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
          <PanelHead
            title="Team"
            hint="Roles map onto the notice workflow. Only a signatory can record a notice as served."
          />
          <ActionButton onClick={onInvite}>
            <Plus className="h-4 w-4" />
            Invite
          </ActionButton>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="border-y border-line bg-surface-sunk/50">
                {["Person", "Role", "Can serve notices", "Last active", ""].map((h) => (
                  <th key={h} className="label px-4 py-2.5 font-semibold text-faint">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {members.map((m) => {
                const canServe = ROLES[m.role].permissions.includes("serve_notice");
                return (
                  <tr key={m.id} className="hover:bg-petrol-50/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-petrol-50 text-[0.6875rem] font-semibold text-petrol-800">
                          {m.initials}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[0.875rem] font-medium text-ink">
                            {m.name}
                            {m.status === "invited" && (
                              <Pill tone="watch" className="ml-2">
                                Invited
                              </Pill>
                            )}
                          </p>
                          <p className="text-[0.75rem] text-muted">{m.title}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={m.role}
                        onChange={(e) => onRole(m.id, e.target.value as RoleId)}
                        className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[0.8125rem] font-medium text-ink focus:border-petrol-500 focus:outline-none"
                      >
                        {(Object.keys(ROLES) as RoleId[]).map((r) => (
                          <option key={r} value={r}>
                            {ROLES[r].label}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 max-w-[220px] text-[0.75rem] leading-snug text-muted">
                        {ROLES[m.role].blurb}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {canServe ? (
                        <Pill tone="brass" dot>
                          Yes
                        </Pill>
                      ) : (
                        <span className="text-[0.8125rem] text-faint">No</span>
                      )}
                    </td>
                    <td className="tnum px-4 py-3 text-[0.8125rem] text-muted">
                      {m.lastActive ? shortDate(m.lastActive) : "Not yet"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onRemove(m.id)}
                        className="text-[0.8125rem] font-medium text-muted transition-colors hover:text-clay-600"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel>
        <PanelHead
          title="What each role can do"
          hint="Separation of duties is deliberate. Legal reviews, a signatory serves, and no single person does both."
        />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left">
            <thead>
              <tr>
                <th className="label py-2 pr-4 font-semibold text-faint">Permission</th>
                {(Object.keys(ROLES) as RoleId[]).map((r) => (
                  <th
                    key={r}
                    className="label px-2 py-2 text-center font-semibold text-faint"
                  >
                    {ROLE_SHORT[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(Object.keys(PERMISSION_LABEL) as (keyof typeof PERMISSION_LABEL)[]).map(
                (p) => (
                  <tr key={p}>
                    <td className="py-2 pr-4 text-[0.8125rem] text-ink-soft">
                      {PERMISSION_LABEL[p]}
                    </td>
                    {(Object.keys(ROLES) as RoleId[]).map((r) => (
                      <td key={r} className="px-2 py-2 text-center">
                        {ROLES[r].permissions.includes(p) ? (
                          <Check className="mx-auto h-3.5 w-3.5 text-open-600" />
                        ) : (
                          <span className="text-faint">·</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

/* ==================================================================
   alerts
   ================================================================== */

function AlertsTab({
  routing,
  onChange,
  members,
}: {
  routing: RoutingRule[];
  onChange: (r: RoutingRule[]) => void;
  members: Member[];
}) {
  const set = (kind: AlertKind, patch: Partial<RoutingRule>) =>
    onChange(routing.map((r) => (r.kind === kind ? { ...r, ...patch } : r)));

  const countFor = (roles: RoleId[]) =>
    members.filter((m) => roles.includes(m.role) && m.status === "active").length;

  return (
    <>
      <Note tone="petrol" title="Delivery is not wired yet">
        Routing is captured here and will drive email and SMS once those
        channels are connected. Until then every alert still lands in the
        product and is recorded on the Activity page.
      </Note>

      <Panel flush>
        <div className="px-5 pt-5">
          <PanelHead
            title="Alert routing"
            hint="What we tell you, how it reaches you, and who gets it."
          />
        </div>
        <div className="mt-4 divide-y divide-line">
          {routing.map((rule) => {
            const meta = ALERT_META[rule.kind];
            const recipients = countFor(rule.roles);
            return (
              <div key={rule.kind} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 max-w-md">
                    <div className="flex items-center gap-2">
                      <Pill
                        tone={
                          (meta.severity === "critical"
                            ? "clay"
                            : meta.severity === "action"
                              ? "brass"
                              : "muted") as Tone
                        }
                        dot
                      >
                        {meta.severity}
                      </Pill>
                      <p className="text-[0.875rem] font-semibold text-ink">
                        {meta.label}
                      </p>
                    </div>
                    <p className="mt-1 text-[0.8125rem] leading-snug text-muted">
                      {meta.blurb}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {(
                      [
                        ["email", Mail, rule.email],
                        ["sms", Smartphone, rule.sms],
                        ["inApp", MessageSquare, rule.inApp],
                      ] as const
                    ).map(([key, Icon, on]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => set(rule.kind, { [key]: !on })}
                        aria-pressed={on}
                        aria-label={`${key} for ${meta.label}`}
                        className={cn(
                          "grid h-9 w-9 place-items-center rounded-lg border transition-colors duration-200",
                          on
                            ? "border-petrol-600 bg-petrol-50 text-petrol-700"
                            : "border-line bg-surface text-faint hover:border-petrol-300",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {(Object.keys(ROLES) as RoleId[]).map((r) => {
                    const on = rule.roles.includes(r);
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() =>
                          set(rule.kind, {
                            roles: on
                              ? rule.roles.filter((x) => x !== r)
                              : [...rule.roles, r],
                          })
                        }
                        className={cn(
                          "rounded-md px-2 py-1 text-[0.75rem] font-medium transition-colors duration-200",
                          on
                            ? "bg-petrol-800 text-cream"
                            : "bg-surface-sunk text-muted hover:text-ink",
                        )}
                      >
                        {ROLES[r].label}
                      </button>
                    );
                  })}
                  <span className="ml-1 text-[0.75rem] text-faint">
                    {recipients} {recipients === 1 ? "person" : "people"}
                  </span>
                </div>

                {rule.roles.length === 0 && (
                  <p className="mt-2 text-[0.75rem] font-medium text-clay-600">
                    Nobody receives this. A critical alert with no recipient is
                    the same as no alert.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </Panel>
    </>
  );
}

/* ==================================================================
   messages
   ================================================================== */

function MessagesTab({
  threads,
  onThreads,
}: {
  threads: Thread[];
  onThreads: (t: Thread[]) => void;
}) {
  const [activeId, setActiveId] = useState(threads[0]?.id ?? "");
  const [draft, setDraft] = useState("");
  const active = threads.find((t) => t.id === activeId) ?? threads[0];

  const send = () => {
    if (!draft.trim() || !active) return;
    onThreads(
      threads.map((t) =>
        t.id === active.id
          ? {
              ...t,
              status: "with_breakpoint",
              messages: [
                ...t.messages,
                {
                  id: `m${t.messages.length + 1}`,
                  from: "client",
                  author: "S. Aggarwal",
                  at: "2026-08-04",
                  body: draft.trim(),
                },
              ],
            }
          : t,
      ),
    );
    setDraft("");
  };

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {(Object.keys(THREAD_META) as (keyof typeof THREAD_META)[]).map((k) => (
          <button
            key={k}
            type="button"
            className="rounded-xl border border-line bg-surface p-3.5 text-left transition-colors duration-200 hover:border-petrol-300 hover:bg-petrol-50/40"
          >
            <p className="text-[0.8125rem] font-semibold text-ink">
              {THREAD_META[k].label}
            </p>
            <p className="mt-1 text-[0.75rem] leading-snug text-muted">
              {THREAD_META[k].blurb}
            </p>
            <p className="mt-1.5 text-[0.6875rem] font-medium text-petrol-700">
              {THREAD_META[k].sla}
            </p>
          </button>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-[300px_minmax(0,1fr)]">
        <Panel flush className="overflow-hidden">
          <div className="border-b border-line px-4 py-3">
            <p className="text-[0.8125rem] font-semibold text-ink">Threads</p>
          </div>
          <ul className="divide-y divide-line">
            {threads.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(t.id)}
                  className={cn(
                    "w-full px-4 py-3 text-left transition-colors duration-200",
                    t.id === active?.id ? "bg-petrol-50" : "hover:bg-surface-sunk",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Pill
                      tone={
                        (t.status === "resolved"
                          ? "open"
                          : t.status === "with_client"
                            ? "clay"
                            : "watch") as Tone
                      }
                    >
                      {t.status === "with_client"
                        ? "Needs you"
                        : t.status === "with_breakpoint"
                          ? "With us"
                          : t.status}
                    </Pill>
                    <span className="text-[0.6875rem] text-faint">{t.id}</span>
                  </div>
                  <p className="mt-1.5 text-[0.8125rem] leading-snug font-medium text-ink">
                    {t.subject}
                  </p>
                  <p className="mt-0.5 text-[0.75rem] text-muted">
                    {THREAD_META[t.kind].label} · {shortDate(t.opened)}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel flush className="flex min-h-[440px] flex-col">
          {active ? (
            <>
              <div className="border-b border-line px-5 py-4">
                <p className="text-[0.9375rem] font-semibold text-ink">
                  {active.subject}
                </p>
                <p className="mt-0.5 text-[0.75rem] text-muted">
                  Opened {prettyDate(active.opened)} ·{" "}
                  {THREAD_META[active.kind].label} · target response{" "}
                  {THREAD_META[active.kind].sla.toLowerCase()}
                </p>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto p-5">
                {active.messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "flex",
                      m.from === "client" ? "justify-end" : "justify-start",
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-xl px-3.5 py-2.5",
                        m.from === "client"
                          ? "rounded-br-sm bg-petrol-800 text-cream"
                          : "rounded-bl-sm border border-line bg-surface-sunk text-ink-soft",
                      )}
                    >
                      <p className="text-[0.6875rem] font-semibold opacity-70">
                        {m.author} · {shortDate(m.at)}
                      </p>
                      <p className="mt-1 text-[0.8125rem] leading-relaxed">
                        {m.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-end gap-2 border-t border-line p-3">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={2}
                  placeholder="Reply to your account team"
                  className="flex-1 resize-none rounded-lg border border-line bg-surface px-3.5 py-2.5 text-[0.875rem] text-ink placeholder:text-faint focus:border-petrol-500 focus:outline-none"
                />
                <ActionButton onClick={send} disabled={!draft.trim()}>
                  <Send className="h-4 w-4" />
                </ActionButton>
              </div>
            </>
          ) : (
            <p className="p-10 text-center text-[0.875rem] text-muted">
              No threads yet.
            </p>
          )}
        </Panel>
      </div>
    </>
  );
}

/* ==================================================================
   account and security
   ================================================================== */

function AccountTab() {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel>
        <PanelHead title="Company" />
        <KeyValue
          className="mt-3"
          items={[
            { k: "Trade name", v: org.name },
            { k: "Sector", v: org.descriptor },
            { k: "Doors under contract", v: org.totalDoors.toLocaleString("en-US") },
            { k: "Doors with co-tenancy language", v: org.watched },
          ]}
        />
      </Panel>

      <Panel>
        <PanelHead title="Contract" />
        <KeyValue
          className="mt-3"
          items={[
            { k: "Plan", v: org.plan },
            { k: "Watching since", v: prettyDate(contract.startedOn) },
            {
              k: "Rate",
              v: `$${contract.perDoorAnnual} per watched door, per year`,
            },
            {
              k: "Annual minimum",
              v: `$${contract.floorAnnual.toLocaleString("en-US")}`,
            },
            {
              k: "Current annual fee",
              v: `$${contract.annualFee.toLocaleString("en-US")}`,
            },
          ]}
        />
      </Panel>
    </div>
  );
}

function SecurityTab() {
  return (
    <div className="space-y-4">
      <Panel>
        <PanelHead
          title="What we hold"
          hint="Everything on this list came from you and is used only to monitor your portfolio."
        />
        <ul className="mt-4 space-y-2.5">
          {[
            ["Lease documents and amendments", "Retained for the contract term plus seven years"],
            ["Location records", "Store number, address, premises area, rent"],
            ["Reported sales, where provided", "Used solely to quantify your own relief"],
            ["Evidence we gather", "Photographs, listings, filings, dated and sourced"],
            ["Correspondence", "Notices and landlord replies you send us"],
          ].map(([k, v]) => (
            <li key={k} className="flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-open-600" />
              <div>
                <p className="text-[0.8125rem] font-medium text-ink">{k}</p>
                <p className="text-[0.75rem] text-muted">{v}</p>
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <Note tone="clay" title="Separation from ownership interests">
        Breakpoint works for tenants. Your lease terms, sales figures and
        findings are never pooled across customers, benchmarked, or disclosed
        to any landlord, owner, investor or affiliate of ours. No investor in
        Breakpoint receives access to customer data or reporting derived from
        it. If you would like this in writing as a contractual term, ask your
        account team and we will add it.
      </Note>

      <Panel>
        <PanelHead title="Access" />
        <KeyValue
          className="mt-3"
          items={[
            { k: "Single sign-on", v: "SAML, provisioned on request" },
            { k: "Session length", v: "12 hours" },
            { k: "Audit log", v: "Every change recorded, append only" },
            { k: "Data export", v: "Full export on request, any time" },
            { k: "Deletion", v: "On termination, within 30 days" },
          ]}
        />
      </Panel>
    </div>
  );
}

/* ==================================================================
   invite
   ================================================================== */

function InviteDrawer({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (m: Member) => void;
}) {
  const [f, setF] = useState({ name: "", email: "", title: "", role: "viewer" as RoleId });
  const valid = f.name.trim().length > 1 && f.email.includes("@");

  const initials = useMemo(
    () =>
      f.name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((s) => s[0]?.toUpperCase())
        .join("") || "??",
    [f.name],
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex justify-end bg-petrol-950/35"
        >
          <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0" />
          <motion.div
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="relative h-full w-full max-w-md overflow-y-auto border-l border-line bg-canvas p-6"
          >
            <h2 className="text-[1.125rem] font-semibold text-ink">Invite someone</h2>
            <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-muted">
              They receive an email to set a password. Pick the role carefully:
              it decides whether they can approve or serve a notice.
            </p>

            <div className="mt-6 space-y-4">
              {(
                [
                  ["name", "Full name", "S. Aggarwal"],
                  ["email", "Work email", "name@company.com"],
                  ["title", "Job title", "Director, Lease Administration"],
                ] as const
              ).map(([key, label, placeholder]) => (
                <label key={key} className="block">
                  <span className="text-[0.8125rem] font-medium text-ink">{label}</span>
                  <input
                    value={f[key]}
                    onChange={(e) => setF((p) => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-[0.875rem] text-ink placeholder:text-faint focus:border-petrol-500 focus:outline-none"
                  />
                </label>
              ))}

              <div>
                <span className="text-[0.8125rem] font-medium text-ink">Role</span>
                <div className="mt-2 space-y-2">
                  {(Object.keys(ROLES) as RoleId[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setF((p) => ({ ...p, role: r }))}
                      className={cn(
                        "block w-full rounded-xl border p-3 text-left transition-colors duration-200",
                        f.role === r
                          ? "border-petrol-600 bg-petrol-50"
                          : "border-line hover:border-petrol-300",
                      )}
                    >
                      <p className="text-[0.8125rem] font-semibold text-ink">
                        {ROLES[r].label}
                      </p>
                      <p className="mt-0.5 text-[0.75rem] leading-snug text-muted">
                        {ROLES[r].blurb}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-7 flex gap-2.5">
              <ActionButton
                disabled={!valid}
                onClick={() =>
                  onSave({
                    id: `u-${Date.now()}`,
                    name: f.name.trim(),
                    email: f.email.trim(),
                    title: f.title.trim() || "Not stated",
                    role: f.role,
                    status: "invited",
                    lastActive: null,
                    initials,
                  })
                }
              >
                Send invitation
              </ActionButton>
              <ActionButton variant="quiet" onClick={onClose}>
                Cancel
              </ActionButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
