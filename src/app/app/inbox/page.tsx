import { PageHead, Panel, PanelHead } from "@/components/app/ui";
import { InboxList } from "@/components/app/Inbox";

/**
 * THE INBOX
 *
 * The action queue, run like mail: dated flags, newest first, unread
 * until someone starts the review, on the record once handled. The
 * side rail teaches the lifecycle and what each flag kind demands,
 * because the reader acting on these is a real estate team, not a
 * co-tenancy specialist.
 */
export default function InboxPage() {
  return (
    <div className="space-y-5">
      <PageHead
        eyebrow="Act"
        title="Inbox"
        lede="Every flag is a dated event: a location crossed a line that needs your decision. New flags arrive here the moment an evaluation puts them over."
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_320px] lg:items-start">
        <InboxList />

        <div className="space-y-4">
          <Panel flush>
            <div className="border-b border-slate-100 px-5 py-4">
              <PanelHead title="How a flag moves" />
            </div>
            <ol className="space-y-3 px-5 py-4">
              {[
                [
                  "New",
                  "The evaluation crossed a line. Nobody has looked yet — the flag reads as unread until someone does.",
                ],
                [
                  "In review",
                  "Someone owns it: verifying the evidence, confirming your store's standing, weighing the economics.",
                ],
                [
                  "Handled",
                  "A decision was made — a notice package went to counsel, or the team passed on the record. Either way it leaves the queue and stays in the ledger.",
                ],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-indigo-600 text-[0.625rem] font-bold text-white shadow-sm">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-[0.8125rem] font-semibold text-slate-900">
                      {t}
                    </p>
                    <p className="mt-0.5 text-[0.75rem] leading-relaxed text-slate-500">
                      {d}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="border-t border-slate-100 px-5 py-3 text-[0.75rem] leading-relaxed text-slate-500">
              If a handled location recovers and trips again later, that is a
              new episode: a fresh dated flag files and the counter starts
              again. Nothing is silently reused.
            </p>
          </Panel>

          <Panel flush>
            <div className="border-b border-slate-100 px-5 py-4">
              <PanelHead title="What each flag asks of you" />
            </div>
            <dl className="space-y-3 px-5 py-4">
              <div>
                <dt className="text-[0.8125rem] font-semibold text-slate-900">
                  Triggered
                </dt>
                <dd className="mt-0.5 text-[0.75rem] leading-relaxed text-slate-500">
                  The qualifying period completed: this location MAY qualify
                  for co-tenancy rent. Verify the evidence, confirm your
                  store&#8217;s standing, then assemble the notice package for
                  counsel. On notice-driven leases every month before service
                  is lost.
                </dd>
              </div>
              <div>
                <dt className="text-[0.8125rem] font-semibold text-slate-900">
                  Election open
                </dt>
                <dd className="mt-0.5 text-[0.75rem] leading-relaxed text-slate-500">
                  The remedy cap has run and the lease now demands a choice —
                  resume full rent or terminate — inside a window that
                  lapses. This one is a deadline, not a review.
                </dd>
              </div>
              <div>
                <dt className="text-[0.8125rem] font-semibold text-slate-900">
                  Confirm store
                </dt>
                <dd className="mt-0.5 text-[0.75rem] leading-relaxed text-slate-500">
                  A test fails here but we cannot confirm your own store is
                  open and operating, and a dark store usually cannot claim.
                  Confirm it on Coverage and the location scores.
                </dd>
              </div>
            </dl>
          </Panel>
        </div>
      </div>
    </div>
  );
}
