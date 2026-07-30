import { cn } from "@/lib/cn";

type Tone = "canvas" | "surface" | "sunk" | "petrol" | "petrol-deep";

const toneClass: Record<Tone, string> = {
  canvas: "bg-canvas text-ink",
  surface: "bg-surface text-ink",
  sunk: "bg-surface-sunk text-ink",
  petrol: "bg-petrol-800 text-cream",
  "petrol-deep": "bg-petrol-900 text-cream",
};

export function Section({
  tone = "canvas",
  id,
  className,
  containerClassName,
  grid,
  children,
}: {
  tone?: Tone;
  id?: string;
  className?: string;
  containerClassName?: string;
  grid?: boolean;
  children: React.ReactNode;
}) {
  const dark = tone === "petrol" || tone === "petrol-deep";
  return (
    <section
      id={id}
      className={cn(
        "relative overflow-hidden py-20 sm:py-24 lg:py-32",
        toneClass[tone],
        className,
      )}
    >
      {grid && (
        <div
          aria-hidden
          className={cn(
            "mask-fade absolute inset-0",
            dark ? "plan-grid-dark opacity-60" : "plan-grid opacity-50",
          )}
        />
      )}
      <div
        className={cn(
          "relative mx-auto max-w-[1400px] px-5 sm:px-8",
          containerClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}

export function Eyebrow({
  children,
  className,
  tone = "petrol",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "petrol" | "brass" | "mute";
}) {
  return (
    <p
      className={cn(
        "label",
        tone === "petrol" && "text-petrol-600",
        tone === "brass" && "text-brass-400",
        tone === "mute" && "text-faint",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function SectionTitle({
  children,
  className,
  as: Tag = "h2",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <Tag
      className={cn(
        "balance mt-5 text-[clamp(1.9rem,4.4vw,3.25rem)]",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function Lede({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("lede no-orphan mt-6 max-w-2xl text-ink-soft", className)}>
      {children}
    </p>
  );
}
