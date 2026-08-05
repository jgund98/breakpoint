import Link from "next/link";
import { cn } from "@/lib/cn";

/* ============================================================
   Product primitives.

   The marketing site is a document; this is an instrument. Tighter
   radii, denser type, tabular numerals everywhere a number can be
   compared to another number.
   ============================================================ */

export type Tone = "open" | "watch" | "brass" | "clay" | "muted" | "petrol";

export const toneChip: Record<Tone, string> = {
  open: "bg-open-50 text-open-700 ring-open-100",
  watch: "bg-brass-50 text-brass-700 ring-brass-200",
  brass: "bg-brass-500 text-petrol-950 ring-brass-500",
  clay: "bg-clay-50 text-clay-700 ring-clay-100",
  muted: "bg-surface-sunk text-muted ring-line",
  petrol: "bg-petrol-50 text-petrol-800 ring-petrol-100",
};

export const toneDot: Record<Tone, string> = {
  open: "bg-open-600",
  watch: "bg-brass-500",
  brass: "bg-brass-500",
  clay: "bg-clay-500",
  muted: "bg-faint",
  petrol: "bg-petrol-600",
};

/**
 * Dot colour when the dot sits INSIDE a chip. The brass chip is the one
 * filled state in the set, so a brass dot on it is invisible: it needs
 * to invert. Every other tone has a soft background and can use its own
 * colour. Without this, "Claimable" renders as the only status pill
 * with no dot at all, which reads as a different component.
 */
export const chipDot: Record<Tone, string> = {
  ...toneDot,
  brass: "bg-petrol-950",
};

export const toneBar: Record<Tone, string> = {
  open: "bg-open-600",
  watch: "bg-brass-500",
  brass: "bg-brass-500",
  clay: "bg-clay-500",
  muted: "bg-faint",
  petrol: "bg-petrol-600",
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
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[0.6875rem] font-semibold whitespace-nowrap ring-1 ring-inset",
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
        "rounded-2xl border border-line bg-surface",
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
        <h2 className="text-[0.9375rem] font-semibold text-ink">{title}</h2>
        {hint && (
          <p className="no-orphan mt-1 text-[0.8125rem] leading-relaxed text-muted">
            {hint}
          </p>
        )}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
  tone = "petrol",
  href,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: Tone;
  href?: string;
}) {
  const body = (
    <>
      <div className="flex items-center gap-2">
        <span className={cn("h-1.5 w-1.5 rounded-full", toneDot[tone])} />
        <span className="label text-muted">{label}</span>
      </div>
      <p className="tnum font-display mt-3 text-[1.875rem] leading-none text-ink">
        {value}
      </p>
      {sub && (
        <p className="no-orphan mt-2 text-[0.8125rem] leading-snug text-muted">
          {sub}
        </p>
      )}
    </>
  );

  const cls =
    "block rounded-2xl border border-line bg-surface p-5 transition-colors duration-300";

  return href ? (
    <Link href={href} className={cn(cls, "hover:border-petrol-300 hover:bg-petrol-50/40")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
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
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-surface-sunk">
        <div
          className={cn("absolute inset-y-0 left-0 rounded-full transition-[width] duration-500", toneBar[tone])}
          style={{ width: `${pct * 100}%` }}
        />
        <div
          className="absolute inset-y-0 w-px bg-ink/35"
          style={{ left: `${threshold * 100}%` }}
        />
      </div>
      {label && <p className="mt-1.5 text-[0.75rem] text-muted">{label}</p>}
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
    <dl className={cn("divide-y divide-line", className)}>
      {items.map((it) => (
        <div key={it.k} className="flex items-baseline justify-between gap-6 py-2.5">
          <dt className="text-[0.8125rem] text-muted">{it.k}</dt>
          <dd className="tnum text-right text-[0.8125rem] font-medium text-ink">
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
    open: "border-open-100 bg-open-50",
    watch: "border-brass-200 bg-brass-50",
    brass: "border-brass-200 bg-brass-50",
    clay: "border-clay-100 bg-clay-50",
    muted: "border-line bg-surface-sunk",
    petrol: "border-petrol-100 bg-petrol-50",
  };
  return (
    <div className={cn("rounded-xl border p-4", ring[tone])}>
      {title && (
        <p className="text-[0.8125rem] font-semibold text-ink">{title}</p>
      )}
      <div className={cn("text-[0.8125rem] leading-relaxed text-ink-soft", title && "mt-1.5")}>
        {children}
      </div>
    </div>
  );
}

/** Buttons inside the product. Squarer than the marketing site's pills. */
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
    primary: "bg-petrol-800 text-cream hover:bg-petrol-700",
    secondary: "border border-line bg-surface text-ink hover:border-petrol-300 hover:bg-petrol-50",
    quiet: "text-ink-soft hover:bg-surface-sunk",
    brass: "bg-brass-500 text-petrol-950 hover:bg-brass-400",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[0.8125rem] font-semibold whitespace-nowrap transition-colors duration-250 disabled:cursor-not-allowed disabled:opacity-40",
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
    primary: "bg-petrol-800 text-cream hover:bg-petrol-700",
    secondary: "border border-line bg-surface text-ink hover:border-petrol-300 hover:bg-petrol-50",
    brass: "bg-brass-500 text-petrol-950 hover:bg-brass-400",
  };
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[0.8125rem] font-semibold whitespace-nowrap transition-colors duration-250",
        styles[variant],
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function PageHead({
  eyebrow,
  title,
  lede,
  right,
}: {
  eyebrow?: string;
  title: string;
  lede?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-5">
      <div className="min-w-0 max-w-2xl">
        {eyebrow && <p className="label text-petrol-600">{eyebrow}</p>}
        <h1 className="mt-2 text-[clamp(1.6rem,3vw,2.125rem)]">{title}</h1>
        {lede && (
          <p className="no-orphan mt-2.5 text-[0.9375rem] leading-relaxed text-ink-soft">
            {lede}
          </p>
        )}
      </div>
      {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
    </div>
  );
}
