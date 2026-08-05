import type { Metadata } from "next";
import { PageHero } from "@/components/chrome/PageHero";
import { Section, Eyebrow, SectionTitle, Lede } from "@/components/ui/Section";
import { ClauseReader } from "@/components/showpiece/ClauseReader";
import {
  OccupancyTrace,
  TriggerAlert,
  ClaimPacket,
} from "@/components/showpiece/PipelineArtifacts";
import { Button } from "@/components/ui/Button";
import { coexistsWith } from "@/lib/site";

export const metadata: Metadata = {
  title: "Platform: how co-tenancy monitoring works",
  description:
    "Breakpoint abstracts co-tenancy clauses from your leases, assembles each center's occupancy record, re-evaluates every test as conditions change, and builds the review package when one appears to fail.",
  alternates: { canonical: "/platform" },
};

const sources = [
  "Anchor and inline closure announcements",
  "Store-locator and open-hours changes",
  "Building permit and sign permit activity",
  "Landlord marketing plans and leasing flyers",
  "County and municipal filings",
  "Field verification where the record is thin",
];

const guardrails = [
  {
    k: "Every field cites its source sentence",
    v: "An abstraction you cannot audit is a liability. Each extracted rule links to the exact clause text it came from, so a lease administrator can check it in seconds.",
  },
  {
    k: "A human reviews the abstraction",
    v: "The engine proposes; a person confirms before a lease goes live. Co-tenancy language is unusually adversarial and the cost of a wrong read runs both directions.",
  },
  {
    k: "Occupancy is evidence, not a number",
    v: "Every occupancy figure is stored with its date, its basis and what supported it, because a notice is only as strong as what sits behind it.",
  },
  {
    k: "We never serve notice for you",
    v: "Breakpoint detects, calculates and assembles. Your counsel decides whether and when to serve. We are not your lawyer and this is not legal advice.",
  },
];

export default function PlatformPage() {
  return (
    <>
      <PageHero
        eyebrow="Platform"
        title="Two halves of one problem,"
        accent="joined for the first time."
        lede={
          <>
            Your lease system holds the clause. Property data holds the center.
            Breakpoint reads both, re-runs the tests between them as verified
            conditions change, and tells you the day an answer moves.
          </>
        }
        cta={{ href: "/demo", label: "Start your evaluation" }}
      />

      {/* 01 */}
      <Section tone="canvas" id="abstract">
        <div className="max-w-3xl">
          <Eyebrow>01 · Abstract</Eyebrow>
          <SectionTitle>Lease language in, testable rules out</SectionTitle>
          <Lede>
            We read the executed lease and every amendment, side letter and
            estoppel. Co&#8209;tenancy provisions are amended more often than
            almost any other clause, and the operative version is frequently not
            the one in the original document.
          </Lede>
        </div>
        <div className="mt-12">
          <ClauseReader />
        </div>
      </Section>

      {/* 02 */}
      <Section tone="sunk" grid id="watch">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div>
            <Eyebrow>02 · Watch</Eyebrow>
            <SectionTitle>
              The half nobody else has ever held
            </SectionTitle>
            <Lede>
              A lease platform can tell you the floor is 70%. It cannot tell
              you where the center is today. We assemble occupied GLA month by
              month, track which named tenants are open and operating, and date every
              closure, then hold it as a record you can attach to
              a&nbsp;notice.
            </Lede>
            <ul className="mt-8 grid gap-2.5 sm:grid-cols-2">
              {sources.map((s) => (
                <li key={s} className="flex gap-3 text-[0.9375rem] text-ink-soft">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-petrol-600" />
                  <span className="no-orphan">{s}</span>
                </li>
              ))}
            </ul>
          </div>
          <OccupancyTrace />
        </div>
      </Section>

      {/* 03 */}
      <Section tone="canvas" id="trigger">
        <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
          <div>
            <Eyebrow>03 · Trigger</Eyebrow>
            <SectionTitle>Re-evaluated as conditions change. Escalated once.</SectionTitle>
            <Lede>
              Every test in every lease re-runs as verified information about its
              center changes. Nothing fires until an answer actually moves.
              When one does, it goes to the person who can act on it, not
              into a monthly report.
            </Lede>
            <p className="no-orphan mt-6 max-w-xl text-[1.0625rem] leading-relaxed text-ink-soft">
              Breakpoint also flags the near-misses: centers sitting within a
              point or two of a floor, where one more closure crosses it. That
              is the window in which a landlord can still be persuaded to
              backfill.
            </p>
          </div>
          <TriggerAlert />
        </div>
      </Section>

      {/* 04 */}
      <Section tone="sunk" grid id="package">
        <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-16">
          <ClaimPacket />
          <div>
            <Eyebrow>04 · Package</Eyebrow>
            <SectionTitle>Evidence assembled, not requested</SectionTitle>
            <Lede>
              The reason valid claims die is that assembling the proof takes
              weeks nobody has. Breakpoint builds the package the moment a test
              appears to fail: the draft notice, the clause abstract with
              citations, the dated occupancy record, the named-tenant log and
              the alternative-rent calculations.
            </Lede>
            <p className="no-orphan mt-6 max-w-xl text-[1.0625rem] leading-relaxed text-ink-soft">
              Whether and when to serve is your call, made with counsel. If
              notice goes out, the clock starts, and Breakpoint keeps tracking
              whether the condition stays active, gets cured, or is disputed.
            </p>
          </div>
        </div>
      </Section>

      {/* guardrails */}
      <Section tone="petrol">
        <div className="max-w-3xl">
          <Eyebrow tone="brass">How we handle being wrong</Eyebrow>
          <SectionTitle className="text-cream">
            An abstraction you can&#8217;t audit{" "}
            <span className="display-em block text-brass-200">
              is worse than none at all.
            </span>
          </SectionTitle>
          <p className="lede no-orphan mt-6 max-w-2xl text-cream-soft">
            This product tells people they may be owed money. That obligates us
            to be checkable at every step.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2">
          {guardrails.map((g) => (
            <div
              key={g.k}
              className="rounded-xl border border-white/15 bg-white/5 p-6 sm:p-7"
            >
              <h3 className="balance text-[1.1875rem] text-cream">{g.k}</h3>
              <p className="no-orphan mt-3 text-[0.9375rem] leading-relaxed text-cream-soft">
                {g.v}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* fits */}
      <Section tone="canvas">
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-16">
          <div>
            <Eyebrow>Where it sits</Eyebrow>
            <SectionTitle>An overlay, not a migration</SectionTitle>
            <Lede>
              Nobody is replacing their lease system of record for one clause,
              and we would not ask. Breakpoint ingests your existing abstracts
              and writes its findings back out: your subledger, your critical
              dates, your workflow, unchanged.
            </Lede>
            <div className="mt-9">
              <Button href="/demo">Start your evaluation</Button>
            </div>
          </div>
          <div className="rounded-xl border border-line bg-surface p-7 sm:p-8">
            <span className="label text-muted">Runs alongside</span>
            <ul className="mt-5 flex flex-wrap gap-2">
              {coexistsWith.map((n) => (
                <li
                  key={n}
                  className="rounded-full border border-line bg-canvas px-4 py-2 text-[0.9375rem] font-medium text-ink-soft"
                >
                  {n}
                </li>
              ))}
            </ul>
            <p className="mt-6 border-t border-line pt-4 text-xs leading-relaxed text-muted">
              Named as the systems Breakpoint is built to sit on top of. Not a
              claim of partnership, certification or endorsement.
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}
