import { OnboardingWorkspace } from "@/components/onboarding/OnboardingWorkspace";

/**
 * The client-facing onboarding.
 *
 * Issued per client from the internal admin panel, which is where the
 * company, the expected store count and any client-specific tasks are
 * set. Until that exists this renders the catch-all configuration, which
 * is the one built to collect everything a large retail chain holds.
 *
 * Not behind the workspace sign-in on purpose: the people filling this
 * in are the client's lease administration and legal teams, who will not
 * have accounts until their portfolio is loaded.
 */
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; stores?: string }>;
}) {
  const q = await searchParams;
  const clientName = q.client?.trim() || "Abercrombie & Fitch";
  const stores = Number(q.stores) || 20;

  return (
    <OnboardingWorkspace
      clientName={clientName}
      clientSlug={clientName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}
      storeEstimate={stores}
    />
  );
}

export const metadata = { title: "Onboarding" };
