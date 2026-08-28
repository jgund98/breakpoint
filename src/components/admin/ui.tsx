"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The admin console's design system, learned from QuoteTurbo2's portal:
 * white cards with generous radius and layered slate shadows, colored
 * icon chips, slate neutrals, staggered rise-in entrances, one accent
 * (Breakpoint indigo where QT2 uses emerald). Every block on every
 * admin page is built from these pieces — nothing invents its own
 * frame.
 */

/* ------------------------------------------------------------------
   entrance choreography: mount → rise. QT2 does this per-block with
   delay steps; Rise wraps any block in it.
   ------------------------------------------------------------------ */

export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

export function Rise({
  delay = 0,
  className,
  children,
}: {
  delay?: number;
  className?: string;
  children: ReactNode;
}) {
  const mounted = useMounted();
  return (
    <div
      className={cn(
        "transform transition-all duration-700",
        mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
        className,
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------
   cards
   ------------------------------------------------------------------ */

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/60 bg-white shadow-xl shadow-slate-200/50",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** A card with the standard header band. Tables/lists pass flush. */
export function Section({
  title,
  blurb,
  aside,
  flush,
  children,
}: {
  title: string;
  blurb?: string;
  aside?: ReactNode;
  flush?: boolean;
  children: ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-slate-100 px-6 py-4">
        <div className="min-w-0">
          <h2 className="text-[0.9375rem] font-semibold tracking-tight text-slate-900">
            {title}
          </h2>
          {blurb && (
            <p className="mt-0.5 max-w-[52rem] text-[0.8125rem] leading-snug text-slate-500">
              {blurb}
            </p>
          )}
        </div>
        {aside && <div className="flex shrink-0 items-center gap-2">{aside}</div>}
      </div>
      <div className={flush ? undefined : "px-6 py-5"}>{children}</div>
    </Card>
  );
}

/* ------------------------------------------------------------------
   icon chips + stats
   ------------------------------------------------------------------ */

export type ChipColor = "indigo" | "emerald" | "amber" | "rose" | "sky" | "violet" | "slate";

const CHIP: Record<ChipColor, string> = {
  indigo: "bg-indigo-50 text-indigo-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  rose: "bg-rose-50 text-rose-600",
  sky: "bg-sky-50 text-sky-600",
  violet: "bg-violet-50 text-violet-600",
  slate: "bg-slate-100 text-slate-500",
};

export function IconChip({
  color = "slate",
  size = "md",
  className,
  children,
}: {
  color?: ChipColor;
  size?: "sm" | "md" | "lg";
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-xl",
        size === "sm" ? "h-8 w-8" : size === "lg" ? "h-12 w-12 rounded-2xl" : "h-10 w-10",
        CHIP[color],
        className,
      )}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  icon,
  color = "slate",
  hot,
  delay = 0,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  icon?: ReactNode;
  color?: ChipColor;
  /** Pulls the number to amber when it demands attention. */
  hot?: boolean;
  delay?: number;
}) {
  /* h-full at every layer: a card with no sub-line must still stand as
     tall as its siblings in the row. Uneven stat cards read as broken. */
  return (
    <Rise delay={delay} className="h-full">
      <Card className="h-full px-5 py-4 transition-shadow duration-300 hover:shadow-2xl hover:shadow-slate-300/50">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.75rem] font-medium text-slate-500">{label}</p>
            <p
              className={cn(
                "tnum mt-1 text-[1.75rem] font-bold leading-none tracking-tight",
                hot ? "text-amber-600" : "text-slate-900",
              )}
            >
              {value}
            </p>
            {sub && <p className="mt-1.5 text-[0.6875rem] text-slate-400">{sub}</p>}
          </div>
          {icon && <IconChip color={hot ? "amber" : color}>{icon}</IconChip>}
        </div>
      </Card>
    </Rise>
  );
}

/* ------------------------------------------------------------------
   controls
   ------------------------------------------------------------------ */

export function Btn({
  variant = "primary",
  className,
  disabled,
  onClick,
  children,
}: {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-4 text-[0.8125rem] font-semibold transition-all duration-200 active:scale-95 disabled:pointer-events-none disabled:opacity-40",
        variant === "primary" &&
          "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-500",
        variant === "secondary" &&
          "border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:text-slate-900",
        variant === "ghost" && "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
        variant === "danger" &&
          "bg-rose-600 text-white shadow-lg shadow-rose-500/25 hover:bg-rose-500",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        "h-10 w-56 rounded-xl border border-slate-200 bg-white px-3.5 text-[0.8125rem] text-slate-800 shadow-sm transition-colors placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/15",
        className,
      )}
    />
  );
}

export const inputCls =
  "h-10 rounded-xl border border-slate-200 bg-white px-3 text-[0.8125rem] text-slate-800 shadow-sm transition-colors placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/15";

export const selectCls =
  "h-10 rounded-xl border border-slate-200 bg-white px-2.5 text-[0.8125rem] text-slate-700 shadow-sm transition-colors hover:border-slate-300 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/15";

/** Multi-line sibling of inputCls: same skin, natural height. */
export const textareaCls =
  "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[0.8125rem] text-slate-800 shadow-sm transition-colors placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/15";

/* ------------------------------------------------------------------
   badges
   ------------------------------------------------------------------ */

export type BadgeTone = "emerald" | "amber" | "rose" | "slate" | "indigo" | "sky";

const BADGE: Record<BadgeTone, string> = {
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
  amber: "bg-amber-50 text-amber-700 ring-amber-600/10",
  rose: "bg-rose-50 text-rose-700 ring-rose-600/10",
  slate: "bg-slate-100 text-slate-600 ring-slate-600/10",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-600/10",
  sky: "bg-sky-50 text-sky-700 ring-sky-600/10",
};

