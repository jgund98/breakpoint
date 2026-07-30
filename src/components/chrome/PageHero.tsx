import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export function PageHero({
  eyebrow,
  title,
  accent,
  lede,
  photo,
  photoAlt,
  cta,
  children,
}: {
  eyebrow: string;
  title: string;
  /** Rendered in display italic beneath the title. */
  accent?: string;
  lede: React.ReactNode;
  photo?: string;
  photoAlt?: string;
  cta?: { href: string; label: string };
  children?: React.ReactNode;
}) {
  const wide = !photo;
  return (
    <section className="relative overflow-hidden bg-petrol-900 pt-32 pb-16 text-cream sm:pt-36 sm:pb-20 lg:pt-44 lg:pb-24">
      <div className="plan-grid-dark mask-fade absolute inset-0 opacity-60" />

      <div className="relative mx-auto max-w-[1400px] px-5 sm:px-8">
        <div
          className={cn(
            "grid gap-10",
            !wide && "lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-14",
          )}
        >
          <div className={cn(wide && "max-w-3xl")}>
            <p className="label text-brass-400">{eyebrow}</p>
            <h1 className="balance mt-5 text-[clamp(2.25rem,5.6vw,4rem)] text-cream">
              {title}
              {accent && (
                <span className="display-em block text-brass-200">{accent}</span>
              )}
            </h1>
            <div className="lede no-orphan mt-6 max-w-2xl text-cream-soft">
              {lede}
            </div>
            {cta && (
              <div className="mt-8">
                <Button href={cta.href} variant="onDark">
                  {cta.label}
                </Button>
              </div>
            )}
            {children}
          </div>

          {photo && (
            <div className="relative aspect-4/3 overflow-hidden rounded-xl lift-lg">
              <Image
                src={photo}
                alt={photoAlt ?? ""}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 46vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-petrol-950/15 mix-blend-multiply" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
