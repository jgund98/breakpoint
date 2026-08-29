/**
 * The downloadable notice package: the counsel-ready letter plus its
 * exhibits, one self-contained printable document, stamped with when
 * it was assembled. GET ?location=AF-XXXX returns it as a download.
 *
 * Exhibits follow the four-part law — a package carries the clause
 * extract with its citation, the dated evidence chain with source
 * tiers, the occupancy computation with its denominator shown, and
 * the money stated as an estimate — or it does not go out.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireMember } from "@/lib/auth";
import { portfolioFor } from "@/lib/portfolios";
import { buildNoticeLetter } from "@/lib/notice-letter";
import {
  SOURCE_META,
  TIER_META,
  formatCoTenancyRent,
  prettyDate,
  usd,
  verificationOf,
} from "@/lib/clause";

export const runtime = "nodejs";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function GET(request: NextRequest) {
  const session = await requireMember(request);
  if (!session)
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  /* Tenancy: each org's package assembles from ITS portfolio. An org
     with nothing imported, or a foreign id, gets the same 404. */
  const bundle = portfolioFor(session.orgSlug);
  if (!bundle)
    return NextResponse.json({ error: "No such location." }, { status: 404 });
  const org = bundle.org;

  const id = (request.nextUrl.searchParams.get("location") ?? "").slice(0, 32);
  const r = bundle.rows.find((x) => x.id === id);
  if (!r) return NextResponse.json({ error: "No such location." }, { status: 404 });

  const now = new Date();
  const stamp = now.toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/New_York",
  });
  const letter = buildNoticeLetter(r, org.name, `${stamp} ET`);
  const v = verificationOf(r.evidence);
  const failing = r.evaluation.triggers.filter((t) => t.failing);
  const inline = r.center.suites.filter(
    (s) => s.kind !== "anchor" && s.kind !== "outparcel",
  );

  const para = (p: { heading: string; body: string[] }) =>
    `<h3>${esc(p.heading)}</h3>` +
    p.body.map((b) => `<p>${esc(b)}</p>`).join("");

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>Co-Tenancy Notice Package: ${esc(r.id)}, ${esc(r.center.name)}</title>
<style>
  :root{color-scheme:light}
  body{font:14px/1.7 Georgia,'Times New Roman',serif;color:#111;max-width:52rem;margin:2.5rem auto;padding:0 1.5rem;background:#fff}
  header.stamp{font:11px/1.5 Arial,sans-serif;color:#555;border:1px solid #bbb;background:#f6f6f6;padding:.6rem .9rem;margin-bottom:2rem}
  .service{font-weight:bold;letter-spacing:.02em}
  .re{margin:1rem 0;padding-left:3.5rem;text-indent:-3.5rem}
  .re b{display:inline-block;width:3.5rem;text-indent:0}
  h3{font-size:14px;margin:1.4rem 0 .4rem}
  h2.exhibit{font:bold 13px Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;border-top:2px solid #111;padding-top:.9rem;margin-top:2.5rem}
  table{border-collapse:collapse;width:100%;font:12.5px/1.5 Arial,sans-serif;margin:.6rem 0}
  th,td{border:1px solid #ccc;padding:.35rem .55rem;text-align:left;vertical-align:top}
  th{background:#f2f2f2;font-size:11px;text-transform:uppercase;letter-spacing:.04em}
  .sig p{margin:.15rem 0}
  .disclaimer{font:11px/1.6 Arial,sans-serif;color:#444;border:1.5px solid #999;padding:.7rem .9rem;margin-top:2.2rem;background:#fafafa}
  .muted{color:#555}
  @media print{body{margin:.5in auto}header.stamp{background:none}}
</style></head><body>
<header class="stamp">Assembled by Breakpoint · ${esc(stamp)} ET · Location ${esc(r.id)} · Evidence standing at assembly: ${esc(TIER_META[v.tier].label)} (${v.primaryCount} primary, ${v.secondaryCount} secondary source${v.secondaryCount === 1 ? "" : "s"}) · DRAFT for counsel review</header>

<p class="service">${esc(letter.serviceMethod)}</p>
<p>${esc(letter.dateLine)}</p>
<p>${letter.addressee.map(esc).join("<br>")}</p>
${letter.reLines.map((l, i) => `<p class="re"><b>${i === 0 ? "Re:" : ""}</b>${esc(l)}</p>`).join("")}
<p>${esc(letter.salutation)}</p>
<p>${esc(letter.opening)}</p>
${letter.paragraphs.map(para).join("")}
${letter.closing.map((c) => `<p>${esc(c)}</p>`).join("")}
<div class="sig"><p style="margin-top:1.6rem">Very truly yours,</p>
${letter.signature.map((s) => `<p>${esc(s)}</p>`).join("")}
<p style="margin-top:.8rem">cc: ${letter.cc.map(esc).join("; ")}</p></div>

<h2 class="exhibit">Exhibit A: The Clause, as Extracted</h2>
<p class="muted" style="font:12px Arial,sans-serif">Extracted from the Lease; the operative language governs.</p>
${failing
  .map(
    (t) =>
      `<table><tr><th style="width:9rem">Citation</th><td>${esc(t.cite)}</td></tr>
       <tr><th>Requirement</th><td>${esc(t.requirement)}</td></tr>
       <tr><th>Observed</th><td>${esc(t.observed)}${t.culprits.length ? `; not open: ${esc(t.culprits.join(", "))}` : ""}</td></tr></table>`,
  )
  .join("")}
${r.clause.sourceText ? `<p style="font:12px/1.6 Arial,sans-serif;border-left:3px solid #ccc;padding-left:.8rem;color:#333">&ldquo;${esc(r.clause.sourceText.slice(0, 1200))}${r.clause.sourceText.length > 1200 ? "&hellip;" : ""}&rdquo;</p>` : ""}

<h2 class="exhibit">Exhibit B: The Evidence Chain</h2>
<table><tr><th>Date observed</th><th>Source</th><th>Tier</th><th>Statement</th></tr>
${r.evidence
  .map(
    (e) =>
      `<tr><td>${esc(prettyDate(e.observedAt))}</td><td>${esc(SOURCE_META[e.source].label)}</td><td>${esc(SOURCE_META[e.source].tier)}</td><td>${esc(e.statement)}</td></tr>`,
  )
  .join("")}
</table>
<p class="muted" style="font:11.5px Arial,sans-serif">Verification standard: one secondary source is a signal; two independent secondary sources corroborate; a primary source verifies. Only verified conditions carry a notice.</p>

<h2 class="exhibit">Exhibit C: Occupancy Computation and Estimated Adjustment</h2>
<table>
<tr><th style="width:16rem">Measurement basis</th><td>Open and operating, by floor area, ${inline.length} suites in the denominator (anchor premises and outparcels excluded); remodeling and casualty closures deemed open where the clause provides</td></tr>
<tr><th>Rent roll standing</th><td>${Math.round(r.center.rentRollCoverage * 100)}% of the center's floor area on file as of ${esc(prettyDate(r.center.rentRollAsOf))}</td></tr>
<tr><th>Remedy formula (Lease)</th><td>${esc(r.clause.remedy.altRent?.text ?? (r.clause.remedy.abatementPct != null ? `${r.clause.remedy.abatementPct}% abatement of Fixed Minimum Rent` : "See the Lease"))}</td></tr>
<tr><th>Estimated monthly adjustment</th><td>${esc(formatCoTenancyRent(r.evaluation.monthlyDelta))} on current reported Gross Sales. An estimate; the Lease formula on actual monthly Gross Sales controls</td></tr>
${r.evaluation.cumulativeAtRisk ? `<tr><th>Cumulative since the right arose</th><td>${esc(usd(r.evaluation.cumulativeAtRisk))}, computed month by month on each month's own reported sales</td></tr>` : ""}
</table>

<p class="disclaimer">${esc(letter.disclaimer)}</p>
</body></html>`;

  const fname = `co-tenancy-notice-${r.id}-${now.toISOString().slice(0, 10)}.html`;
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fname}"`,
    },
  });
}
