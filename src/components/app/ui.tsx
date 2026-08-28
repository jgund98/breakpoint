import Link from "next/link";
import { cn } from "@/lib/cn";

/* ============================================================
   Product primitives.

   The marketing site is a document; this is an instrument. The
   instrument's finish follows the console's design system: white
   cards with generous radius and layered slate shadows, slate
   neutrals, indigo as the one accent, amber where money moves.
   Tabular numerals everywhere a number can be compared to another
   number.
   ============================================================ */

export type Tone = "open" | "watch" | "brass" | "clay" | "muted" | "petrol";

export const toneChip: Record<Tone, string> = {
  open: "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
  watch: "bg-amber-50 text-amber-700 ring-amber-600/10",
  brass: "bg-amber-400 text-slate-900 ring-amber-400",
  clay: "bg-rose-50 text-rose-700 ring-rose-600/10",
  muted: "bg-slate-100 text-slate-600 ring-slate-600/10",
  petrol: "bg-indigo-50 text-indigo-700 ring-indigo-600/10",
};

export const toneDot: Record<Tone, string> = {
  open: "bg-emerald-500",
  watch: "bg-amber-500",
  brass: "bg-amber-500",
  clay: "bg-rose-500",
  muted: "bg-slate-400",
  petrol: "bg-indigo-500",
};

/**
 * Dot color when the dot sits INSIDE a chip. The brass chip is the one
 * filled state in the set, so an amber dot on it is invisible: it needs
 * to invert. Every other tone has a soft background and can use its own
 * color. Without this, "Claimable" renders as the only status pill
 * with no dot at all, which reads as a different component.
 */
export const chipDot: Record<Tone, string> = {
  ...toneDot,
  brass: "bg-slate-900",
};

export const toneBar: Record<Tone, string> = {
  open: "bg-emerald-500",
  watch: "bg-amber-500",
  brass: "bg-amber-500",
  clay: "bg-rose-500",
  muted: "bg-slate-400",
  petrol: "bg-indigo-500",
};

export function Pill({
  tone = "muted",
  children,
  className,
  dot = false,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold whitespace-nowrap ring-1 ring-inset",
        toneChip[tone],
        className,
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", chipDot[tone])} />}
      {children}
    </span>
  );
}

