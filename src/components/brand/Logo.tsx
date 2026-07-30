import { cn } from "@/lib/cn";

/**
 * The Breakpoint mark: the indicator.
 *
 * The wordmark's signature is the brass square sitting as the tittle
 * of the dotless ı — so the mark IS that glyph, isolated: a column
 * with the brass indicator lit above it. It reads as the letter from
 * the name, and as a status flag raised over a location. One device,
 * everywhere.
 */
export function LogoMark({
  className,
  accent = "var(--color-brass-500)",
}: {
  className?: string;
  accent?: string;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <rect x="12.25" y="11.5" width="7.5" height="18.5" rx="2.5" fill="currentColor" />
      <rect x="12.25" y="2" width="7.5" height="7.5" rx="2.2" fill={accent} />
    </svg>
  );
}

/**
 * The mark as an app tile — indigo rounded square, glyph knocked out
 * in cream. This is the "product icon" cut used in navigation, the
 * favicon, and anywhere the brand sits on its own.
 */
export function LogoBadge({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center rounded-[26%] bg-linear-to-b from-petrol-700 to-petrol-900 text-cream shadow-[0_5px_14px_-5px_rgba(25,21,83,0.65)] ring-1 ring-white/15 ring-inset",
        className,
      )}
    >
      <LogoMark className="h-[62%] w-[62%]" />
    </span>
  );
}

/**
 * Typographic wordmark. Uses dotless ı (U+0131) with the brass step
 * square positioned as its tittle — sized in em so it scales with any
 * type size it's used at.
 */
export function LogoWord({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-display inline-block leading-none font-medium tracking-[-0.02em] whitespace-nowrap",
        className,
      )}
      aria-label="Breakpoint"
    >
      <span aria-hidden="true">
        Breakpo
        <span className="relative inline-block">
          ı
          <span
            className="absolute left-1/2 top-[0.06em] block -translate-x-1/2 rounded-[0.03em] bg-brass-500"
            style={{ width: "0.14em", height: "0.14em" }}
          />
        </span>
        nt
      </span>
    </span>
  );
}

export function Logo({
  className,
  markClassName,
  wordClassName,
  showWord = true,
}: {
  className?: string;
  markClassName?: string;
  wordClassName?: string;
  showWord?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoBadge className={cn("h-[26px] w-[26px]", markClassName)} />
      {showWord && <LogoWord className={cn("text-[1.375rem]", wordClassName)} />}
    </span>
  );
}

/**
 * Footer lockup — mark, word, and the category line, hairline-ruled.
 */
export function LogoLockup({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-x-3 gap-y-2", className)}>
      <Logo wordClassName="text-2xl" markClassName="h-[22px] w-[22px]" />
      <span className="hidden h-4 w-px bg-current opacity-20 xl:block" />
      <span className="label opacity-55 leading-none pt-px">
        Retail Lease Intelligence
      </span>
    </span>
  );
}
