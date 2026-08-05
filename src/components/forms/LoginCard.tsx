"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { LogoBadge, LogoWord } from "@/components/brand/Logo";

/**
 * Workspace sign-in.
 *
 * Backed by a hardcoded demo credential so the product can be walked
 * through in a pitch. See src/lib/session.ts: this is not real
 * authentication and every sign-in lands in the same sample portfolio.
 */
export function LoginCard() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/app";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(false);
    setBusy(true);

    try {
      const res = await fetch("/login/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        // Tells the workspace to play its boot sequence once on arrival.
        window.sessionStorage.setItem("bp_boot", "1");
        router.push(next.startsWith("/") ? next : "/app");
        router.refresh();
        return;
      }
      setError("That email and password combination was not recognised.");
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="rounded-xl border border-line bg-surface p-8 text-ink lift-lg sm:p-10">
        <div className="flex flex-col items-center text-center">
          <LogoBadge className="h-12 w-12" />
          <LogoWord className="mt-4 text-[1.625rem]" />
          <p className="mt-2 text-sm text-muted">Sign in to your workspace</p>
        </div>

        <form className="mt-8 space-y-4" onSubmit={submit}>
          <label className="block">
            <span className="text-sm font-medium text-ink">Work email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@company.com"
              className="mt-2 w-full rounded-lg border border-line bg-canvas px-4 py-3 text-[1rem] text-ink outline-none transition-colors placeholder:text-faint focus:border-petrol-600"
            />
          </label>
          <label className="block">
            <span className="flex items-baseline justify-between">
              <span className="text-sm font-medium text-ink">Password</span>
              <span className="cursor-default text-xs text-petrol-700">
                Forgot?
              </span>
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
              className="mt-2 w-full rounded-lg border border-line bg-canvas px-4 py-3 text-[1rem] text-ink outline-none transition-colors placeholder:text-faint focus:border-petrol-600"
            />
          </label>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-petrol-800 px-6 py-3.5 text-[0.9375rem] font-semibold whitespace-nowrap text-cream transition-colors hover:bg-petrol-700 disabled:opacity-60"
          >
            {busy ? "Signing in" : "Sign in"}
          </button>

          <button
            type="button"
            onClick={() => setNotice(true)}
            className="w-full rounded-full border border-line bg-surface px-6 py-3.5 text-[0.9375rem] font-medium whitespace-nowrap text-ink-soft transition-colors hover:border-petrol-300 hover:bg-petrol-50"
          >
            Continue with SSO
          </button>
        </form>

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <span className="mt-4 block rounded-lg bg-clay-50 px-4 py-3 text-sm leading-relaxed text-clay-700">
                {error}
              </span>
            </motion.p>
          )}
          {notice && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <span className="mt-4 block rounded-lg bg-brass-50 px-4 py-3 text-sm leading-relaxed text-brass-700">
                Single sign-on is provisioned with your workspace. Use the
                demonstration credentials below for now.
              </span>
            </motion.p>
          )}
        </AnimatePresence>

        <p className="mt-6 border-t border-line pt-5 text-center text-sm text-muted">
          No workspace yet?{" "}
          <Link
            href="/demo"
            className="font-medium text-petrol-800 underline decoration-petrol-300 underline-offset-4 hover:text-petrol-600"
          >
            Start your evaluation
          </Link>
        </p>
      </div>
    </div>
  );
}
