import { Hero } from "@/components/home/Hero";
import { Problem } from "@/components/home/Problem";
import { TheCenter } from "@/components/home/TheCenter";
import { NoticeClock } from "@/components/home/NoticeClock";
import { HowItWorks } from "@/components/home/HowItWorks";
import { Wedge } from "@/components/home/Wedge";

/**
 * Home = the tenant pitch, six beats, no filler:
 * hook → the detection gap → the interactive proof → the urgency
 * mechanism → how it works (compact, links to /platform) → why it's a
 * category. Onboarding detail lives on /tenants and /demo; the full
 * pipeline on /platform.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <Problem />
      <TheCenter />
      <NoticeClock />
      <HowItWorks />
      <Wedge />
    </>
  );
}
