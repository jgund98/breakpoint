import { org, rows } from "@/lib/portfolio";
import { HQBoard, type ClientCard } from "@/components/admin/HQBoard";

/**
 * Breakpoint HQ: the level above the clients.
 *
 * System-wide agent programming, incoming onboarding submissions, and
 * the roster. Everything scoped to one client lives on that client's
 * board at /admin/clients/[slug]. Rides the workspace session behind
 * the site lock until staff auth exists.
 */
export default function AdminHome() {
  const clients: ClientCard[] = [
    {
      slug: org.slug,
      name: org.name,
      locations: rows.length,
      centers: new Set(rows.map((r) => r.center.id)).size,
    },
  ];

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
      <HQBoard clients={clients} />
    </div>
  );
}

export const metadata = { title: "Operations" };
export const dynamic = "force-dynamic";
