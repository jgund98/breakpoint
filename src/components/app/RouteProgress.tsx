"use client";

/**
 * The completion sweep: a 2px gradient bar that crosses the top of the
 * frame when navigation lands. One-shot CSS, transform-only, keyed by
 * pathname so every route change replays it. The first paint of a
 * session does not sweep; arriving is not an event.
 */
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export function RouteProgress() {
  const pathname = usePathname();
  const [runId, setRunId] = useState(0);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setRunId((k) => k + 1);
  }, [pathname]);

  if (runId === 0) return null;
  return (
    <div
      key={runId}
      aria-hidden
      className="bp-route-progress pointer-events-none fixed inset-x-0 top-0 z-[70] h-0.5"
    />
  );
}
