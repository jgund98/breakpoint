"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

export function UnlockForm({ next }: { next?: string }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError(false);
    const res = await fetch("/unlock/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      window.location.href = next && next.startsWith("/") ? next : "/";
      return;
    }
    setBusy(false);
    setError(true);
  };

  return (
    <form onSubmit={submit} className="mt-7">
      <label htmlFor="gate-password" className="sr-only">
        Access password
      </label>
      <input
        id="gate-password"
        type="password"
        autoFocus
        autoComplete="current-password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          setError(false);
        }}
        placeholder="Access password"
        className={cn(
          "w-full rounded-xl border bg-white/5 px-5 py-3.5 text-center text-base text-cream placeholder:text-cream-faint focus:outline-none",
          error
            ? "border-clay-500 focus:border-clay-500"
            : "border-white/20 focus:border-brass-400",
        )}
      />
      {error && (
        <p className="mt-2.5 text-sm text-clay-500">
          That password isn&#8217;t right. Try again.
        </p>
      )}
      <button
        type="submit"
        disabled={busy || !password}
        className="mt-3 w-full rounded-xl bg-brass-500 px-5 py-3.5 text-base font-semibold whitespace-nowrap text-petrol-950 transition-colors hover:bg-brass-400 disabled:opacity-50"
      >
        {busy ? "Checking…" : "Enter"}
      </button>
    </form>
  );
}
