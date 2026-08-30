"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Radar, FileCheck, MessageSquareDot } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * The client's bell. The product's promise is "we tell you the moment
 * it matters" — this is where that promise is visible: every alert we
 * filed, unread until they've seen it.
 */

type Alert = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  location_ref: string | null;
  created_at: string;
  read_at: string | null;
};

const KIND_ICON: Record<string, React.ReactNode> = {
  scan: <Radar className="h-4 w-4" />,
  record: <FileCheck className="h-4 w-4" />,
  request: <MessageSquareDot className="h-4 w-4" />,
};

export function NotificationBell() {
  const pathname = usePathname();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<Alert | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  /* the newest alert id seen, so a fresh arrival can be told apart
     from a mere reload */
  const newestSeen = useRef<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/app/api/notifications", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    const list: Alert[] = data.notifications ?? [];
    /* a brand-new unread alert at the top: surface it live */
    const top = list[0];
    if (
      top &&
      !top.read_at &&
      newestSeen.current !== null &&
      top.id !== newestSeen.current
    ) {
      setToast(top);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 7000);
    }
    if (top) newestSeen.current = top.id;
    else newestSeen.current = "none";
    setAlerts(list);
    setUnread(data.unread ?? 0);
  }, []);

  useEffect(() => {
    void load();
  }, [load, pathname]);

  /* the bell stays live without a navigation: visibility-aware poll */
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "hidden") return;
      void load();
    }, 45_000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const markAll = async () => {
    await fetch("/app/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    void load();
  };

  return (
    <div ref={ref} className="relative">
      {/* a fresh alert slides in the moment the poll sees it; portaled
          because the blurred topbar is a containing block for fixed */}
      {toast &&
        typeof document !== "undefined" &&
        createPortal(
        <div className="bp-toast fixed right-4 bottom-4 z-[60] w-[20rem]">
          <Link
            href={
              toast.location_ref
                ? `/app/locations/${toast.location_ref}`
                : "/app/inbox"
            }
            onClick={() => setToast(null)}
            className="block overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-2xl shadow-slate-400/30 transition-transform hover:-translate-y-0.5"
          >
            <span className="flex items-start gap-3 p-4">
              <span className="relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                {KIND_ICON[toast.kind] ?? <Bell className="h-4 w-4" />}
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 animate-ping rounded-full bg-indigo-400" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[0.8125rem] leading-snug font-semibold text-slate-900">
                  {toast.title}
                </span>
                {toast.body && (
                  <span className="mt-0.5 block truncate text-[0.75rem] text-slate-500">
                    {toast.body}
                  </span>
                )}
              </span>
            </span>
          </Link>
        </div>,
        document.body,
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`${unread} unread alerts`}
        className="relative grid h-10 w-10 place-items-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
      >
        <Bell className="h-[1.125rem] w-[1.125rem]" />
        {unread > 0 && (
          <span className="tnum absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[0.625rem] font-bold text-white shadow-sm">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[22rem] overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-2xl shadow-slate-300/50">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-[0.8125rem] font-semibold text-slate-900">Alerts</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => void markAll()}
                className="text-[0.75rem] font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Mark all read
              </button>
            )}
          </div>
          {alerts.length === 0 ? (
            <p className="px-4 py-8 text-center text-[0.8125rem] text-slate-400">
              Nothing yet. When a scan finds a change or your team handles a
              request, it lands here the moment it happens.
            </p>
          ) : (
            <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
              {alerts.map((a) => {
                const inner = (
                  <span className="flex items-start gap-3">
                    <span
                      className={cn(
                        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                        a.read_at
                          ? "bg-slate-100 text-slate-400"
                          : "bg-indigo-50 text-indigo-600",
                      )}
                    >
                      {KIND_ICON[a.kind] ?? <Bell className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block text-[0.8125rem] leading-snug",
                          a.read_at
                            ? "font-medium text-slate-600"
                            : "font-semibold text-slate-900",
                        )}
                      >
                        {a.title}
                      </span>
                      {a.body && (
                        <span className="mt-0.5 block text-[0.75rem] leading-snug text-slate-500">
                          {a.body}
                        </span>
                      )}
                      <span className="mt-0.5 block text-[0.6875rem] text-slate-400">
                        {new Date(a.created_at).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </span>
                    {!a.read_at && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                    )}
                  </span>
                );
                return (
                  <li key={a.id}>
                    {a.location_ref ? (
                      <Link
                        href={`/app/locations/${a.location_ref}`}
                        onClick={() => setOpen(false)}
                        className="block px-4 py-3 transition-colors hover:bg-slate-50"
                      >
                        {inner}
                      </Link>
                    ) : (
                      <span className="block px-4 py-3">{inner}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
