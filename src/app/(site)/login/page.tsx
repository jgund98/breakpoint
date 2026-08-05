import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginCard } from "@/components/forms/LoginCard";

export const metadata: Metadata = {
  title: "Log in",
  description: "Sign in to your Breakpoint workspace.",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: true },
};

export default function LoginPage() {
  return (
    <section className="relative flex min-h-svh items-center justify-center overflow-hidden bg-canvas px-5 py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-[20%] -top-[25%] h-[55vh] w-[55vw] rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, rgba(224,229,255,0.6), transparent 72%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-[30%] -right-[15%] h-[50vh] w-[45vw] rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, rgba(243,215,156,0.35), transparent 72%)",
        }}
      />
      {/* LoginCard reads the ?next= param, so it needs a boundary for
          this page to stay statically rendered. */}
      <Suspense fallback={<div className="h-[560px] w-full max-w-md" />}>
        <LoginCard />
      </Suspense>
    </section>
  );
}
