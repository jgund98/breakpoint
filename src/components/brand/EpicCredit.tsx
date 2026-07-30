import Image from "next/image";
import { site } from "@/lib/site";

/**
 * Build credit. Blended into the footer rule, but legible — the real
 * Epic mark at a real size, never a microscopic afterthought.
 */
export function EpicCredit() {
  return (
    <a
      href={site.builtBy.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group inline-flex shrink-0 items-center gap-2.5 text-cream-faint transition-colors hover:text-cream-soft"
    >
      <span className="text-xs whitespace-nowrap">Site by</span>
      <Image
        src="/brand/epic-logo-white-sm.png"
        alt={site.builtBy.name}
        width={440}
        height={106}
        className="h-[19px] w-auto opacity-65 transition-opacity duration-300 group-hover:opacity-100"
      />
    </a>
  );
}