const BADGE_DOT: Record<BadgeTone, string> = {
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  slate: "bg-slate-400",
  indigo: "bg-indigo-500",
  sky: "bg-sky-500",
};

export function Badge({
  tone = "slate",
  dot,
  children,
}: {
  tone?: BadgeTone;
  dot?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold ring-1 ring-inset",
        BADGE[tone],
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", BADGE_DOT[tone])} />}
      {children}
    </span>
  );
}

/* Maps the workspace's evaluation tones onto the console's badges. */
export const EVAL_BADGE: Record<string, BadgeTone> = {
  open: "emerald",
  watch: "amber",
  brass: "amber",
  clay: "rose",
  muted: "slate",
  petrol: "indigo",
};

/* ------------------------------------------------------------------
   table primitives: one look for every table in the console
   ------------------------------------------------------------------ */

export function Th({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <th
      className={cn(
        "px-6 py-3 text-left text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-400",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="px-6 py-5 text-[0.8125rem] text-slate-500">{children}</p>;
}

/* ------------------------------------------------------------------
   identity: every client gets a stable gradient monogram, the way a
   real multi-tenant product renders accounts. Hashed from the name so
   it never changes between renders or deploys.
   ------------------------------------------------------------------ */

const MONOGRAM_GRADIENTS = [
  "from-indigo-500 to-violet-600",
  "from-sky-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-violet-500 to-purple-600",
];

export function Monogram({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const grad = MONOGRAM_GRADIENTS[h % MONOGRAM_GRADIENTS.length];
  const initials = name
    .split(/\s+/)
    .filter((w) => /^[a-z0-9]/i.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br font-bold text-white shadow-md",
        grad,
        size === "sm"
          ? "h-8 w-8 text-[0.6875rem]"
          : size === "lg"
            ? "h-12 w-12 rounded-2xl text-[1rem]"
            : "h-10 w-10 text-[0.8125rem]",
        className,
      )}
    >
      {initials || "?"}
    </span>
  );
}

/* ------------------------------------------------------------------
   data display
   ------------------------------------------------------------------ */

/** A thin progress bar that states completion honestly. */
export function ProgressBar({
  value,
  className,
  tone,
}: {
  /** 0..1 */
  value: number;
  className?: string;
  /** Defaults by completion: full = emerald, partial = amber, none = slate. */
  tone?: "emerald" | "amber" | "indigo" | "slate";
}) {
  const v = Math.max(0, Math.min(1, value));
  const auto = v >= 1 ? "emerald" : v > 0 ? "amber" : "slate";
  const color = {
    emerald: "bg-emerald-500",
    amber: "bg-amber-400",
    indigo: "bg-indigo-500",
    slate: "bg-slate-300",
  }[tone ?? auto];
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-slate-100", className)}>
      <div
        className={cn("h-full rounded-full transition-[width] duration-700", color)}
        style={{ width: `${v * 100}%` }}
      />
    </div>
  );
}

/** Tiny bar chart, pure divs. `hot` bars carry the accent. */
export function BarSpark({
  data,
  className,
  barClass = "bg-white/30",
  hotClass = "bg-amber-400",
}: {
  data: { v: number; hot?: boolean; label?: string }[];
  className?: string;
  barClass?: string;
  hotClass?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.v));
  return (
    <div className={cn("flex h-16 items-end gap-1.5", className)}>
      {data.map((d, i) => (
        <div
          key={i}
          title={d.label}
          className={cn(
            "flex-1 rounded-t-md transition-all duration-500",
            d.hot ? hotClass : barClass,
          )}
          style={{ height: `${Math.max(8, (d.v / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

/** The QT2 channel-toggle idiom: a segmented control in a sunken pill. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex rounded-xl bg-slate-100 p-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-[0.75rem] font-semibold transition-all duration-200",
            value === o.value
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700",
          )}
        >
          {o.label}
          {o.count !== undefined && (
            <span
              className={cn(
                "tnum rounded-full px-1.5 py-0.5 text-[0.625rem] font-bold",
                value === o.value
                  ? "bg-indigo-50 text-indigo-700"
                  : "bg-slate-200/70 text-slate-500",
              )}
            >
              {o.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/**
 * The POV switch: one product, two seats. Blatant by design — it sits
 * in both topbars so anyone demoing can flip between what the client
 * sees and what operations sees. Rides the demo session; staff auth
 * scopes it later.
 */
export function PovToggle({ current }: { current: "client" | "admin" }) {
  const base =
    "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-[0.75rem] font-semibold transition-all duration-200";
  return (
    <div className="flex shrink-0 rounded-xl bg-slate-100 p-1">
      <a
        href="/app"
        className={cn(
          base,
          current === "client"
            ? "bg-white text-slate-900 shadow-sm"
            : "text-slate-500 hover:text-slate-700",
        )}
      >
        Client view
      </a>
      <a
        href="/admin"
        className={cn(
          base,
          current === "admin"
            ? "bg-white text-slate-900 shadow-sm"
            : "text-slate-500 hover:text-slate-700",
        )}
      >
        Admin
      </a>
    </div>
  );
}

/** Red notification bubble, the QT2 bell-badge idiom. */
export function CountBubble({ n, className }: { n: number; className?: string }) {
  if (n <= 0) return null;
  return (
    <span
      className={cn(
        "tnum flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[0.625rem] font-bold text-white shadow-sm",
        className,
      )}
    >
      {n > 99 ? "99+" : n}
    </span>
  );
}
