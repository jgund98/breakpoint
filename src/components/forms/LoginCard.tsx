"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { LogoBadge, LogoWord } from "@/components/brand/Logo";

/**
 * Workspace sign-in. Authentication isn't wired yet — submissions get
 * an honest early-access message rather than a fake session.
 */
export function LoginCard() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState(false);

  return (
    <div className="relative w-full max-w-md">
      <div className="rounded-xl border border-line bg-surface p-8 text-ink lift-lg sm:p-10">
        <div className="flex flex-col items-center text-center">
          <LogoBadge className="h-12 w-12" />
          <LogoWord className="mt-4 text-[1.625rem]" />
          <p className="mt-2 text-sm text-muted">
            Sign in to your workspace
          </p>
        </div>

        <form
          className="mt-8 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setNotice(true);
          }}
        >
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
            className="w-full rounded-full bg-petrol-800 px-6 py-3.5 text-[0.9375rem] font-semibold whitespace-nowrap text-cream transition-colors hover:bg-petrol-700"
          >
            Sign in
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
          {notice && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <span className="mt-4 block rounded-lg bg-brass-50 px-4 py-3 text-sm leading-relaxed text-brass-700">
                Breakpoint is in early access — workspaces are provisioned with
                your first evaluation.
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
