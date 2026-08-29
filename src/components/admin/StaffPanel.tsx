"use client";

import { useState } from "react";
import { KeyRound, ShieldCheck, UserPlus } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  Badge,
  Btn,
  Card,
  EmptyNote,
  inputCls,
  Monogram,
  selectCls,
  type BadgeTone,
} from "@/components/admin/ui";
import {
  useConsole,
  type StaffRole,
  type StaffRow,
} from "@/components/admin/useConsole";

/**
 * The internal roster: everyone at Breakpoint who holds a console key,
 * at one of three permission levels. Adding a person creates their
 * account on the spot with a temporary password the admin hands over
 * directly — no email leaves the system. Disabling closes the door
 * immediately (live sessions are revoked server-side) and keeps the
 * history; the server refuses to disable the last active
 * administrator, your own account, or your own permission level.
 * Everything below is display; the /admin/api route enforces each rule
 * again server-side.
 */

const ROLE_META: Record<StaffRole, { label: string; tone: BadgeTone; blurb: string }> = {
  admin: {
    label: "Administrator",
    tone: "indigo",
    blurb: "Everything: clients, queues, the roster, system programming.",
  },
  operator: {
    label: "Operator",
    tone: "sky",
    blurb: "Works the queues and client boards. Cannot manage people or clients.",
  },
  observer: {
    label: "Observer",
    tone: "slate",
    blurb: "Sees the whole console. Writes nothing.",
  },
};

