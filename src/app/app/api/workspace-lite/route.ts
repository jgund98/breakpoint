/**
 * The shell's data: the session org's identity, its location index for
 * the topbar search, and the triggered count for the claim chip. This
 * exists so the client bundle carries NO portfolio data — the shell
 * asks, per session, and gets only its own org's slice.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { portfolioFor } from "@/lib/portfolios";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const s = await requireSession(request);
  if (!s) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const bundle = portfolioFor(s.orgSlug);
  if (!bundle) {
    return NextResponse.json({
      org: { name: s.orgName ?? "Your account", watched: 0, centers: 0 },
      locations: [],
      triggered: 0,
      today: null,
    });
  }

  return NextResponse.json({
    org: {
      name: bundle.org.name,
      watched: bundle.org.watched,
      centers: bundle.summary.centers,
      descriptor: bundle.org.descriptor,
      totalDoors: bundle.org.totalDoors,
      plan: bundle.org.plan,
      contractStart: bundle.org.contractStart,
    },
    locations: bundle.rows.map((r) => ({
      id: r.id,
      center: r.center.name,
      place: `${r.center.city}, ${r.center.state}`,
    })),
    triggered:
      (bundle.summary.byState.get("claimable") ?? 0) +
      (bundle.summary.byState.get("election_open") ?? 0),
    today: bundle.TODAY,
  });
}
