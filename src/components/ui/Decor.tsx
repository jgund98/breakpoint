import { cn } from "@/lib/cn";

/**
 * Ambient decoration, derived from the brand instead of a texture
 * library. Two instruments:
 *
 *  - Glow: a soft color pool. Vibrance without noise.
 *  - MarkMotif: the step-down logo mark, blown up to architectural
 *    scale and faded — the site's own geometry doing the wallpaper's
 *    job. Never a generic grid.
 */

export function Glow({
  className,
  color,
}: {
  className: string;
  color: string;
}) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute rounded-full", className)}
      style={{
        background: `radial-gradient(closest-side, ${color}, transparent 72%)`,
      }}
    />
  );
}

export function MarkMotif({
  tone = "dark",
  className,
}: {
  tone?: "dark" | "light";
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden
      className={cn(
        "pointer-events-none absolute",
        tone === "dark" ? "text-petrol-300/[0.07]" : "text-petrol-600/[0.05]",
        className,
      )}
      style={{
        maskImage: "linear-gradient(135deg, #000 30%, transparent 85%)",
        WebkitMaskImage: "linear-gradient(135deg, #000 30%, transparent 85%)",
      }}
    >
      <rect x="12.25" y="11.5" width="7.5" height="18.5" rx="2.5" fill="currentColor" />
      <rect
        x="12.25"
        y="2"
        width="7.5"
        height="7.5"
        rx="2.2"
        className={tone === "dark" ? "fill-brass-400/60" : "fill-brass-500/50"}
      />
    </svg>
  );
}

/** The standard ambient set for a dark petrol band. */
export function DarkDecor() {
  return (
    <>
      <Glow className="-right-[10%] -top-[30%] h-[28rem] w-[28rem]" color="rgba(79,70,229,0.25)" />
      <Glow className="-bottom-[35%] -left-[8%] h-[24rem] w-[24rem]" color="rgba(217,154,43,0.10)" />
      <MarkMotif tone="dark" className="-right-24 -top-24 h-[38rem] w-[38rem] rotate-[-10deg]" />
    </>
  );
}

/** The standard ambient set for a light band. */
export function LightDecor() {
  return (
    <>
      <Glow className="-left-[12%] -top-[35%] h-[26rem] w-[26rem]" color="rgba(224,229,255,0.70)" />
      <Glow className="-bottom-[40%] -right-[10%] h-[24rem] w-[24rem]" color="rgba(243,215,156,0.40)" />
    </>
  );
}
