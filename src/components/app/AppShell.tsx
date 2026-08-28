"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  X,
  Activity,
  ClipboardCheck,
  FileSignature,
  FileText,
  LayoutDashboard,
  Radar,
  Scale,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Store,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/cn";
import { org, summary } from "@/lib/portfolio";
import { DEMO_USER } from "@/lib/session";
import { useScrollLock } from "@/lib/useScrollLock";
import { ScanStatus } from "./ScanStatus";

/**
 * The workspace shell, on the same design system as the console:
 * white sidebar, icon-chip navigation with the indigo active state,
 * slate ground, the scan pulse living at the bottom of the rail where
 * a paying client sees the watch running on every page.
 */

const NAV = [
  {
    heading: "Monitor",
    items: [
      { href: "/app", label: "Overview", exact: true, Icon: LayoutDashboard },
      { href: "/app/theo", label: "Ask Theo", Icon: Sparkles },
      { href: "/app/locations", label: "Locations", Icon: Store },
      { href: "/app/coverage", label: "Coverage", Icon: Radar },
      { href: "/app/check", label: "Weekly check", Icon: ClipboardCheck },
      { href: "/app/activity", label: "Activity", Icon: Activity },
    ],
  },
  {
    heading: "Analyze",
    items: [
      { href: "/app/clauses", label: "Clause library", Icon: FileText },
      { href: "/app/clause-value", label: "Clause value", Icon: Scale },
    ],
  },
  {
    heading: "Act",
    items: [
      { href: "/app/notices", label: "Notice packages", Icon: FileSignature },
      { href: "/app/setup", label: "Portfolio setup", Icon: Settings2 },
      { href: "/app/settings", label: "Settings", Icon: SlidersHorizontal },
    ],
  },
] as const;

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  let index = 0;
  return (
    <nav className="space-y-5">
      {NAV.map((group) => (
        <div key={group.heading}>
          <p className="px-3 text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-400">
            {group.heading}
          </p>
          <ul className="mt-1.5 space-y-0.5">
            {group.items.map((item) => {
              const active =
                "exact" in item && item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
              const i = index++;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "group flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[0.8125rem] font-medium transition-all duration-200",
                      active
                        ? "bg-slate-100 text-slate-900 shadow-sm"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                    )}
                    style={{
                      opacity: mounted ? 1 : 0,
                      transform: mounted ? "translateX(0)" : "translateX(-8px)",
                      transition: "all 200ms",
                      transitionDelay: `${i * 20}ms`,
                    }}
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
                        active
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30"
                          : "bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700",
                      )}
                    >
                      <item.Icon className="h-3.5 w-3.5" />
                    </span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function AccountBlock() {
  return (
    <div className="border-b border-slate-100 px-5 py-4">
      <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-400">
        Account
      </p>
      <p className="mt-1.5 text-[0.9375rem] font-bold tracking-tight text-slate-900">
        {org.name}
      </p>
      <p className="text-[0.75rem] text-slate-500">
        {org.watched} locations monitored
      </p>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Close on navigation, and stop the page behind the drawer scrolling
  // without losing the reader's place.
  useEffect(() => setOpen(false), [pathname]);
  useScrollLock(open);

  const claimable =
    (summary.byState.get("claimable") ?? 0) +
    (summary.byState.get("election_open") ?? 0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ---- sidebar, desktop ---- */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200/60 bg-white lg:flex">
        <div className="flex h-16 items-center border-b border-slate-100 px-5">
          <Link href="/app" aria-label="Breakpoint" className="text-slate-900">
            <Logo />
          </Link>
        </div>

        <AccountBlock />

        <div className="flex-1 overflow-y-auto px-2 py-4">
          <NavList />
        </div>

        <ScanStatus />
      </aside>

      {/* ---- top bar ---- */}
      <header className="sticky top-0 z-30 border-b border-slate-200/60 bg-white/90 backdrop-blur-sm lg:pl-64">
        <div className="flex h-16 items-center gap-4 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            className="grid h-10 w-10 place-items-center rounded-xl text-slate-700 hover:bg-slate-100 lg:hidden"
          >
            <span className="flex h-3.5 w-5 flex-col justify-between">
              <span className="block h-0.5 w-full bg-current" />
              <span className="block h-0.5 w-full bg-current" />
              <span className="block h-0.5 w-full bg-current" />
            </span>
          </button>

          <Link href="/app" className="text-slate-900 lg:hidden" aria-label="Breakpoint">
            <Logo />
          </Link>

          <div className="ml-auto flex items-center gap-2.5">
            <span className="hidden items-center gap-2 rounded-full bg-amber-50 px-3 py-2 text-[0.75rem] font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/10 sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 anim-pulse-dot" />
              {/* Say which decision. The product now has more than one
                  queue asking for one, and "needs a decision" on its own
                  no longer identifies this as the money. */}
              {claimable} locations ready to claim
            </span>

            <Link
              href="/app/notices"
              className="hidden rounded-xl bg-indigo-600 px-4 py-2.5 text-[0.8125rem] font-semibold whitespace-nowrap text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:bg-indigo-500 active:scale-95 sm:inline-flex"
            >
              Open notice desk
            </Link>

            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-2.5 shadow-sm">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[0.6875rem] font-bold text-white shadow-md shadow-indigo-500/25">
                {DEMO_USER.initials}
              </span>
              <span className="hidden text-[0.8125rem] font-semibold text-slate-800 sm:block">
                {DEMO_USER.name}
              </span>
              <button
                type="button"
                onClick={async () => {
                  await fetch("/login/api", { method: "DELETE" });
                  router.push("/login");
                  router.refresh();
                }}
                className="ml-1 border-l border-slate-200 pl-2 text-[0.75rem] font-medium whitespace-nowrap text-slate-400 transition-colors hover:text-indigo-600"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ---- mobile drawer ----
           The panel carries its own header bar at the same height as
           the app header. Without it the drawer's first row sits at
           y=0 and reads as though it has merged with the header
           behind it, which is exactly how it looked before. */}
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.button
              type="button"
              aria-label="Close navigation"
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />

            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-y-0 left-0 flex w-[17.5rem] flex-col border-r border-slate-200/60 bg-white"
            >
              <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 pl-5 pr-3">
                <Link
                  href="/app"
                  onClick={() => setOpen(false)}
                  aria-label="Breakpoint"
                  className="text-slate-900"
                >
                  <Logo />
                </Link>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close navigation"
                  className="grid h-10 w-10 place-items-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <AccountBlock />

              <div className="flex-1 overflow-y-auto px-2 py-4">
                <NavList onNavigate={() => setOpen(false)} />
              </div>

              <div className="shrink-0">
                <ScanStatus compact />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ---- content ---- */}
      <main id="main" className="lg:pl-64">
        <div className="mx-auto max-w-[1500px] px-4 py-7 sm:px-6 sm:py-9">
          {children}
        </div>
      </main>
    </div>
  );
}
