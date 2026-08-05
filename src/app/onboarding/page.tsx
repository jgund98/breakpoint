import type { Metadata } from "next";
import { Wizard } from "@/components/onboarding/Wizard";
import { WorkspaceProvider } from "@/components/app/WorkspaceProvider";

export const metadata: Metadata = {
  title: "Account setup",
  robots: { index: false, follow: false },
};

export default function OnboardingPage() {
  return (
    <WorkspaceProvider>
      <Wizard />
    </WorkspaceProvider>
  );
}
