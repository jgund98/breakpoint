import Link from "next/link";
import { PageHead, Panel } from "@/components/app/ui";

/**
 * THE HELP CENTER
 *
 * Answers a client's team can act on without filing a ticket: how the
 * watch works, what each state means, what to do with a flag, the
 * clocks, the money language, and a working glossary of co-tenancy
 * terms. Everything here states the product's actual behavior — no
 * marketing, no promises the system does not keep.
 */

const SECTIONS: { id: string; title: string; body: React.ReactNode }[] = [
  {
    id: "how-it-works",
    title: "How the watch works",
    body: (
      <>
        <p>
          Breakpoint runs a four-step loop on every location you put under
          watch:
        </p>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5">
          <li>
            <strong>Abstract.</strong> Your lease and its amendments are read
            into a structured clause record: every trigger, clock, remedy,
            and precondition, each with its section citation. A person on
            our side approves every record before it goes live. Nothing
            enters the watch unreviewed.
          </li>
          <li>
            <strong>Watch.</strong> We monitor the centers those clauses
            depend on: directories, store locators, press, and field checks.
            Every sweep is logged whether or not anything changed; the quiet
            passes are the proof the watch ran.
          </li>
          <li>
            <strong>Flag.</strong> The moment observed conditions may satisfy
            a trigger, a dated flag lands in your{" "}
            <Link href="/app/inbox" className="text-indigo-600 font-semibold">
              Inbox
            </Link>{" "}
            with the evidence, the clause math, and the next step spelled
            out.
          </li>
          <li>
            <strong>Package.</strong> When a position can carry a notice, we
            assemble the package: the clause extract with citations, the
            evidence exhibits, the computed position, and a draft letter for
            your counsel. Your authorized signatory serves it, never us.
          </li>
        </ol>
      </>
    ),
  },
  {
    id: "evidence",
    title: "The evidence ladder",
    body: (
      <>
        <p>
          Evidence has three tiers, and the tier decides what it can carry:
        </p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5">
          <li>
            <strong>Signal</strong>: a single secondary source (a directory
            delisting, a maps listing, a press mention). Enough to tighten
            the watch, never enough to act on.
          </li>
          <li>
            <strong>Corroborated</strong>: two independent secondary sources
            agreeing. Enough to open a file and start preparing.
          </li>
          <li>
            <strong>Verified</strong>: primary evidence (dated photographs
            from the premises, posted signage, your own store report, or a
            landlord statement). Only verified evidence enters a notice
            package.
          </li>
        </ul>
        <p className="mt-2">
          When a triggered position rests on secondary evidence, you will see
          a <strong>Request field verification</strong>{" "}
          button: one click
          sends a person to the premises to photograph and document, so the
          package can survive the landlord&apos;s counsel. Your own store
          team can also file what they see directly: use{" "}
          <em>Report a closure</em> on any location page; it counts as
          primary evidence once confirmed.
        </p>
      </>
    ),
  },
  {
    id: "flags",
    title: "Flags: what to do when one lands",
    body: (
      <>
        <p>
          A flag is a dated finding that needs a decision. Its lifecycle is
          three steps: <strong>New</strong> (nobody has looked yet) →{" "}
          <strong>In review</strong> (someone owns it) →{" "}
          <strong>Handled</strong> (a decision was made and recorded).
          &ldquo;Start review&rdquo; opens the location&apos;s file and marks
          the flag as being worked; nothing is ever deleted, and a handled
          flag can be reopened if the facts change.
        </p>
        <p className="mt-2">
          Every flag carries its next step. Typical paths: verify the
          evidence (field verification), watch the qualifying clock, take the
          assembled package to counsel, or record that you are deliberately
          standing down (also a decision worth dating; see waiver, in the
          glossary).
        </p>
      </>
    ),
  },
  {
    id: "clocks",
    title: "The clocks",
    body: (
      <>
        <p>Four different clocks govern co-tenancy money. They never merge:</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5">
          <li>
            <strong>Qualifying period</strong>: how long the condition must
            persist before the right arises. Whole calendar months, counted
            from the first failing month.
          </li>
          <li>
            <strong>Notice</strong>: where relief runs from notice, the
            money starts when your notice is served, not when the condition
            began. Every unserved day is unrecoverable. This is the single
            most expensive clock to ignore.
          </li>
          <li>
            <strong>Cure</strong>: the landlord&apos;s window to fix the
            condition after your notice, where the lease grants one.
          </li>
          <li>
            <strong>Cap and election</strong>: how long reduced rent can
            run, and what you may elect when the cap expires with the
            condition persisting (often termination). Election windows are
            real deadlines; find them on{" "}
            <Link href="/app/deadlines" className="text-indigo-600 font-semibold">
              Deadlines
            </Link>
            , exportable to your calendar.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "money",
    title: "How the money is computed, and why we say may",
    body: (
      <>
        <p>
          Every amount in this workspace is computed month by month from
          your lease&apos;s own formula. A percentage-rent remedy computes
          on each month&apos;s own reported sales, never an average. Amounts
          are labeled <strong>may qualify</strong>{" "}
          because money becomes
          payable only through the lease&apos;s mechanics: the qualifying
          period, notice, and any cure window. Breakpoint states positions;
          your counsel states conclusions.
        </p>
        <p className="mt-2">
          Two honest outcomes worth understanding: a strong-selling store
          under a &ldquo;lesser of&rdquo; formula can show{" "}
          <em>No saving at current sales</em>: the right is real but worth
          $0 today; and an opening co-tenancy position shows no rent at risk
          at all, because rent has not commenced; its lever is the
          termination fuse, not a rent delta.
        </p>
      </>
    ),
  },
  {
    id: "notices",
    title: "Notice packages and who does what",
    body: (
      <>
        <p>
          A package goes out with four things or it does not go out: the
          clause extract with citations, the verified evidence exhibits, the
          computed position, and the letter. The workflow enforces a
          separation of duties: whoever approves a package cannot also serve
          it. Counsel reviews; your <strong>authorized signatory</strong>{" "}
          serves; Breakpoint assembles and never sends anything to a
          landlord on your behalf.
        </p>
        <p className="mt-2">
          After service, record the landlord&apos;s response on the location
          page (acknowledged, disputed, cured, resolved). The response
          history is negotiating leverage at renewal time.
        </p>
      </>
    ),
  },
  {
    id: "roles",
    title: "Roles on your team",
    body: (
      <ul className="list-disc space-y-1.5 pl-5">
        <li><strong>Owner / Admin</strong>: full workspace control, team management, alert routing.</li>
        <li><strong>Analyst / Real estate / Lease admin</strong>: works flags, files requests, maintains the portfolio.</li>
        <li><strong>Counsel</strong>: reviews and approves notice packages; cannot serve them.</li>
        <li><strong>Signatory</strong>: serves approved packages; cannot approve their own.</li>
        <li><strong>Viewer</strong>: sees everything, changes nothing.</li>
      </ul>
    ),
  },
  {
    id: "requests",
    title: "Requests you can file, and when",
    body: (
      <ul className="list-disc space-y-1.5 pl-5">
        <li>
          <strong>Scan now</strong>: you have reason to think a center
          changed and do not want to wait for the next sweep.
        </li>
        <li>
          <strong>Report a closure</strong>: your team saw it with their own
          eyes. This is primary evidence; include the store and the date
          observed.
        </li>
        <li>
          <strong>Field verification</strong>: a triggered position rests on
          secondary evidence and needs a person at the premises before it
          can carry a notice.
        </li>
        <li>
          <strong>Estoppel review</strong>: you have been asked to sign an
          estoppel certificate. Signing one while a position is live can
          waive it; have the position checked first.
        </li>
      </ul>
    ),
  },
];

const GLOSSARY: { term: string; def: string }[] = [
  { term: "Anchor", def: "A large traffic-driving tenant (department store, big box) whose presence other leases condition on. Your lease defines which tenants count; the definition, not the colloquial meaning, governs." },
  { term: "Alternative rent", def: "The substitute rent a co-tenancy failure unlocks, most often a percentage of gross sales in lieu of fixed rent. Computed on each month's own sales." },
  { term: "Abatement", def: "A remedy reducing or eliminating rent by a stated fraction while the failure persists. Does not depend on your sales." },
  { term: "Cap (remedy cap)", def: "The maximum time reduced rent can run, in calendar months from remedy start. Reaching it opens the post-cap election; it does not stop rent-at-risk from accruing while the condition persists." },
  { term: "Co-tenancy (operating)", def: "A lease condition tying your rent to other tenants staying open during the term. Fails when named tenants go dark, counts fall short, or occupancy drops below a floor." },
  { term: "Co-tenancy (opening)", def: "A condition on what must be open before your rent commences. Carries no rent delta; its lever is the termination fuse if conditions stay unmet." },
  { term: "Dark / going dark", def: "A store that has ceased operating, whether or not its lease continues. A leased-but-dark store passes a 'leased' test and fails an 'open and operating' test. The measurement basis decides." },
  { term: "Deemed open", def: "Carve-outs treating a closed store as open: remodels within a day cap, casualty, force majeure, seasonal closures. Checked before any month is counted as failing." },
  { term: "Election", def: "A choice the lease gives you at a defined moment, such as terminate or resume full rent when a cap expires. Elections have windows; missing one usually forfeits it." },
  { term: "Estoppel certificate", def: "A statement a landlord asks you to sign certifying the lease's status. Signing one that omits a live co-tenancy position can waive that position. Have it checked first." },
  { term: "GLA", def: "Gross leasable area. Occupancy percentages measure over a defined area basis (total GLA, inline GLA, or a defined area), with exclusions that swing the math more than the threshold does." },
  { term: "Measurement basis", def: "What an occupancy test counts: space that is leased, occupied, or open and operating. The same center can pass one basis and fail another." },
  { term: "Qualifying period", def: "How long a condition must persist before the right arises. Whole calendar months, inclusive of the first failing month." },
  { term: "Reservation of rights", def: "A letter telling the landlord you know of a failure and are not waiving anything by continuing to pay. Counsel's tool against the waiver defense when you choose not to act yet." },
  { term: "Sales gate", def: "A precondition requiring your own sales to have declined before the remedy unlocks. Once met in any month, it is met for the whole episode." },
  { term: "Sequenced remedy", def: "A remedy ladder: one relief for an initial period, then a different one (often deeper) if the failure persists." },
  { term: "Termination fuse", def: "In opening co-tenancy: the date (delivery plus the cap) by which conditions must be met, or you gain a termination right, often with construction-cost reimbursement." },
  { term: "Waiver", def: "The landlord's silent defense: months of full rent paid after knowledge of a failure, with no reservation of rights, can be argued as giving the right up. Dating your decisions defeats it." },
  { term: "WARN notice", def: "A legally required layoff filing that often precedes store closures by 60-90 days. We treat them as early warnings: the watch tightens before the storefront goes dark." },
];

const FAQ: { q: string; a: string }[] = [
  { q: "Why does a triggered position show $0 or 'No saving at current sales'?", a: "Under a 'lesser of minimum rent or percent of sales' formula, a strong-selling store's percentage rent can exceed its fixed rent. The right is real, the saving today is zero. The position still matters: sales change, and the trigger is on the record." },
  { q: "Why do you never say the landlord 'owes' us money?", a: "Because money becomes payable only through the lease's own mechanics: qualifying period, notice, cure. We state what may qualify and hold the evidence; your counsel states conclusions. That discipline is also what makes our packages hard to attack." },
  { q: "A flag I handled came back. Why?", a: "A location that recovered and then failed again is a new episode, and files a new flag. The old one keeps its history; the new one gets its own dates. Nothing is ever silently merged." },
  { q: "How fresh is what I'm seeing?", a: "Every location page shows its watch record: when the last sweep ran, which sources were read, and what changed. Quiet sweeps are logged too: 'no change' is a finding, not an absence." },
  { q: "We amended a lease. What happens?", a: "Tell us (or upload the amendment on the location page). The clause record returns to extraction, a person re-approves it, and the location shows 'in review' until it is back under watch. A suspended clause is inert until its first active month; the clock never runs during suspension." },
  { q: "Can Breakpoint serve the notice for us?", a: "No, and that is deliberate. We assemble the package (extract, evidence, computed position, draft letter) and your authorized signatory serves it after counsel review. Service is a legal act that belongs to you." },
  { q: "What should I ask Theo versus filing a request?", a: "Theo answers from your portfolio's records instantly: which leases depend on a retailer, what a clause says, what changed at a center. File a request when the physical world needs checking: a scan, a field visit, an estoppel review." },
];

export default function HelpPage() {
  return (
    <div className="space-y-5">
      <PageHead
        eyebrow="Account"
        title="Help center"
        lede="How the watch works, what each state means, and the vocabulary of co-tenancy."
      />

      {/* quick nav */}
      <Panel>
        <p className="text-[0.6875rem] font-semibold tracking-wider text-slate-400 uppercase">
          On this page
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {[...SECTIONS.map((s) => ({ id: s.id, t: s.title })),
            { id: "glossary", t: "Glossary" },
            { id: "faq", t: "Common questions" }].map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="rounded-full bg-slate-100 px-3 py-1.5 text-[0.75rem] font-semibold text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700"
            >
              {s.t}
            </a>
          ))}
        </div>
      </Panel>

      {SECTIONS.map((s) => (
        <Panel key={s.id} flush>
          <div id={s.id} className="scroll-mt-24 border-b border-slate-100 px-5 py-4">
            <h2 className="text-[0.9375rem] font-semibold text-slate-900">
              {s.title}
            </h2>
          </div>
          <div className="px-5 py-4 text-[0.8125rem] leading-relaxed text-slate-600">
            {s.body}
          </div>
        </Panel>
      ))}

      <Panel flush>
        <div id="glossary" className="scroll-mt-24 border-b border-slate-100 px-5 py-4">
          <h2 className="text-[0.9375rem] font-semibold text-slate-900">Glossary</h2>
          <p className="mt-0.5 text-[0.8125rem] text-slate-500">
            The terms as your leases use them. Where a lease defines a term
            differently, the lease wins, always.
          </p>
        </div>
        <dl className="divide-y divide-slate-50">
          {GLOSSARY.map((g) => (
            <div key={g.term} className="px-5 py-3">
              <dt className="text-[0.8125rem] font-semibold text-slate-900">
                {g.term}
              </dt>
              <dd className="mt-0.5 max-w-[56rem] text-[0.8125rem] leading-snug text-slate-600">
                {g.def}
              </dd>
            </div>
          ))}
        </dl>
      </Panel>

      <Panel flush>
        <div id="faq" className="scroll-mt-24 border-b border-slate-100 px-5 py-4">
          <h2 className="text-[0.9375rem] font-semibold text-slate-900">
            Common questions
          </h2>
        </div>
        <ul className="divide-y divide-slate-50">
          {FAQ.map((f) => (
            <li key={f.q}>
              <details className="group px-5 py-3">
                <summary className="cursor-pointer text-[0.8125rem] font-semibold text-slate-800 hover:text-indigo-700 [&::-webkit-details-marker]:hidden">
                  {f.q}
                </summary>
                <p className="mt-1.5 max-w-[56rem] text-[0.8125rem] leading-relaxed text-slate-600">
                  {f.a}
                </p>
              </details>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel>
        <p className="text-[0.8125rem] font-semibold text-slate-900">
          Still stuck?
        </p>
        <p className="mt-1 text-[0.8125rem] leading-snug text-slate-600">
          Ask{" "}
          <Link href="/app/theo" className="font-semibold text-indigo-600 hover:text-indigo-700">
            Theo
          </Link>{" "}
          anything about your own portfolio; it answers from your records
          with sources. For anything the physical world needs to answer,
          file a request from any location page; a person on our side picks
          it up.
        </p>
      </Panel>
    </div>
  );
}

export const metadata = { title: "Help center" };
