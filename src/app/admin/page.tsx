import { HQBoard } from "@/components/admin/HQBoard";

/**
 * Breakpoint HQ: the whole company on one screen.
 *
 * The client registry, the onboarding pipeline, and the system-wide
 * agent canon — all database-backed, nothing hardcoded to a client.
 * Everything scoped to one client lives on that client's board at
 * /admin/clients/[slug]. Rides the workspace session behind the site
 * lock until staff auth exists.
 */
export default function AdminHome() {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-petrol-950">
        <div className="mx-auto flex max-w-[80rem] flex-wrap items-baseline justify-between gap-3 px-6 py-3.5">
          <p className="text-[0.9375rem] font-semibold text-cream">
            Breakpoint <span className="font-normal text-cream/60">· Operations</span>
          </p>
          <p className="text-[0.75rem] text-cream/60">Internal · HQ</p>
        </div>
      </header>
      <HQBoard />
    </div>
  );
}

export const metadata = { title: "Operations" };
export const dynamic = "force-dynamic";
