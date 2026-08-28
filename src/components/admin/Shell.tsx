"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Inbox,
  MessageSquareDot,
  BrainCircuit,
  SlidersHorizontal,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * The console shell: white sidebar with icon-chip navigation, learned
 * from QuoteTurbo2's portal. Every admin page renders inside it. The
 * active item carries the indigo chip with its colored shadow; each
 * item states what it is in one small line, because a new operator
 * should never wonder what a page holds.
 */

const NAV = [
  {
    href: "/admin",
    label: "Overview",
    sub: "The whole company",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: "/admin/clients",
    label: "Clients",
    sub: "Registry & boards",
    icon: Building2,
    exact: false,
  },
  {
    href: "/admin/onboarding",
    label: "Onboarding",
    sub: "Invites & submissions",
    icon: Inbox,
    exact: true,
  },
  {
    href: "/admin/requests",
    label: "Requests",
    sub: "Everything clients filed",
    icon: MessageSquareDot,
    exact: true,
  },
  {
    href: "/admin/agent",
    label: "Agent canon",
    sub: "System-wide programming",
    icon: BrainCircuit,
    exact: true,
  },
  {
    href: "/admin/system",
    label: "System",
    sub: "Health & configuration",
    icon: SlidersHorizontal,
    exact: true,
  },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ---- sidebar ---- */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-slate-200/60 bg-white lg:flex">
        <div className="flex h-16 items-center gap-3 border-b border-slate-100 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-md shadow-indigo-500/30">
            <span className="text-[1rem] font-bold leading-none text-white">b</span>
            <span className="mb-2.5 ml-px h-1 w-1 rounded-[2px] bg-amber-400" />
          </div>
          <div>
            <p className="text-[0.9375rem] font-bold tracking-tight text-slate-900">
              Breakpoint
            </p>
            <p className="text-[0.6875rem] font-medium text-slate-400">
              Operations Console
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV.map((item, index) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-slate-100 text-slate-900 shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                )}
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? "translateX(0)" : "translateX(-8px)",
                  transition: "all 200ms",
                  transitionDelay: `${index * 25}ms`,
                }}
              >
                <span className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200",
                      active
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30"
                        : "bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-left">
                    <span className="block text-[0.8125rem] leading-tight">
                      {item.label}
                    </span>
                    <span
                      className={cn(
                        "block text-[0.6875rem] leading-tight",
                        active ? "text-indigo-600" : "text-slate-400",
                      )}
                    >
                      {item.sub}
                    </span>
                  </span>
                </span>
                <ChevronRight
                  className={cn(
                    "h-4 w-4 transition-all duration-200",
                    active
                      ? "text-indigo-500 opacity-100"
                      : "text-slate-300 opacity-0 group-hover:opacity-100",
                  )}
                />
              </Link>
            );
          })}
        </nav>

        {/* ---- who is signed in ---- */}
        <div className="border-t border-slate-100 bg-gradient-to-r from-slate-50/80 to-white p-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[0.8125rem] font-bold text-white shadow-lg shadow-indigo-500/30 ring-2 ring-white/60">
                OP
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.8125rem] font-semibold text-slate-900">
                Operations
              </p>
              <p className="text-[0.6875rem] text-slate-400">
                Internal · staff auth pending
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* ---- content ---- */}
      <div className="lg:pl-72">
        {/* Small screens get a slim brand bar instead of the sidebar. */}
        <div className="flex h-14 items-center gap-2 border-b border-slate-200/60 bg-white px-4 lg:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600">
            <span className="text-sm font-bold text-white">b</span>
          </div>
          <p className="text-sm font-bold text-slate-900">Breakpoint Console</p>
          <nav className="ml-auto flex gap-1 overflow-x-auto">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[0.75rem] font-medium",
                  (item.exact ? pathname === item.href : pathname.startsWith(item.href))
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-500",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <main className="mx-auto max-w-[88rem] px-6 py-8 lg:px-10">{children}</main>
      </div>
    </div>
  );
}

/** The standard page heading: title, one-line purpose, actions right. */
export function PageHeader({
  title,
  blurb,
  aside,
}: {
  title: string;
  blurb?: string;
  aside?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[1.375rem] font-bold tracking-tight text-slate-900">
          {title}
        </h1>
        {blurb && <p className="mt-1 text-[0.8125rem] text-slate-500">{blurb}</p>}
      </div>
      {aside && <div className="flex items-center gap-2">{aside}</div>}
    </div>
  );
}
