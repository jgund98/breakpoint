import type { Metadata } from "next";
import { Wizard } from "@/components/onboarding/Wizard";

export const metadata: Metadata = {
  title: "Account setup",
  robots: { index: false, follow: false },
};

export default function OnboardingPage() {
  return <Wizard />;
}
