"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  X,
  Activity,
  CalendarClock,
  ChevronRight,
  FileBarChart2,
  FileSignature,
  FileText,
  Inbox as InboxIcon,
  LayoutDashboard,
  Radar,
  Search,
  Settings2,
  Sparkles,
  SlidersHorizontal,
  Store,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { DEMO_USER } from "@/lib/session";

/* The shell's org-scoped data, from /app/api/workspace-lite: identity,
   the search index, the claim chip. Fetched per session so the client
   bundle carries no portfolio data at all. */
type WorkspaceLite = {
  org: { name: string; watched: number; centers: number };
  locations: { id: string; center: string; place: string }[];
  triggered: number;
  today: string | null;
};
let liteCache: WorkspaceLite | null = null;
function useWorkspaceLite(): WorkspaceLite | null {
  const [lite, setLite] = useState<WorkspaceLite | null>(liteCache);
  useEffect(() => {
    if (liteCache) return;
    fetch("/app/api/workspace-lite")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.org) {
          liteCache = d;
          setLite(d);
        }
      })
      .catch(() => {});
  }, []);
  return lite;
}

/* The signed-in identity from the session, demo fallback until it
   loads (and for the legacy demo cookie, which resolves to the same
   seeded account). */
function useIdentity() {
  const [me, setMe] = useState<{ name: string; title: string | null; orgName: string | null } | null>(null);
  useEffect(() => {
    fetch("/app/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.name) setMe(d); })
      .catch(() => {});
  }, []);
  return {
    name: me?.name ?? DEMO_USER.name,
    initials: (me?.name ?? DEMO_USER.name)
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .replace(/[^A-Za-z]/g, "")
      .slice(0, 2)
      .toUpperCase(),
    orgName: me?.orgName ?? "Breakpoint",
  };
}
import { useScrollLock } from "@/lib/useScrollLock";
import { Monogram } from "@/components/admin/ui";
import { ViewAs } from "@/components/app/ViewAs";
import { NotificationBell } from "./NotificationBell";
import { ScanStatus } from "./ScanStatus";

/**
 * The workspace shell, a structural twin of the console shell: same
 * brand chip, same rail anatomy (icon chip, label, one-line purpose,
 * chevron, staggered entrance), same topbar order (search, then the
 * action cluster, then identity). One product, two seats — the only
 * differences are the substance: the client's search finds locations,
 * the rail ends in the scan pulse, and the money chip stays.
 */

const NAV = [
  {
    heading: "Monitor",
    items: [
      { href: "/app", label: "Overview", sub: "The whole portfolio", exact: true, Icon: LayoutDashboard },
      { href: "/app/theo", label: "Ask Theo", sub: "Answers from your portfolio", Icon: Sparkles },
      { href: "/app/locations", label: "Locations", sub: "Every watched door", Icon: Store },
      { href: "/app/clauses", label: "Clause library", sub: "What your leases say", Icon: FileText },
      { href: "/app/coverage", label: "Coverage", sub: "Where we look", Icon: Radar },
      { href: "/app/activity", label: "Activity", sub: "Scans and alerts", Icon: Activity },
    ],
  },
  {
    heading: "Act",
    items: [
      { href: "/app/inbox", label: "Inbox", sub: "Flags needing action", Icon: InboxIcon },
      { href: "/app/deadlines", label: "Deadlines", sub: "Clocks and elections", Icon: CalendarClock },
      { href: "/app/notices", label: "Notice packages", sub: "Assembled for counsel", Icon: FileSignature },
      { href: "/app/report", label: "Portfolio report", sub: "The period, printable", Icon: FileBarChart2 },
    ],
  },
  {
    heading: "Account",
    items: [
      { href: "/app/setup", label: "Portfolio setup", sub: "Papers to live", Icon: Settings2 },
      { href: "/app/settings", label: "Settings", sub: "Team and alerts", Icon: SlidersHorizontal },
    ],
  },
] as const;

/* The same mark the console wears. One product, one logo. */
function BrandHeader({ sub, bare = false }: { sub: string; bare?: boolean }) {
  return (
    <div
      className={cn(
        "flex h-16 items-center gap-3 px-5",
        !bare && "border-b border-slate-100",
      )}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-md shadow-indigo-500/30">
        <span className="text-[1rem] font-bold leading-none text-white">b</span>
        <span className="mb-2.5 ml-px h-1 w-1 rounded-[2px] bg-amber-400" />
      </div>
      <div>
        <p className="text-[0.9375rem] font-bold tracking-tight text-slate-900">
          Breakpoint
        </p>
        <p className="text-[0.6875rem] font-medium text-slate-400">{sub}</p>
      </div>
    </div>
  );
}

function AccountRow() {
  const lite = useWorkspaceLite();
  const name = lite?.org.name ?? "";
  return (
    <div className="border-b border-slate-100 px-4 py-3">
      <div className="flex items-center gap-3">
        <Monogram name={name || "Breakpoint"} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-[0.8125rem] font-semibold text-slate-900">
            {name || " "}
          </p>
          <p className="text-[0.6875rem] text-slate-400">
            {lite ? `${lite.org.watched} locations monitored` : " "}
          </p>
        </div>
      </div>
    </div>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  /* The inbox badge: how many flags are NEW. Polled so the rail stays
     live without a refresh — the badge appears the moment a flag
     files, whichever page is open. */
  const [newFlags, setNewFlags] = useState(0);
  useEffect(() => {
    let live = true;
    const pull = () => {
      if (document.visibilityState === "hidden") return;
      fetch("/app/api/findings")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (live && d?.counts) setNewFlags(d.counts.new ?? 0);
        })
        .catch(() => {});
    };
    pull();
    const t = setInterval(pull, 60_000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [pathname]);

  let index = 0;
  return (
    <nav className="space-y-4">
      {NAV.map((group) => (
        <div key={group.heading}>
          <p className="px-3 text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-400">
            {group.heading}
          </p>
          <div className="mt-1 space-y-1">
            {group.items.map((item) => {
              const active =
                "exact" in item && item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
              const i = index++;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "group flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
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
                  <span className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
                        active
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30"
                          : "bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700",
                      )}
                    >
                      <item.Icon className="h-4 w-4" />
                    </span>
                    <span className="text-left">
                      <span className="flex items-center gap-1.5 text-[0.8125rem] leading-tight">
                        {item.label}
                        {item.href === "/app/inbox" && newFlags > 0 && (
                          <span className="relative inline-flex">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-40" />
                            <span className="relative inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[0.625rem] font-bold leading-none text-white">
                              {newFlags}
                            </span>
                          </span>
                        )}
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
                      "h-4 w-4 shrink-0 transition-all duration-200",
                      active
                        ? "text-indigo-500 opacity-100"
                        : "text-slate-300 opacity-0 group-hover:opacity-100",
                    )}
                  />
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

/* The client's global search: their locations, by id, center or city. */
function LocationSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const lite = useWorkspaceLite();
  const index = useMemo(() => lite?.locations ?? [], [lite]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const q = query.trim().toLowerCase();
  const hits = q
    ? index
        .filter((l) =>
          `${l.id} ${l.center} ${l.place}`.toLowerCase().includes(q),
        )
        .slice(0, 6)
    : [];

  return (
    <div ref={boxRef} className="relative hidden w-full max-w-sm sm:block">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Jump to a location…"
        className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-9 pr-3 text-[0.8125rem] text-slate-800 transition-colors placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
      />
      {open && q && (
        <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-2xl shadow-slate-300/50">
          {hits.length === 0 ? (
            <p className="px-4 py-3 text-[0.8125rem] text-slate-400">
              No location matches &#8220;{query.trim()}&#8221;.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {hits.map((l) => (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      setQuery("");
                      router.push(`/app/locations/${l.id}`);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-slate-50"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                      <Store className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.8125rem] font-semibold text-slate-900">
                        {l.center}
                      </span>
                      <span className="block text-[0.6875rem] text-slate-400">
                        {l.id} · {l.place}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function UserCard({ onSignOut }: { onSignOut: () => void }) {
  const me = useIdentity();
  return (
    <div className="border-t border-slate-100 bg-gradient-to-r from-slate-50/80 to-white p-4">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[0.8125rem] font-bold text-white shadow-lg shadow-indigo-500/30 ring-2 ring-white/60">
            {me.initials}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.8125rem] font-semibold text-slate-900">
            {me.name}
          </p>
          <p className="text-[0.6875rem] text-slate-400">{me.orgName}</p>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className="shrink-0 text-[0.6875rem] font-semibold text-slate-400 transition-colors hover:text-indigo-600"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const topbarMe = useIdentity();

  // Close on navigation, and stop the page behind the drawer scrolling
  // without losing the reader's place.
  useEffect(() => setOpen(false), [pathname]);
  useScrollLock(open);

  const signOut = async () => {
    await fetch("/login/api", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  };

  const claimable = useWorkspaceLite()?.triggered ?? 0;

  const sidebarBody = (onNavigate?: () => void) => (
    <>
      <AccountRow />
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <NavList onNavigate={onNavigate} />
      </div>
      <div className="shrink-0">
        <ScanStatus compact />
      </div>
      <UserCard onSignOut={() => void signOut()} />
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ---- sidebar, desktop ---- */}
      <aside className="print:hidden fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-slate-200/60 bg-white lg:flex">
        <BrandHeader sub="Client Workspace" />
        {sidebarBody()}
      </aside>

      {/* ---- content column ---- */}
      <div className="lg:pl-72">
        {/* ---- topbar, the console's anatomy ---- */}
        <header className="print:hidden sticky top-0 z-30 border-b border-slate-200/60 bg-white/85 backdrop-blur-md">
          <div className="flex h-16 items-center gap-3 px-4 lg:px-8">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Close navigation" : "Open navigation"}
              aria-expanded={open}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-700 hover:bg-slate-100 lg:hidden"
            >
              <span className="flex h-3.5 w-5 flex-col justify-between">
                <span className="block h-0.5 w-full bg-current" />
                <span className="block h-0.5 w-full bg-current" />
                <span className="block h-0.5 w-full bg-current" />
              </span>
            </button>

            <LocationSearch />

            <div className="ml-auto flex items-center gap-2">
              <div className="hidden md:block">
                <ViewAs />
              </div>
              <span className="hidden h-10 items-center gap-2 whitespace-nowrap rounded-full bg-amber-50 px-3.5 text-[0.75rem] font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/10 xl:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 anim-pulse-dot" />
                {/* Say which decision. The product has more than one queue
                    asking for one, and "needs a decision" on its own no
                    longer identifies this as the money. */}
                {claimable} locations ready to claim
              </span>
              <NotificationBell />
              <Link
                href="/app/notices"
                className="hidden h-10 items-center rounded-xl bg-indigo-600 px-4 text-[0.8125rem] font-semibold whitespace-nowrap text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:bg-indigo-500 active:scale-95 sm:inline-flex"
              >
                Open notice desk
              </Link>

              <span className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" />

              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[0.75rem] font-bold text-white shadow-md shadow-indigo-500/25">
                    {topbarMe.initials}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
                </div>
                <span className="hidden whitespace-nowrap text-[0.8125rem] font-semibold text-slate-800 xl:block">
                  {topbarMe.name}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* ---- mobile drawer ---- */}
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
                className="absolute inset-y-0 left-0 flex w-[18rem] flex-col border-r border-slate-200/60 bg-white"
              >
                <div className="flex shrink-0 items-center justify-between border-b border-slate-100 pr-3">
                  <BrandHeader sub="Client Workspace" bare />
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close navigation"
                    className="grid h-10 w-10 place-items-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                {sidebarBody(() => setOpen(false))}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ---- content ---- */}
        <main
          id="main"
          className="print:pl-0 mx-auto max-w-[88rem] px-4 py-8 sm:px-6 lg:px-10"
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
