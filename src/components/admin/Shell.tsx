"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Inbox,
  MessageSquareDot,
  BrainCircuit,
  FileSearch,
  SlidersHorizontal,
  ChevronRight,
  Bell,
  Plus,
  Search,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { CountBubble, Monogram, PovToggle } from "@/components/admin/ui";

/**
 * The console shell, in QuoteTurbo2's portal language: white icon-chip
 * sidebar with live count badges, and a real topbar — global client
 * search, a notification bell that counts the open request queue, and
 * the one quick action that matters (new client). The shell fetches
 * the console payload once so the chrome always knows the state of the
 * company.
 */

type ShellCounts = {
  openRequests: number;
  waitingSubmissions: number;
  pipelinePending: number;
  orgs: { slug: string; name: string; status: string; locations: number | null }[];
};

const NAV = [
  { href: "/admin", label: "Overview", sub: "The whole company", icon: LayoutDashboard, exact: true },
  { href: "/admin/clients", label: "Clients", sub: "Registry & boards", icon: Building2, exact: false },
  { href: "/admin/onboarding", label: "Onboarding", sub: "Invites & submissions", icon: Inbox, exact: true, badge: "waiting" as const },
  { href: "/admin/requests", label: "Requests", sub: "Everything clients filed", icon: MessageSquareDot, exact: true, badge: "open" as const },
  { href: "/admin/extraction", label: "Extraction", sub: "Records awaiting approval", icon: FileSearch, exact: true, badge: "pipeline" as const },
  { href: "/admin/agent", label: "Agent canon", sub: "System-wide programming", icon: BrainCircuit, exact: true },
  { href: "/admin/system", label: "System", sub: "Health & configuration", icon: SlidersHorizontal, exact: true },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [counts, setCounts] = useState<ShellCounts>({
    openRequests: 0,
    waitingSubmissions: 0,
    pipelinePending: 0,
    orgs: [],
  });
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  const load = useCallback(async () => {
    const res = await fetch("/admin/api", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setCounts({
      openRequests: (data.requestsAll ?? []).filter(
        (r: { handled_at: string | null }) => !r.handled_at,
      ).length,
      waitingSubmissions: (data.submissions ?? []).filter(
        (s: { processed_at: string | null }) => !s.processed_at,
      ).length,
      pipelinePending: data.pipelinePending ?? 0,
      orgs: data.orgs ?? [],
    });
  }, []);

  /* Refresh the chrome on every navigation so the badges track the
     work as it is done, not as it was when the tab opened. */
  useEffect(() => {
    void load();
  }, [load, pathname]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!searchRef.current?.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const q = query.trim().toLowerCase();
  const hits = q
    ? counts.orgs
        .filter(
          (o) => o.name.toLowerCase().includes(q) || o.slug.toLowerCase().includes(q),
        )
        .slice(0, 6)
    : [];

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
            const badge =
              item.badge === "open"
                ? counts.openRequests
                : item.badge === "waiting"
                  ? counts.waitingSubmissions
                  : item.badge === "pipeline"
                    ? counts.pipelinePending
                    : 0;
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
                      "relative flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200",
                      active
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30"
                        : "bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {badge > 0 && (
                      <CountBubble
                        n={badge}
                        className={cn(
                          "absolute -right-1.5 -top-1.5",
                          item.badge === "waiting" && "bg-amber-500",
                        )}
                      />
                    )}
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

      {/* ---- content column ---- */}
      <div className="lg:pl-72">
        {/* ---- topbar ---- */}
        <header className="sticky top-0 z-30 border-b border-slate-200/60 bg-white/85 backdrop-blur-md">
          <div className="flex h-16 items-center gap-3 px-4 lg:px-8">
            {/* brand on small screens */}
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 lg:hidden">
              <span className="text-sm font-bold text-white">b</span>
            </div>

            {/* ---- global client search ---- */}
            <div ref={searchRef} className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                placeholder="Jump to a client…"
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-9 pr-3 text-[0.8125rem] text-slate-800 transition-colors placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
              />
              {searchOpen && q && (
                <div className="absolute left-0 right-0 top-12 overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-2xl shadow-slate-300/50">
                  {hits.length === 0 ? (
                    <p className="px-4 py-3 text-[0.8125rem] text-slate-400">
                      No client matches &#8220;{query.trim()}&#8221;.
                    </p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {hits.map((o) => (
                        <li key={o.slug}>
                          <button
                            type="button"
                            onClick={() => {
                              setSearchOpen(false);
                              setQuery("");
                              router.push(`/admin/clients/${o.slug}`);
                            }}
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-slate-50"
                          >
                            <Monogram name={o.name} size="sm" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[0.8125rem] font-semibold text-slate-900">
                                {o.name}
                              </span>
                              <span className="block text-[0.6875rem] text-slate-400">
                                {o.locations !== null
                                  ? `${o.locations} locations`
                                  : "awaiting import"}{" "}
                                · {o.status}
                              </span>
                            </span>
                            <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="border-t border-slate-100 bg-slate-50/60 px-4 py-2 text-[0.6875rem] text-slate-400">
                    Locations are searched on each client&#8217;s board.
                  </p>
                </div>
              )}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <div className="hidden md:block">
                <PovToggle current="admin" />
              </div>
              <Link
                href="/admin/clients?new=1"
                className="hidden h-10 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-[0.8125rem] font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:bg-indigo-500 active:scale-95 sm:inline-flex"
              >
                <Plus className="h-4 w-4" /> New client
              </Link>

              <Link
                href="/admin/requests"
                aria-label={`${counts.openRequests} open requests`}
                className="relative grid h-10 w-10 place-items-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
              >
                <Bell className="h-[1.125rem] w-[1.125rem]" />
                <CountBubble n={counts.openRequests} className="absolute right-1 top-1" />
              </Link>

              <span className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" />

              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[0.75rem] font-bold text-white shadow-md shadow-indigo-500/25">
                    OP
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
                </div>
                <span className="hidden text-[0.8125rem] font-semibold text-slate-800 xl:block">
                  Operations
                </span>
              </div>
            </div>
          </div>

          {/* small-screen nav strip */}
          <nav className="flex gap-1 overflow-x-auto border-t border-slate-100 px-3 py-2 lg:hidden">
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
        </header>

        <main
          className="mx-auto max-w-[88rem] px-6 py-8 lg:px-10"
          style={{
            backgroundImage:
              "radial-gradient(at 30% 0%, rgba(79,70,229,0.04) 0px, transparent 45%), radial-gradient(at 85% 10%, rgba(139,92,246,0.04) 0px, transparent 45%)",
          }}
        >
          {children}
        </main>
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
