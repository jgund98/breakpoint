"use client";

/**
 * The staff workspace switcher, shown only to internal accounts: which
 * client this /app surface is acting as, plus the door back to the
 * console. Client users get a 403 from the endpoint and this renders
 * nothing at all — no toggle, no hint the console exists.
 */
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type OrgOption = { slug: string; name: string; demo_mode: boolean };

export function ViewAs() {
  const [orgs, setOrgs] = useState<OrgOption[] | null>(null);
  const [current, setCurrent] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    let live = true;
    fetch("/app/api/view-as")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (live && d) {
          setOrgs(d.orgs ?? []);
          setCurrent(d.current ?? "");
        }
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  if (!orgs) return null;
  const active = orgs.find((o) => o.slug === current);

  const switchTo = async (slug: string) => {
    if (!slug || slug === current || busy) return;
    setBusy(true);
    const r = await fetch("/app/api/view-as", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ org: slug }),
    });
    if (r.ok) {
      /* Full reload on the same page: every fetch on the surface is
         session-scoped, so the whole workspace flips at once. */
      window.location.assign(pathname?.startsWith("/app") ? pathname : "/app");
      return;
    }
    setBusy(false);
  };

  return (
    <div className="flex shrink-0 items-center gap-1 rounded-xl bg-slate-100 p-1">
      <label className="flex items-center gap-1.5 rounded-lg bg-white py-1.5 pr-1 pl-3 shadow-sm">
        <span className="text-[0.6875rem] font-medium whitespace-nowrap text-slate-400">
          Viewing as
        </span>
        <select
          value={current}
          disabled={busy}
          aria-label="Client workspace to view"
          onChange={(e) => void switchTo(e.target.value)}
          className="max-w-[11rem] cursor-pointer truncate bg-transparent pr-1 text-[0.75rem] font-semibold text-slate-900 focus:outline-none disabled:opacity-50"
        >
          {orgs.map((o) => (
            <option key={o.slug} value={o.slug}>
              {o.name}
              {o.demo_mode ? " (demo)" : ""}
            </option>
          ))}
        </select>
        {active?.demo_mode && (
          <span
            title="Demo mode: this workspace resets to its pristine evaluated state on every entry."
            className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-violet-500"
          />
        )}
      </label>
      <a
        href="/admin"
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[0.75rem] font-semibold whitespace-nowrap text-slate-500 transition-all duration-200 hover:text-slate-700"
      >
        Admin
      </a>
    </div>
  );
}