export function Panel({
  children,
  className,
  flush = false,
}: {
  children: React.ReactNode;
  className?: string;
  flush?: boolean;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-slate-200/60 bg-white shadow-xl shadow-slate-200/50",
        flush ? "" : "p-5 sm:p-6",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function PanelHead({
  title,
  hint,
  right,
  className,
}: {
  title: string;
  hint?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <h2 className="text-[0.9375rem] font-semibold tracking-tight text-slate-900">
          {title}
        </h2>
        {hint && (
          <p className="no-orphan mt-1 text-[0.8125rem] leading-relaxed text-slate-500">
            {hint}
          </p>
        )}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

/**
 * The one metric card.
 *
 * There were three of these at one point: this one, a p-4 variant with a
 * 1.5rem number, and a p-5 variant with a 1.75rem number that colored
 * the figure itself. Five pages each carried their own. Rows of them sat
 * next to each other at different weights, which is exactly the thing
 * that reads as unfinished however good the underlying numbers are.
 * Color belongs on the dot, not the number, so the figures all share one
 * weight and the eye can compare them.
 */
export function Stat({
  label,
  value,
  sub,
  tone = "petrol",
  href,
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: Tone;
  href?: string;
  className?: string;
}) {
  const body = (
    <>
      <div className="flex items-center gap-2">
        <span className={cn("h-1.5 w-1.5 rounded-full", toneDot[tone])} />
        <span className="text-[0.75rem] font-medium text-slate-500">{label}</span>
      </div>
      <p className="tnum mt-3 text-[1.875rem] leading-none font-bold tracking-tight text-slate-900">
        {value}
      </p>
      {sub && (
        <p className="no-orphan mt-2 text-[0.8125rem] leading-snug text-slate-500">
          {sub}
        </p>
      )}
    </>
  );

  /* h-full so a card whose sub-line wraps to two lines does not stand
     taller than the ones beside it. Grid children stretch, but the card
     inside the motion wrapper has to be told to fill that height. */
  const cls =
    "block h-full rounded-2xl border border-slate-200/60 bg-white p-5 shadow-xl shadow-slate-200/50 transition-all duration-300";

  return href ? (
    <Link
      href={href}
      className={cn(
        cls,
        "hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-slate-300/50",
        className,
      )}
    >
      {body}
    </Link>
  ) : (
    <div className={cn(cls, className)}>{body}</div>
  );
}

/** A threshold meter. The line is the requirement; the fill is reality. */
export function Meter({
  ratio,
  tone,
  label,
}: {
  ratio: number;
  tone: Tone;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(1.35, ratio)) / 1.35;
  const threshold = 1 / 1.35;
  return (
    <div>
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn("absolute inset-y-0 left-0 rounded-full transition-[width] duration-500", toneBar[tone])}
          style={{ width: `${pct * 100}%` }}
        />
        <div
          className="absolute inset-y-0 w-px bg-slate-900/30"
          style={{ left: `${threshold * 100}%` }}
        />
      </div>
      {label && <p className="mt-1.5 text-[0.75rem] text-slate-500">{label}</p>}
    </div>
  );
}

export function KeyValue({
  items,
  className,
}: {
  items: { k: string; v: React.ReactNode }[];
  className?: string;
}) {
  return (
    <dl className={cn("divide-y divide-slate-100", className)}>
      {items.map((it) => (
        <div key={it.k} className="flex items-baseline justify-between gap-6 py-2.5">
          <dt className="text-[0.8125rem] text-slate-500">{it.k}</dt>
          <dd className="tnum text-right text-[0.8125rem] font-medium text-slate-900">
            {it.v}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function Note({
  tone = "muted",
  title,
  children,
}: {
  tone?: Tone;
  title?: string;
  children: React.ReactNode;
}) {
  const ring: Record<Tone, string> = {
    open: "border-emerald-100 bg-emerald-50",
    watch: "border-amber-200 bg-amber-50",
    brass: "border-amber-200 bg-amber-50",
    clay: "border-rose-100 bg-rose-50",
    muted: "border-slate-200 bg-slate-50",
    petrol: "border-indigo-100 bg-indigo-50",
  };
  return (
    <div className={cn("rounded-xl border p-4", ring[tone])}>
      {title && (
        <p className="text-[0.8125rem] font-semibold text-slate-900">{title}</p>
      )}
      <div className={cn("text-[0.8125rem] leading-relaxed text-slate-600", title && "mt-1.5")}>
        {children}
      </div>
    </div>
  );
}

/** Buttons inside the product. */
export function ActionButton({
  children,
  variant = "primary",
  className,
  ...rest
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "quiet" | "brass";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const styles = {
    primary:
      "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-500",
    secondary:
      "border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:text-slate-900",
    quiet: "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
    brass:
      "bg-amber-400 text-slate-900 shadow-lg shadow-amber-500/30 hover:bg-amber-300",
  };
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-[0.8125rem] font-semibold whitespace-nowrap transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100",
        styles[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  children,
  variant = "secondary",
  className,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "brass";
  className?: string;
}) {
  const styles = {
    primary:
      "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-500",
    secondary:
      "border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:text-slate-900",
    brass:
      "bg-amber-400 text-slate-900 shadow-lg shadow-amber-500/30 hover:bg-amber-300",
  };
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-[0.8125rem] font-semibold whitespace-nowrap transition-all duration-200 active:scale-95",
        styles[variant],
        className,
      )}
    >
      {children}
    </Link>
  );
}

/**
 * What a page shows before there is anything to show.
 *
 * Every account is empty on day one, and several pages rendered bare
 * tables in that state. An empty screen reads as a broken product; it
 * should say what will appear here and what makes it appear.
 */
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="px-6 py-14 text-center">
      <p className="text-[0.9375rem] font-semibold text-slate-900">{title}</p>
      <p className="mx-auto mt-1.5 max-w-md text-[0.8125rem] leading-relaxed text-slate-500">
        {body}
      </p>
      {action && (
        <LinkButton href={action.href} className="mt-4">
          {action.label}
        </LinkButton>
      )}
    </div>
  );
}

/**
 * Page header, at application scale rather than marketing scale.
 *
 * A workspace is not a landing page: the title is a label for where you
 * are, not a headline, and the subtitle is one line of orientation, not
 * a paragraph.
 */
export function PageHead({
  title,
  lede,
  right,
}: {
  /** Accepted for compatibility; the sidebar already says the group. */
  eyebrow?: string;
  title: string;
  /** One short line. Long explanations belong in `help`. */
  lede?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-1 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[1.375rem] font-bold tracking-tight text-slate-900">
          {title}
        </h1>
        {lede && (
          <p className="mt-1 max-w-2xl text-[0.8125rem] leading-relaxed text-slate-500">
            {lede}
          </p>
        )}
      </div>
      {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
    </div>
  );
}
