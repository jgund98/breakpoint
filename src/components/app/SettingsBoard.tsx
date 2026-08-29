"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Building2,
  Check,
  Lock,
  Mail,
  MessageSquare,
  Plus,
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
  ROLES,
  defaultRouting,
} from "@/lib/team";
import { PERMISSION_LABEL } from "@/lib/team";
import { prettyDate, shortDate } from "@/lib/clause";

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
  /* The team is the real membership table now: loaded from and
     changed through /app/api/team, guards and audit server-side. */
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<
    { id: number; email: string; role: string; joinPath: string }[]
  >([]);
  const [teamErr, setTeamErr] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const loadTeam = async () => {
    try {
      const r = await fetch("/app/api/team", { cache: "no-store" });
      if (!r.ok) return;
      const d = await r.json();
      const DB_TO_UI: Record<string, RoleId> = {
        owner: "owner",
        admin: "real_estate",
        analyst: "lease_admin",
        counsel: "counsel",
        viewer: "viewer",
        real_estate: "real_estate",
        lease_admin: "lease_admin",
        signatory: "signatory",
      };
      setMembers(
        (d.members ?? []).map(
          (m: {
            id: string;
            name: string;
            email: string;
            title: string | null;
            role: string;
            last_active: string | null;
          }) => ({
            id: m.id,
            name: m.name,
            email: m.email,
            title: m.title ?? "",
            role: DB_TO_UI[m.role] ?? "viewer",
            status: "active" as const,
            lastActive: m.last_active ? m.last_active.slice(0, 10) : null,
            initials:
              m.name
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((s: string) => s[0]?.toUpperCase())
                .join("") || "??",
          }),
        ),
      );
      setInvitations(d.invitations ?? []);
    } catch {
      /* the tab renders empty rather than wrong */
    }
  };
  useEffect(() => {
    void loadTeam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const teamPost = async (body: Record<string, unknown>) => {
    const r = await fetch("/app/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await r.json().catch(() => null);
    setTeamErr(r.ok ? null : (d?.error ?? "That was refused."));
    await loadTeam();
    return r.ok ? d : null;
  };
  /* Alert routing is org policy on the record: loaded from and saved
     to /app/api/preferences, editable by owner/admin, enforced by the
     in-app bell. */
  const [routing, setRoutingState] = useState<RoutingRule[]>(defaultRouting);
  const [canEditRouting, setCanEditRouting] = useState(false);
  const [routingSavedAt, setRoutingSavedAt] = useState<string | null>(null);
  useEffect(() => {
    fetch("/app/api/preferences")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.routing) setRoutingState(d.routing);
        if (d) setCanEditRouting(!!d.canEdit);
      })
      .catch(() => {});
  }, []);
  const setRouting = (r: RoutingRule[]) => {
    setRoutingState(r);
    fetch("/app/api/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ routing: r }),
    })
      .then((res) =>
        setRoutingSavedAt(
          res.ok
            ? new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
            : null,
        ),
      )
      .catch(() => {});
  };
  const [inviting, setInviting] = useState(false);
  /* The account tab shows the SESSION org's facts, fetched — never a
     baked-in portfolio's. */
  const [accountLite, setAccountLite] = useState<AccountLite | null>(null);
  useEffect(() => {
    fetch("/app/api/workspace-lite")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.org) setAccountLite(d.org);
      })
      .catch(() => {});
  }, []);


  return (
    <div className="space-y-5">
      <PageHead
        eyebrow="Act"
        title="Settings"
        lede="Who can do what, who hears about it, and how to reach us."
      />

      {/* tabs: the one Segmented idiom, same as every table's views */}
      <div className="scroll-x-clean overflow-x-auto">
        <div className="flex w-fit rounded-xl bg-slate-100 p-1">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-[0.75rem] font-semibold transition-all duration-200",
                  active
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700",
                )}
              >
                <t.Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
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
            <>
              {teamErr && (
                <p className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-[0.8125rem] text-rose-700">
                  {teamErr}
                </p>
              )}
              {inviteLink && (
                <Note tone="open" title="Invitation created">
                  Email delivery is not connected, so send the join link
                  yourself:{" "}
                  <span className="font-mono text-[0.75rem] break-all">
                    {inviteLink}
                  </span>
                </Note>
              )}
              <TeamTab
                members={members}
                onRole={(id, role) =>
                  void teamPost({ action: "role", userId: id, role })
                }
                onInvite={() => setInviting(true)}
                onRemove={(id) => void teamPost({ action: "remove", userId: id })}
              />
              {invitations.length > 0 && (
                <Panel flush>
                  <div className="px-5 pt-5">
                    <PanelHead
                      title="Open invitations"
                      hint="Waiting to be accepted. The link is the delivery channel until email connects."
                    />
                  </div>
                  <ul className="mt-3 divide-y divide-slate-100">
                    {invitations.map((i) => (
                      <li
                        key={i.id}
                        className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                      >
                        <div>
                          <p className="text-[0.8125rem] font-semibold text-slate-900">
                            {i.email}
                          </p>
                          <p className="text-[0.6875rem] text-slate-400">
                            as {i.role}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className="text-[0.75rem] font-semibold text-indigo-700 hover:underline"
                            onClick={() =>
                              void navigator.clipboard?.writeText(
                                window.location.origin + i.joinPath,
                              )
                            }
                          >
                            Copy link
                          </button>
                          <button
                            type="button"
                            className="text-[0.75rem] font-semibold text-slate-400 hover:text-rose-600"
                            onClick={() =>
                              void teamPost({
                                action: "revoke",
                                invitationId: i.id,
                              })
                            }
                          >
                            Revoke
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </Panel>
              )}
            </>
          )}
          {tab === "alerts" && (
            <AlertsTab routing={routing} onChange={setRouting} members={members} canEdit={canEditRouting} savedAt={routingSavedAt} />
          )}
          {tab === "account" && <AccountTab lite={accountLite} />}
          {tab === "security" && <SecurityTab />}
        </motion.div>
      </AnimatePresence>

      <InviteDrawer
        open={inviting}
        onClose={() => setInviting(false)}
        onSave={(m) => {
          void teamPost({
            action: "invite",
            email: m.email,
            name: m.name,
            title: m.title,
            role: m.role,
          }).then((d) => {
            if (d?.joinPath)
              setInviteLink(window.location.origin + d.joinPath);
          });
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
              <tr className="border-y border-slate-200 bg-slate-100/50">
                {["Person", "Role", "Can serve notices", "Last active", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.map((m) => {
                const canServe = ROLES[m.role].permissions.includes("serve_notice");
                return (
                  <tr key={m.id} className="hover:bg-indigo-50/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-indigo-50 text-[0.6875rem] font-semibold text-indigo-800">
                          {m.initials}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[0.875rem] font-medium text-slate-900">
                            {m.name}
                            {m.status === "invited" && (
                              <Pill tone="watch" className="ml-2">
                                Invited
                              </Pill>
                            )}
                          </p>
                          <p className="text-[0.75rem] text-slate-500">{m.title}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={m.role}
                        onChange={(e) => onRole(m.id, e.target.value as RoleId)}
                        className="rounded-xl border border-slate-200 bg-white shadow-sm px-2.5 py-1.5 text-[0.8125rem] font-medium text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 focus:outline-none"
                      >
                        {(Object.keys(ROLES) as RoleId[]).map((r) => (
                          <option key={r} value={r}>
                            {ROLES[r].label}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 max-w-[220px] text-[0.75rem] leading-snug text-slate-500">
                        {ROLES[m.role].blurb}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {canServe ? (
                        <Pill tone="brass" dot>
                          Yes
                        </Pill>
                      ) : (
                        <span className="text-[0.8125rem] text-slate-400">No</span>
                      )}
                    </td>
                    <td className="tnum px-4 py-3 text-[0.8125rem] text-slate-500">
                      {m.lastActive ? shortDate(m.lastActive) : "Not yet"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onRemove(m.id)}
                        className="text-[0.8125rem] font-medium text-slate-500 transition-colors hover:text-rose-600"
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
                <th className="label py-2 pr-4 font-semibold text-slate-400">Permission</th>
                {(Object.keys(ROLES) as RoleId[]).map((r) => (
                  <th
                    key={r}
                    className="px-2 py-3 text-center text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-400"
                  >
                    {ROLE_SHORT[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(Object.keys(PERMISSION_LABEL) as (keyof typeof PERMISSION_LABEL)[]).map(
                (p) => (
                  <tr key={p}>
                    <td className="py-2 pr-4 text-[0.8125rem] text-slate-700">
                      {PERMISSION_LABEL[p]}
                    </td>
                    {(Object.keys(ROLES) as RoleId[]).map((r) => (
                      <td key={r} className="px-2 py-2 text-center">
                        {ROLES[r].permissions.includes(p) ? (
                          <Check className="mx-auto h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <span className="text-slate-400">·</span>
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
  canEdit,
  savedAt,
}: {
  routing: RoutingRule[];
  onChange: (r: RoutingRule[]) => void;
  members: Member[];
  canEdit: boolean;
  savedAt: string | null;
}) {
  const set = (kind: AlertKind, patch: Partial<RoutingRule>) =>
    onChange(routing.map((r) => (r.kind === kind ? { ...r, ...patch } : r)));

  const countFor = (roles: RoleId[]) =>
    members.filter((m) => roles.includes(m.role) && m.status === "active").length;

  return (
    <>
      <Note tone="petrol" title="Org policy, on the record">
        Routing is saved to your account and audited. The in-app lane is
        enforced now: turn it off for an alert and that alert leaves the
        bell for everyone here. Email and SMS are stored and activate the
        moment a delivery channel is connected.
        {savedAt ? ` Saved ${savedAt}.` : ""}
        {canEdit ? "" : " Changing routing requires an owner or admin."}
      </Note>

      <Panel flush>
        <div className="px-5 pt-5">
          <PanelHead
            title="Alert routing"
            hint="What we tell you, how it reaches you, and who gets it."
          />
        </div>
        <div className="mt-4 divide-y divide-slate-100">
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
                      <p className="text-[0.875rem] font-semibold text-slate-900">
                        {meta.label}
                      </p>
                    </div>
                    <p className="mt-1 text-[0.8125rem] leading-snug text-slate-500">
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
                        onClick={() => canEdit && set(rule.kind, { [key]: !on })}
                        disabled={!canEdit}
                        aria-pressed={on}
                        aria-label={`${key} for ${meta.label}`}
                        className={cn(
                          "grid h-9 w-9 place-items-center rounded-lg border transition-colors duration-200",
                          on
                            ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                            : "border-slate-200 bg-white text-slate-400 hover:border-indigo-300",
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
                          "rounded-lg px-2 py-1 text-[0.75rem] font-medium transition-colors duration-200",
                          on
                            ? "bg-indigo-800 text-white"
                            : "bg-slate-100 text-slate-500 hover:text-slate-900",
                        )}
                      >
                        {ROLES[r].label}
                      </button>
                    );
                  })}
                  <span className="ml-1 text-[0.75rem] text-slate-400">
                    {recipients} {recipients === 1 ? "person" : "people"}
                  </span>
                </div>

                {rule.roles.length === 0 && (
                  <p className="mt-2 text-[0.75rem] font-medium text-rose-600">
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
   account and security
   ================================================================== */

type AccountLite = {
  name: string;
  watched: number;
  centers: number;
  descriptor: string;
  totalDoors: number;
  plan: string;
  contractStart: string;
};

function AccountTab({ lite }: { lite: AccountLite | null }) {
  if (!lite) return <div className="shimmer h-40 rounded-2xl" />;
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel>
        <PanelHead title="Company" />
        <KeyValue
          className="mt-3"
          items={[
            { k: "Trade name", v: lite.name },
            { k: "Sector", v: lite.descriptor },
            { k: "Doors under contract", v: lite.totalDoors.toLocaleString("en-US") },
            { k: "Doors with co-tenancy language", v: lite.watched },
          ]}
        />
      </Panel>

      <Panel>
        <PanelHead title="Contract" />
        <KeyValue
          className="mt-3"
          items={[
            { k: "Plan", v: lite.plan },
            { k: "Watching since", v: prettyDate(lite.contractStart) },
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
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <div>
                <p className="text-[0.8125rem] font-medium text-slate-900">{k}</p>
                <p className="text-[0.75rem] text-slate-500">{v}</p>
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
            className="relative h-full w-full max-w-md overflow-y-auto border-l border-slate-200 bg-white p-6"
          >
            <h2 className="text-[1.125rem] font-semibold text-slate-900">Invite someone</h2>
            <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-slate-500">
              You get a join link to send them — email delivery connects
              later. The link sets their password and signs them in. Pick
              the role carefully: it decides whether they can approve or
              serve a notice.
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
                  <span className="text-[0.8125rem] font-medium text-slate-900">{label}</span>
                  <input
                    value={f[key]}
                    onChange={(e) => setF((p) => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white shadow-sm px-3.5 py-2.5 text-[0.875rem] text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 focus:outline-none"
                  />
                </label>
              ))}

              <div>
                <span className="text-[0.8125rem] font-medium text-slate-900">Role</span>
                <div className="mt-2 space-y-2">
                  {(Object.keys(ROLES) as RoleId[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setF((p) => ({ ...p, role: r }))}
                      className={cn(
                        "block w-full rounded-xl border p-3 text-left transition-colors duration-200",
                        f.role === r
                          ? "border-indigo-600 bg-indigo-50"
                          : "border-slate-200 hover:border-indigo-300",
                      )}
                    >
                      <p className="text-[0.8125rem] font-semibold text-slate-900">
                        {ROLES[r].label}
                      </p>
                      <p className="mt-0.5 text-[0.75rem] leading-snug text-slate-500">
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
