import "server-only";
import { db } from "@/lib/db";
import type { PortfolioBundle } from "@/lib/portfolio";
import { portfolioDeadlines } from "@/lib/deadlines";

/**
 * DO NEXT — the analyst's morning, computed.
 *
 * The person who opens this workspace every day is a lease analyst
 * with two hundred other things to do. The first thing on the screen
 * answers their actual question: what needs me, in what order, and
 * what is the one click that moves it. Every item is one plain
 * sentence, ranked by what it costs to ignore.
 */

export type DoNextItem = {
  /** One sentence, plain words, no jargon. */
  text: string;
  /** The why, when it is not obvious. */
  sub?: string;
  href: string;
  cta: string;
  tone: "act" | "watch" | "info";
};

export async function buildDoNext(p: PortfolioBundle): Promise<DoNextItem[]> {
  const items: DoNextItem[] = [];
  const slug = p.org.slug;

  /* clocks about to run out come first: a missed election is gone */
  const deadlines = portfolioDeadlines(p).filter(
    (d) => d.kind !== "report" && d.daysAway >= 0 && d.daysAway <= 21,
  );
  for (const d of deadlines.slice(0, 2)) {
    const center = d.title.split("·")[1]?.trim() ?? d.title;
    const days = `${d.daysAway} ${d.daysAway === 1 ? "day" : "days"}`;
    items.push({
      text:
        d.kind === "election"
          ? `The window to choose a remedy at ${center} closes in ${days}.`
          : `The landlord's window to fix ${center} ends in ${days}.`,
      sub:
        d.kind === "election"
          ? "Missing it usually forfeits the choice."
          : "If it stands unfixed, the remedy MAY become claimable.",
      href: d.locationId ? `/app/locations/${d.locationId}` : "/app/deadlines",
      cta: "Open the file",
      tone: "act",
    });
  }

  /* triggered positions with no notice out: the money leak */
  const { rows: served } = await db().query(
    `select location_ref, stage from notice_workflow where org_slug = $1`,
    [slug],
  );
  const stageByRef = new Map<string, string>(
    served.map((r: { location_ref: string; stage: string }) => [
      r.location_ref,
      r.stage,
    ]),
  );
  const unserved = p.rows
    .filter(
      (r) =>
        r.evaluation.state === "claimable" &&
        !["served", "approved", "counsel_review"].includes(
          stageByRef.get(r.id) ?? "",
        ),
    )
    .sort(
      (a, b) => (b.evaluation.monthlyDelta ?? 0) - (a.evaluation.monthlyDelta ?? 0),
    );
  if (unserved.length) {
    const top = unserved[0];
    const money = top.evaluation.monthlyDelta ?? 0;
    items.push({
      text:
        unserved.length === 1
          ? `${top.center.name} is triggered and no notice has gone out.`
          : `${unserved.length} triggered positions have no notice out. ${top.center.name} is the largest.`,
      sub:
        money > 0
          ? `About $${Math.round(money).toLocaleString("en-US")} a month MAY qualify there. Where relief runs from notice, waiting is losing it.`
          : "Where relief runs from notice, waiting forfeits the days.",
      href: "/app/notices",
      cta: "Open the notice desk",
      tone: "act",
    });
  }

  /* new flags nobody has opened */
  const { rows: flags } = await db().query(
    `select location_ref, center_name, headline, count(*) over ()::int as total
       from finding_alert
      where org_slug = $1 and status = 'new'
      order by flagged_on desc limit 1`,
    [slug],
  );
  if (flags[0]) {
    const f = flags[0];
    items.push({
      text:
        f.total === 1
          ? `A new flag landed at ${f.center_name}.`
          : `${f.total} new flags are waiting. The latest is at ${f.center_name}.`,
      sub: f.headline,
      href: "/app/inbox",
      cta: "Open the inbox",
      tone: "watch",
    });
  }

  /* flags someone started but did not finish */
  const { rows: stale } = await db().query(
    `select count(*)::int as n from finding_alert
      where org_slug = $1 and status = 'in_review'`,
    [slug],
  );
  if ((stale[0]?.n ?? 0) > 0 && items.length < 4) {
    items.push({
      text: `${stale[0].n} ${stale[0].n === 1 ? "flag is" : "flags are"} in review and not yet resolved.`,
      href: "/app/inbox",
      cta: "Finish them",
      tone: "info",
    });
  }

  return items.slice(0, 5);
}
