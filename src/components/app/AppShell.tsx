"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  X,
  Activity,
  FileSignature,
  FileText,
  LayoutDashboard,
  Network,
  Radar,
  RefreshCw,
  Settings2,
  Sparkles,
  Store,
  TrendingUp,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/cn";
import { org, TODAY, summary } from "@/lib/portfolio";
import { prettyDate } from "@/lib/clause";
import { DEMO_USER } from "@/lib/session";
import { useScrollLock } from "@/lib/useScrollLock";

const NAV = [
  {
    heading: "Monitor",
    items: [
      { href: "/app", label: "Overview", exact: true, Icon: LayoutDashboard },
      { href: "/app/theo", label: "Ask Theo", Icon: Sparkles },
      { href: "/app/locations", label: "Locations", Icon: Store },
      { href: "/app/coverage", label: "Coverage", Icon: Radar },
      { href: "/app/activity", label: "Activity", Icon: RefreshCw },
      { href: "/app/signals", label: "Signals", Icon: Activity },
    ],
  },
  {
    heading: "Analyze",
    items: [
      { href: "/app/cascade", label: "Anchor exposure", Icon: Network },
      { href: "/app/clauses", label: "Clause library", Icon: FileText },
      { href: "/app/value", label: "Value realized", Icon: TrendingUp },
    ],
  },
  {
    heading: "Act",
    items: [
      { href: "/app/notices", label: "Notice packages", Icon: FileSignature },
      { href: "/app/setup", label: "Portfolio setup", Icon: Settings2 },
    ],
  },
] as const;

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-6">
      {NAV.map((group) => (
        <div key={group.heading}>
          <p className="label px-3 text-faint">{group.heading}</p>
          <ul className="mt-2 space-y-0.5">
            {group.items.map((item) => {
              const active =
                "exact" in item && item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[0.875rem] transition-colors duration-250",
                      active
                        ? "bg-petrol-50 font-semibold text-petrol-800"
                        : "text-ink-soft hover:bg-surface-sunk hover:text-ink",
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-brass-500" />
                    )}
                    <item.Icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        active ? "text-petrol-700" : "text-faint",
                      )}
                    />
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

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Close on navigation, and stop the page behind the drawer scrolling
  // without losing the reader's place.
  useEffect(() => setOpen(false), [pathname]);
  useScrollLock(open);

  return (
    <div className="min-h-screen bg-surface-sunk/40">
      {/* ---- sidebar, desktop ---- */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-canvas lg:flex">
        <div className="flex h-16 items-center border-b border-line px-5">
          <Link href="/app" aria-label="Breakpoint" className="text-ink">
            <Logo />
          </Link>
        </div>

        <div className="border-b border-line px-5 py-4">
          <p className="label text-faint">Account</p>
          <p className="mt-1.5 text-[0.9375rem] font-semibold text-ink">
            {org.name}
          </p>
          <p className="text-[0.75rem] text-muted">
            {org.watched} watched of {org.totalDoors} doors
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-5">
          <NavList />
        </div>

        <div className="border-t border-line px-5 py-4">
          <p className="label text-faint">Evaluated through</p>
          <p className="tnum mt-1 text-[0.8125rem] font-medium text-ink">
            {prettyDate(TODAY)}
          </p>
          <p className="mt-1.5 text-[0.75rem] leading-snug text-muted">
            Recurring evaluation as verified conditions change.
          </p>
        </div>
      </aside>

      {/* ---- top bar ---- */}
      <header className="sticky top-0 z-30 border-b border-line bg-canvas lg:pl-64">
        <div className="flex h-16 items-center gap-4 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            className="grid h-10 w-10 place-items-center rounded-lg text-ink hover:bg-surface-sunk lg:hidden"
          >
            <span className="flex h-3.5 w-5 flex-col justify-between">
              <span className="block h-0.5 w-full bg-current" />
              <span className="block h-0.5 w-full bg-current" />
              <span className="block h-0.5 w-full bg-current" />
            </span>
          </button>

          <Link href="/app" className="text-ink lg:hidden" aria-label="Breakpoint">
            <Logo />
          </Link>

          <div className="ml-auto flex items-center gap-2.5">
            <span className="hidden items-center gap-2 rounded-lg bg-brass-50 px-3 py-2 text-[0.75rem] font-semibold text-brass-700 ring-1 ring-inset ring-brass-200 sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-brass-500 anim-pulse-dot" />
              {(summary.byState.get("claimable") ?? 0) +
                (summary.byState.get("election_open") ?? 0)}{" "}
              need a decision
            </span>

            <Link
              href="/app/notices"
              className="hidden rounded-lg bg-petrol-800 px-4 py-2.5 text-[0.8125rem] font-semibold whitespace-nowrap text-cream transition-colors duration-250 hover:bg-petrol-700 sm:inline-flex"
            >
              Open notice desk
            </Link>

            <div className="flex items-center gap-2 rounded-lg border border-line px-2.5 py-1.5">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-petrol-800 text-[0.6875rem] font-semibold text-cream">
                {DEMO_USER.initials}
              </span>
              <span className="hidden text-[0.8125rem] font-medium text-ink sm:block">
                {DEMO_USER.name}
              </span>
              <button
                type="button"
                onClick={async () => {
                  await fetch("/login/api", { method: "DELETE" });
                  router.push("/login");
                  router.refresh();
                }}
                className="ml-1 border-l border-line pl-2 text-[0.75rem] font-medium whitespace-nowrap text-muted transition-colors hover:text-petrol-700"
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
              className="absolute inset-0 bg-petrol-950/45"
            />

            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-y-0 left-0 flex w-[17.5rem] flex-col border-r border-line bg-canvas"
            >
              <div className="flex h-16 shrink-0 items-center justify-between border-b border-line pl-5 pr-3">
                <Link
                  href="/app"
                  onClick={() => setOpen(false)}
                  aria-label="Breakpoint"
                  className="text-ink"
                >
                  <Logo />
                </Link>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close navigation"
                  className="grid h-10 w-10 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-sunk hover:text-ink"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="border-b border-line px-5 py-4">
                <p className="label text-faint">Account</p>
                <p className="mt-1.5 text-[0.9375rem] font-semibold text-ink">
                  {org.name}
                </p>
                <p className="text-[0.75rem] text-muted">
                  {org.watched} watched of {org.totalDoors} doors
                </p>
              </div>

              <div className="flex-1 overflow-y-auto px-2 py-5">
                <NavList onNavigate={() => setOpen(false)} />
              </div>

              <div className="shrink-0 border-t border-line px-5 py-4">
                <p className="label text-faint">Evaluated through</p>
                <p className="tnum mt-1 text-[0.8125rem] font-medium text-ink">
                  {prettyDate(TODAY)}
                </p>
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
