"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Field-guide navigation: smooth same-page scrolling (route changes
 * stay instant) and a live highlight that tracks the section under
 * the reader. Vertical rail on desktop, horizontal chips on phones.
 */
export function GuideToc({
  items,
}: {
  items: readonly { id: string; label: string }[];
}) {
  const [active, setActive] = useState<string>(items[0]?.id ?? "");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id);
        }
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items]);

  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    history.replaceState(null, "", `#${id}`);
  };

  return (
    <>
      {/* phones: chip rail */}
      <div className="scroll-x-clean -mx-5 overflow-x-auto px-5 lg:hidden">
        <div className="flex min-w-max gap-2">
          {items.map((t) => (
            <a
              key={t.id}
              href={`#${t.id}`}
              onClick={go(t.id)}
              className={cn(
                "rounded-full border px-3.5 py-2 text-[0.8125rem] font-medium whitespace-nowrap transition-colors duration-300",
                active === t.id
                  ? "border-petrol-800 bg-petrol-800 text-cream"
                  : "border-line bg-surface text-ink-soft",
              )}
            >
              {t.label}
            </a>
          ))}
        </div>
      </div>

      {/* desktop: vertical rail */}
      <ul className="mt-4 hidden space-y-1 lg:block">
        {items.map((t) => (
          <li key={t.id}>
            <a
              href={`#${t.id}`}
              onClick={go(t.id)}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[0.9375rem] transition-colors duration-300",
                active === t.id
                  ? "bg-petrol-50 font-medium text-petrol-800"
                  : "text-ink-soft hover:bg-surface-sunk hover:text-ink",
              )}
            >
              <span
                className={cn(
                  "h-1 w-1 shrink-0 rounded-full transition-colors duration-300",
                  active === t.id ? "bg-brass-500" : "bg-line",
                )}
              />
              {t.label}
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}
