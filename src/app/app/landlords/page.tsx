import Link from "next/link";
import { requirePortfolio } from "@/lib/portfolio-gate";
import { landlordBook } from "@/lib/landlords";
import { db } from "@/lib/db";
import { PageHead, Panel, Pill, Stat } from "@/components/app/ui";

/**
 * LANDLORDS — the negotiating view.
 *
 * A head of real estate does not negotiate lease by lease; they sit
 * across from Simon or Brookfield with the whole relationship on the
 * table. This page rolls the portfolio up by ownership family: doors,
 * live positions, what MAY qualify, and how that landlord has behaved
 * when noticed. It is the sheet you carry into a renewal meeting.
 */

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export default async function LandlordsPage() {
  const p = await requirePortfolio();
  const book = landlordBook(p);

  /* how each landlord has responded when we served notice */
  const { rows: noticeRows } = await db().query(
    `select location_ref, stage from notice_status where org_slug = $1`,
    [p.org.slug],
  );
  const stageByRef = new Map<string, string>(
    noticeRows.map((r: { location_ref: string; stage: string }) => [
      r.location_ref,
      r.stage,
    ]),
  );

  const withNotices = book.map((g) => {
    const served = g.locationIds.filter((id) => stageByRef.has(id));
    const responded = served.filter((id) =>
      ["acknowledged", "cured", "resolved"].includes(stageByRef.get(id)!),
    );
    const disputed = served.filter((id) => stageByRef.get(id) === "disputed");
    return { ...g, served: served.length, responded: responded.length, disputed: disputed.length };
  });

  const totalTriggered = book.reduce((n, g) => n + g.triggered, 0);
  const totalMonthly = book.reduce((n, g) => n + g.monthly, 0);
  const biggest = book[0];

  return (
    <div className="space-y-5">
      <PageHead
        eyebrow="Monitor"
        title="Landlords"
        lede="Your portfolio rolled up by ownership: every center a landlord controls, every live position under them, and how they have responded when put on notice."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Ownership families"
          value={book.length}
          sub="Resolved from center ownership records"
          tone="petrol"
        />
        <Stat
          label="Concentration"
          value={biggest ? `${biggest.doors} stores` : "—"}
          sub={biggest ? `Largest: ${biggest.name}` : undefined}
          tone="petrol"
        />
        <Stat
          label="Live positions"
          value={totalTriggered}
          sub="Across all landlords"
          tone={totalTriggered > 0 ? "watch" : "open"}
        />
        <Stat
          label="MAY qualify monthly"
          value={totalMonthly > 0 ? money(totalMonthly) : "$0"}
          sub="Subject to notice and each lease's clocks"
          tone={totalMonthly > 0 ? "brass" : "open"}
        />
      </div>

      <Panel flush>
        <div className="border-b border-slate-100 px-5 py-4">
          <p className="text-[0.9375rem] font-semibold text-slate-900">
            The book, by landlord
          </p>
          <p className="mt-0.5 max-w-[56rem] text-[0.8125rem] leading-snug text-slate-500">
            Sorted by who holds your live positions. Open a landlord for
            their centers and the raw ownership entities behind the family
            name.
          </p>
        </div>
        <ul className="divide-y divide-slate-100">
          {withNotices.map((g) => (
            <li key={g.name}>
              <details className="group">
                <summary className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5 hover:bg-slate-50/70 [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[0.875rem] font-semibold text-slate-900">
                        {g.name}
                      </span>
                      {g.triggered > 0 && (
                        <Pill tone="watch">{g.triggered} live</Pill>
                      )}
                      {g.served > 0 && (
                        <Pill tone="petrol">{g.served} noticed</Pill>
                      )}
                      {g.disputed > 0 && (
                        <Pill tone="clay">{g.disputed} disputed</Pill>
                      )}
                    </span>
                    <span className="mt-0.5 block text-[0.75rem] text-slate-500">
                      {g.centers.length}{" "}
                      {g.centers.length === 1 ? "center" : "centers"} ·{" "}
                      {g.doors} {g.doors === 1 ? "store" : "stores"}
                      {g.tightest
                        ? ` · tightest margin at ${g.tightest.center} (${g.tightest.note})`
                        : ""}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="tnum block text-[0.9375rem] font-bold text-slate-900">
                      {g.monthly > 0 ? `${money(g.monthly)}/mo` : "—"}
                    </span>
                    <span className="block text-[0.6875rem] text-slate-400">
                      {g.monthly > 0 ? "MAY qualify across positions" : "no live money"}
                    </span>
                  </span>
                </summary>
                <div className="space-y-2 border-t border-slate-50 bg-slate-50/50 px-5 py-3">
                  <ul className="space-y-1.5">
                    {g.centers.map((c) => (
                      <li
                        key={c.name}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-white px-3.5 py-2"
                      >
                        <span className="text-[0.8125rem] font-medium text-slate-800">
                          {c.name}
                          <span className="ml-2 text-[0.75rem] font-normal text-slate-500">
                            {c.city}, {c.state}
                          </span>
                        </span>
                        <span className="text-[0.75rem] text-slate-500">
                          {c.doors} {c.doors === 1 ? "store" : "stores"}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {g.served > 0 && (
                    <p className="text-[0.75rem] leading-snug text-slate-500">
                      Notice record: {g.served} served, {g.responded}{" "}
                      acknowledged or better, {g.disputed} disputed. A
                      landlord&apos;s response history is leverage in the
                      next conversation.
                    </p>
                  )}
                  {g.entities.length > 0 && (
                    <p className="text-[0.6875rem] leading-snug text-slate-400">
                      On record as: {g.entities.join(" · ")}
                    </p>
                  )}
                  <p className="text-[0.75rem]">
                    <Link
                      href="/app/locations"
                      className="font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                      Open these stores in Locations
                    </Link>
                  </p>
                </div>
              </details>
            </li>
          ))}
        </ul>
      </Panel>

    </div>
  );
}

export const metadata = { title: "Landlords" };
