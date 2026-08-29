"use client";

import { useState } from "react";

export function JoinForm({
  token,
  email,
  name: initialName,
}: {
  token: string;
  email: string;
  name: string;
}) {
  const [name, setName] = useState(initialName);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/join/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name, password }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) {
        setErr(d?.error ?? "That did not work. Try again.");
        return;
      }
      window.location.href = "/app";
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-6 space-y-3">
      <div>
        <label className="text-[0.75rem] font-semibold text-slate-500">
          Email
        </label>
        <input
          value={email}
          disabled
          className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-[0.875rem] text-slate-500"
        />
      </div>
      <div>
        <label className="text-[0.75rem] font-semibold text-slate-500">
          Your name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[0.875rem] text-slate-900 shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 focus:outline-none"
        />
      </div>
      <div>
        <label className="text-[0.75rem] font-semibold text-slate-500">
          Choose a password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={10}
          placeholder="At least 10 characters"
          className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[0.875rem] text-slate-900 shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 focus:outline-none"
        />
      </div>
      {err && (
        <p className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-[0.8125rem] text-rose-700">
          {err}
        </p>
      )}
      <button
        type="submit"
        disabled={busy || !name.trim() || password.length < 10}
        className="mt-2 inline-flex h-10 w-full items-center justify-center rounded-xl bg-indigo-600 text-[0.875rem] font-semibold text-white shadow-md shadow-indigo-500/30 transition-all hover:bg-indigo-500 active:scale-[0.99] disabled:opacity-50"
      >
        {busy ? "Joining…" : "Join the account"}
      </button>
    </form>
  );
}
