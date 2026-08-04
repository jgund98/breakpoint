"use client";

import { usePathname } from "next/navigation";

/**
 * Hides the (server-rendered) footer on the lock screen. Children stay
 * a server component; this only decides whether they show.
 */
export function FooterGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/unlock")) return null;
  return <>{children}</>;
}
