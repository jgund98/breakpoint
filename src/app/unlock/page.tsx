import type { Metadata } from "next";
import { LogoBadge } from "@/components/brand/Logo";
import { UnlockForm } from "./UnlockForm";

export const metadata: Metadata = {
  title: "Private preview",
  robots: { index: false, follow: false },
};

/**
 * The lock screen. Deliberately spare: badge, one field, no nav, no
 * links out — nothing to see until the password goes in.
 */
export default async function UnlockPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-petrol-950 px-5">
      <div className="plan-grid-dark absolute inset-0 opacity-50" aria-hidden />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-[20%] left-1/2 h-[28rem] w-[36rem] -translate-x-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, rgba(79,70,229,0.28), transparent 72%)",
        }}
      />

      <div className="relative w-full max-w-sm text-center">
        <LogoBadge className="mx-auto h-14 w-14" />
        <h1 className="mt-6 text-[1.625rem] text-cream">Private preview</h1>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-cream-soft">
          Breakpoint isn&#8217;t public yet. Enter the access password to
          continue.
        </p>
        <UnlockForm next={next} />
      </div>
    </main>
  );
}
