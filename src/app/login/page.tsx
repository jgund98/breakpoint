import type { Metadata } from "next";
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
        className="pointer-events-none absolute -left-[20%] -top-[25%] h-[55vh] w-[55vw] rounded-full bg-petrol-100/60 blur-[100px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-[30%] -right-[15%] h-[50vh] w-[45vw] rounded-full bg-brass-200/35 blur-[110px]"
      />
      <LoginCard />
    </section>
  );
}
