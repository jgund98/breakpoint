import dynamic from "next/dynamic";
import { Hero } from "@/components/home/Hero";
import { Problem } from "@/components/home/Problem";
import { TheCenter } from "@/components/home/TheCenter";
import { Workspace } from "@/components/home/Workspace";
import { Wedge } from "@/components/home/Wedge";

import { Deferred } from "@/components/ui/Deferred";

// Below-the-fold interactivity lives in deferred chunks that neither
// download nor hydrate until the reader approaches them.
const NoticeClock = dynamic(() =>
  import("@/components/home/NoticeClock").then((m) => m.NoticeClock),
);
const HowItWorks = dynamic(() =>
  import("@/components/home/HowItWorks").then((m) => m.HowItWorks),
);

/**
 * Home = the tenant pitch, seven beats:
 * hook → the detection gap → the interactive demo → the urgency
 * mechanism → how it works (live pipeline) → the workspace rendering →
 * why it's a category. Onboarding detail lives on /tenants and /demo;
 * the full pipeline on /platform.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <Problem />
      <TheCenter />
      <Deferred minHeight={900}>
        <NoticeClock />
      </Deferred>
      <Deferred minHeight={620}>
        <HowItWorks />
      </Deferred>
      <Workspace />
      <Wedge />
    </>
  );
}
