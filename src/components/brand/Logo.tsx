import { cn } from "@/lib/cn";

/**
 * The Breakpoint mark.
 *
 * A rent line that steps down past a unit gone dark — two bars and a
 * brass square. The wordmark carries the same idea typographically:
 * set in Fraunces, with the tittle of the "i" replaced by the brass
 * step square. One glyph, one story, in both halves of the lockup.
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
      <rect x="0" y="7" width="12.5" height="5" rx="1" fill="currentColor" />
      <rect x="13.5" y="13.5" width="5" height="5" rx="1" fill={accent} />
      <rect x="19.5" y="20" width="12.5" height="5" rx="1" fill="currentColor" />
    </svg>
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
      <LogoMark className={cn("h-[20px] w-[20px]", markClassName)} />
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
