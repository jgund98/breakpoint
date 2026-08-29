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
} from "@/components/admin/ui";
import { useConsole, type StaffRow } from "@/components/admin/useConsole";

/**
 * The internal roster: everyone at Breakpoint who holds the console
 * key. Adding a person creates their account on the spot with a
 * temporary password the admin hands over directly — no email leaves
 * the system. Disabling closes the door immediately (live sessions are
 * revoked server-side) and keeps the history; the server refuses to
 * disable the last active account or your own.
 */
export function StaffPanel() {
  const { data, post } = useConsole();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const staff = data?.staff ?? [];

  const add = async () => {
    setError(null);
    setNote(null);
    const r = await post({ action: "staff_add", name, email, title, password });
    if (!r.ok) {
      setError(
        (r.data as { error?: string } | null)?.error ?? "That did not save.",
      );
      return;
    }
    setNote(
      `${name.trim()} can sign in at /login with that temporary password. Hand it over directly; nothing was emailed.`,
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
    setError(
      r.ok ? null : ((r.data as { error?: string } | null)?.error ?? "Failed."),
    );
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
              Everyone here can open this console, work every client, and
              manage this roster. Client-side people never appear on this
              list; they live under their own workspace on the Clients board.
            </p>
          </div>
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
                    </span>
                    <Badge tone={s.disabled_at ? "slate" : "emerald"} dot>
                      {s.disabled_at ? "Disabled" : "Active"}
                    </Badge>
                  </span>
                  <span className="block truncate text-[0.75rem] text-slate-500">
                    {s.email}
                    {s.title ? ` · ${s.title}` : ""}
                  </span>
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {!s.disabled_at && (
                  <button
                    type="button"
                    onClick={() => void resetPassword(s)}
                    className="inline-flex items-center gap-1 text-[0.75rem] font-semibold text-slate-500 transition-colors hover:text-slate-900"
                  >
                    <KeyRound className="h-3.5 w-3.5" /> Reset password
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    void post({
                      action: s.disabled_at ? "staff_enable" : "staff_disable",
                      id: s.id,
                    }).then((r) =>
                      setError(
                        r.ok
                          ? null
                          : ((r.data as { error?: string } | null)?.error ??
                              "Failed."),
                      ),
                    )
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
              </span>
            </li>
          ))}
          {staff.length === 0 && data && (
            <li className="px-6 py-4">
              <EmptyNote>No internal accounts yet.</EmptyNote>
            </li>
          )}
        </ul>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="flex items-center gap-2 text-[0.9375rem] font-semibold text-slate-900">
            <UserPlus className="h-4 w-4 text-indigo-600" />
            Add a teammate
          </h2>
          <p className="mt-0.5 max-w-[52rem] text-[0.8125rem] leading-snug text-slate-500">
            The account works immediately. Set a temporary password and hand
            it to them directly; they change it once they are in. If the
            email already belongs to a client-side user, that person is
            promoted and keeps their existing password.
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
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Temporary password (10+ characters)"
            type="text"
            className={inputCls}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
          <Btn disabled={!name.trim() || !email.trim()} onClick={() => void add()}>
            Create account
          </Btn>
          {error && (
            <p className="text-[0.8125rem] font-medium text-rose-600">{error}</p>
          )}
          {note && !error && (
            <p className="text-[0.8125rem] font-medium text-emerald-700">{note}</p>
          )}
        </div>
      </Card>
    </div>
  );
}
