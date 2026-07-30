import { Hero } from "@/components/home/Hero";
import { Problem } from "@/components/home/Problem";
import { TheCenter } from "@/components/home/TheCenter";
import { NoticeClock } from "@/components/home/NoticeClock";
import { HowItWorks } from "@/components/home/HowItWorks";
import { Workspace } from "@/components/home/Workspace";
import { Wedge } from "@/components/home/Wedge";

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
      <NoticeClock />
      <HowItWorks />
      <Workspace />
      <Wedge />
    </>
  );
}
