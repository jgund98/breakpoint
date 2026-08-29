import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, FileText, Landmark, MapPin } from "lucide-react";
import { ImplementationTracker } from "@/components/app/ImplementationTracker";
import { StatCard } from "@/components/admin/ui";
import { LinkButton, PageHead, Panel, PanelHead } from "@/components/app/ui";
import { org, rows, summary } from "@/lib/portfolio";
import { currentOrg } from "@/lib/repo";
import { hasPortfolio } from "@/lib/orgs";
import { sessionOrgSlug } from "@/lib/portfolio-gate";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Portfolio setup" };
export const dynamic = "force-dynamic";

/**
 * Setup is the portfolio's paper trail: what is on file, where each
 * location stands on its road to live, and how new locations arrive.
 * For a client who just sent a thousand leases, "where is my
 * portfolio" is the only question for weeks — this page answers it
 * from the real record.
 */
export default async function SetupPage() {
  /* TENANCY: this page is the landing spot for orgs whose portfolio is
     not imported yet, so everything here keys on the SESSION org. */
  const slug = (await sessionOrgSlug()) ?? currentOrg().slug;
  const live = hasPortfolio(slug);

  let inFlight: { location_ref: string; stage: string; note: string | null }[] = [];
  let papers = 0;
  try {
    const [p, d] = await Promise.all([
      db().query(
        `select location_ref, stage, note from location_pipeline
          where org_slug = $1 order by created_at`,
        [slug],
      ),
      db().query(
        `select count(*)::int as n from lease_document where org_slug = $1`,
        [slug],
      ),
    ]);
    inFlight = p.rows;
    papers = d.rows[0]?.n ?? 0;
  } catch {
    /* without a database the tracker simply shows everything live */
  }

  /* An org that has not been imported yet gets its own honest state:
     what we hold for THEM, and the door new material comes through.
     Never another client's portfolio. */
  if (!live) {
    return (
      <div className="space-y-5">
        <PageHead
          eyebrow="Act"
          title="Portfolio setup"
          lede="Your portfolio is not in the evaluation engine yet. Here is exactly where things stand."
        />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-2">
          <StatCard
            label="Papers digitized"
            value={papers}
            sub="Leases and amendments in your vault"
            icon={<FileText className="h-5 w-5" />}
            color="sky"
          />
          <StatCard
            label="Records in extraction"
            value={inFlight.length}
            sub="Being read and human-approved"
            icon={<Landmark className="h-5 w-5" />}
            color="indigo"
            delay={50}
          />
        </div>
        <Panel>
          <PanelHead
            title="Getting to live"
            hint="Send the roster and the leases through your onboarding console. We read them, a person approves each clause record, and your locations appear here under watch."
          />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <LinkButton href="/onboarding" variant="primary">
              Open the onboarding console
            </LinkButton>
            <LinkButton href="/app/settings">
              Invite your team <ArrowRight className="h-4 w-4" />
            </LinkButton>
          </div>
        </Panel>
      </div>
    );
  }

  const locations = rows.map((r) => ({
    id: r.id,
    centerName: r.center.name,
  }));

  return (
    <div className="space-y-5">
      <PageHead
        eyebrow="Act"
        title="Portfolio setup"
        lede="What we hold, where each location stands, and how new locations arrive."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Locations on file"
          value={org.watched}
          sub="Read from your leases, under watch"
          icon={<MapPin className="h-5 w-5" />}
          color="indigo"
        />
        <StatCard
          label="Centers"
          value={summary.centers}
          sub={`Across ${summary.states} states`}
          icon={<Building2 className="h-5 w-5" />}
          color="violet"
          delay={50}
        />
        <StatCard
          label="Papers digitized"
          value={papers}
          sub="Leases and amendments in the vault"
          icon={<FileText className="h-5 w-5" />}
          color="sky"
          delay={100}
        />
        <StatCard
          label="Clauses graded"
          value={org.watched}
          sub="Every provision scored on seven terms"
          icon={<Landmark className="h-5 w-5" />}
          color="emerald"
          delay={150}
        />
      </div>

      <ImplementationTracker locations={locations} inFlight={inFlight} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHead
            title="Adding locations"
            hint="New stores go through your onboarding console: send the roster rows and leases, we read them, a person approves each record, and it appears here under watch."
          />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <LinkButton href="/onboarding" variant="primary">
              Open the onboarding console
            </LinkButton>
            <LinkButton href="/app/locations">
              See what is live <ArrowRight className="h-4 w-4" />
            </LinkButton>
          </div>
          <p className="mt-3 text-[0.75rem] leading-relaxed text-slate-500">
            One store or one hundred, the console is the same door. Nothing you
            already sent is asked for twice.
          </p>
        </Panel>

        <Panel>
          <PanelHead
            title="When a lease changes"
            hint="An amendment pulls that location's clause record back for re-extraction and human approval. Until it is re-approved, the location shows In review above."
          />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <LinkButton href="/app/clauses">
              Clause library <ArrowRight className="h-4 w-4" />
            </LinkButton>
            <LinkButton href="/app/coverage">
              Coverage <ArrowRight className="h-4 w-4" />
            </LinkButton>
          </div>
          <p className="mt-3 text-[0.75rem] leading-relaxed text-slate-500">
            Send amendments the same way as leases. The record never runs on
            language a person has not approved.
          </p>
        </Panel>
      </div>
    </div>
  );
}
