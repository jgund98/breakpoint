import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The admin surface's section system. Every block on every board is a
 * Section: same radius, same border, same header band, same type
 * scale, aside slot top-right. Stat strips are StatTiles in the same
 * grid everywhere. Nothing on a board is allowed to invent its own
 * frame — uniformity is the design.
 */

export function Section({
  title,
  blurb,
  aside,
  flush,
  children,
}: {
  title: string;
  blurb?: string;
  /** Right side of the header band: a count, a control, a button. */
  aside?: ReactNode;
  /** Tables and lists sit flush; forms get the padded body. */
  flush?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line px-5 py-3">
        <div className="min-w-0">
          <h2 className="text-[0.875rem] font-semibold text-ink">{title}</h2>
          {blurb && (
            <p className="mt-0.5 max-w-[52rem] text-[0.75rem] leading-snug text-muted">
              {blurb}
            </p>
          )}
        </div>
        {aside && <div className="flex shrink-0 items-center gap-2">{aside}</div>}
      </div>
      <div className={flush ? undefined : "px-5 py-4"}>{children}</div>
    </section>
  );
}

export function StatStrip({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
      {children}
    </div>
  );
}

export function StatTile({
  label,
  value,
  hot,
}: {
  label: string;
  value: ReactNode;
  /** Brass when it demands attention, green when it is at rest. */
  hot?: boolean;
}) {
  return (
    <div className="bg-surface px-5 py-3.5">
      <p className="label text-faint">{label}</p>
      <p
        className={cn(
          "tnum font-display mt-1 text-[1.375rem] leading-none",
          hot ? "text-brass-700" : "text-open-700",
        )}
      >
        {value}
      </p>
    </div>
  );
}

/** The one search box style used on every board. */
export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-52 rounded-md border border-line bg-surface px-2.5 py-1.5 text-[0.75rem] text-ink placeholder:text-faint focus:border-petrol-500 focus:outline-none"
    />
  );
}