export function StaffPanel() {
  const { data, post } = useConsole();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [role, setRole] = useState<StaffRole>("operator");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const staff = data?.staff ?? [];
  const isAdmin = (data?.yourStaffRole ?? "admin") === "admin";
  const me = data?.yourEmail ?? "";

  const fail = (r: { ok: boolean; data: unknown }) =>
    setError(
      r.ok ? null : ((r.data as { error?: string } | null)?.error ?? "Failed."),
    );

  const add = async () => {
    setError(null);
    setNote(null);
    const r = await post({
      action: "staff_add",
      name,
      email,
      title,
      role,
      password,
    });
    if (!r.ok) {
      fail(r);
      return;
    }
    setNote(
      `${name.trim()} can sign in at /login as ${ROLE_META[role].label.toLowerCase()} with that temporary password. Hand it over directly; nothing was emailed.`,
    );
    setName("");
    setEmail("");
    setTitle("");
    setPassword("");
  };

  const resetPassword = async (row: StaffRow) => {
    const password = window.prompt(
      `New temporary password for ${row.email} (10+ characters). Their current sessions end immediately.`,
    );
    if (!password) return;
    const r = await post({ action: "staff_password", id: row.id, password });
    fail(r);
    if (r.ok) setNote(`Password reset for ${row.email}. Hand it over directly.`);
  };

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-[0.9375rem] font-semibold text-slate-900">
              <ShieldCheck className="h-4 w-4 text-indigo-600" />
              Internal team
            </h2>
            <p className="mt-0.5 max-w-[52rem] text-[0.8125rem] leading-snug text-slate-500">
              Everyone here can open this console at their permission level.
              Client-side people never appear on this list; they live under
              their own workspace on the Clients board.
            </p>
          </div>
        </div>

        {/* the ladder, spelled out where roles get assigned */}
        <div className="grid gap-2 border-b border-slate-100 bg-slate-50/50 px-6 py-3 sm:grid-cols-3">
          {(Object.keys(ROLE_META) as StaffRole[]).map((r) => (
            <p key={r} className="text-[0.75rem] leading-snug text-slate-500">
              <span className="font-semibold text-slate-700">
                {ROLE_META[r].label}
              </span>: {ROLE_META[r].blurb}
            </p>
          ))}
        </div>

        <ul className="divide-y divide-slate-100">
          {staff.map((s) => (
            <li
              key={s.id}
              className={cn(
                "flex flex-wrap items-center justify-between gap-3 px-6 py-3.5",
                s.disabled_at && "bg-slate-50/60",
              )}
            >
              <span className="flex min-w-0 items-center gap-3">
                <Monogram name={s.name} className={s.disabled_at ? "opacity-40" : ""} />
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-[0.875rem] font-semibold",
                        s.disabled_at ? "text-slate-400" : "text-slate-900",
                      )}
                    >
                      {s.name}
                      {s.email === me && (
                        <span className="ml-1.5 text-[0.6875rem] font-medium text-slate-400">
                          (you)
                        </span>
                      )}
                    </span>
                    <Badge tone={s.disabled_at ? "slate" : ROLE_META[s.staff_role].tone} dot>
                      {ROLE_META[s.staff_role].label}
                    </Badge>
                    {s.disabled_at && <Badge tone="slate">Disabled</Badge>}
                  </span>
                  <span className="block truncate text-[0.75rem] text-slate-500">
                    {s.email}
                    {s.title ? ` · ${s.title}` : ""}
                  </span>
                </span>
              </span>
              {isAdmin && (
                <span className="flex shrink-0 items-center gap-3">
                  {!s.disabled_at && s.email !== me && (
                    <select
                      value={s.staff_role}
                      aria-label={`Permission level for ${s.name}`}
                      onChange={(e) =>
                        void post({
                          action: "staff_role",
                          id: s.id,
                          role: e.target.value,
                        }).then(fail)
                      }
                      className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[0.75rem] font-medium text-slate-700 focus:border-indigo-400 focus:outline-none"
                    >
                      <option value="admin">Administrator</option>
                      <option value="operator">Operator</option>
                      <option value="observer">Observer</option>
                    </select>
                  )}
                  {!s.disabled_at && (
                    <button
                      type="button"
                      onClick={() => void resetPassword(s)}
                      className="inline-flex items-center gap-1 text-[0.75rem] font-semibold text-slate-500 transition-colors hover:text-slate-900"
                    >
                      <KeyRound className="h-3.5 w-3.5" /> Reset password
                    </button>
                  )}
                  {s.email !== me && (
                    <button
                      type="button"
                      onClick={() =>
                        void post({
                          action: s.disabled_at ? "staff_enable" : "staff_disable",
                          id: s.id,
                        }).then(fail)
                      }
                      className={cn(
                        "text-[0.75rem] font-semibold transition-colors",
                        s.disabled_at
                          ? "text-emerald-600 hover:text-emerald-700"
                          : "text-rose-500 hover:text-rose-700",
                      )}
                    >
                      {s.disabled_at ? "Re-enable" : "Disable"}
                    </button>
                  )}
                </span>
              )}
            </li>
          ))}
          {staff.length === 0 && data && (
            <li className="px-6 py-4">
              <EmptyNote>No internal accounts yet.</EmptyNote>
            </li>
          )}
        </ul>
        {error && (
          <p className="border-t border-slate-100 px-6 py-3 text-[0.8125rem] font-medium text-rose-600">
            {error}
          </p>
        )}
      </Card>

      {isAdmin && (
        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="flex items-center gap-2 text-[0.9375rem] font-semibold text-slate-900">
              <UserPlus className="h-4 w-4 text-indigo-600" />
              Add a teammate
            </h2>
            <p className="mt-0.5 max-w-[52rem] text-[0.8125rem] leading-snug text-slate-500">
              The account works immediately at the level you pick. Set a
              temporary password and hand it to them directly; they change it
              once they are in. If the email already belongs to a client-side
              user, that person is promoted and keeps their existing password.
            </p>
          </div>
          <div className="grid gap-2 px-6 py-4 sm:grid-cols-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className={inputCls}
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="work@breakpoint email"
              type="email"
              className={inputCls}
            />
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title (optional)"
              className={inputCls}
            />
            <select
              value={role}
              aria-label="Permission level"
              onChange={(e) => setRole(e.target.value as StaffRole)}
              className={selectCls}
            >
              <option value="admin">Administrator: full access</option>
              <option value="operator">Operator: works the queues</option>
              <option value="observer">Observer: read-only</option>
            </select>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Temporary password (10+ characters)"
              type="text"
              className={cn(inputCls, "sm:col-span-2")}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
            <Btn disabled={!name.trim() || !email.trim()} onClick={() => void add()}>
              Create account
            </Btn>
            {note && !error && (
              <p className="text-[0.8125rem] font-medium text-emerald-700">{note}</p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
