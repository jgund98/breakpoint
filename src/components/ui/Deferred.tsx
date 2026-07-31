"use client";

import { useRef } from "react";
import { useInView } from "motion/react";

/**
 * Defers mounting (and therefore chunk download + hydration) until the
 * reader is within ~1.5 viewports. The placeholder holds layout so
 * nothing shifts. This is what keeps first-load main-thread work small
 * on phones: below-fold interactivity simply doesn't exist yet.
 */
export function Deferred({
  children,
  minHeight,
  className,
}: {
  children: React.ReactNode;
  /** Approximate height of the deferred content, to prevent layout shift. */
  minHeight: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const near = useInView(ref, { margin: "150% 0px", once: true });

  return (
    <div ref={ref} className={className} style={near ? undefined : { minHeight }}>
      {near ? children : null}
    </div>
  );
}
