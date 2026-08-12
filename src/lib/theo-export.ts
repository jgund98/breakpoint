/**
 * EXPORTING AN ANSWER
 *
 * A real request from a real regional manager, forwarded by our partner:
 *
 *   "The quarterly report is excellent for the granular and more
 *    specific information however I would like to provide a simpler tool
 *    for our leasing, development and property management team to
 *    utilize on quick glance... I would like to get a one pager."
 *
 * That is the whole specification. The analysis already exists; what
 * does not is a way to take it out of the screen and into a meeting, an
 * email, or a spreadsheet somebody else works in.
 *
 * Two shapes, because the two uses are different. CSV when the answer is
 * a table somebody will sort and filter. A printable page when it is a
 * one pager to hand round a room, which is what was actually asked for.
 */

import type { AnswerBlock, TheoAnswer } from "./theo";

const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

/**
 * Every table in the answer, stacked, with the stats above them.
 *
 * Multiple tables land in one file separated by a blank line and their
 * caption, because splitting an answer across several downloads makes
 * the reader reassemble what we already put together.
 */
export function answerToCsv(a: TheoAnswer): string {
  const out: string[] = [];
  out.push(`# ${a.interpreted}`);
  if (a.lead) out.push(`# ${a.lead.replace(/\s+/g, " ")}`);
  out.push(`# ${a.provenance}`);
  out.push("");

  for (const b of a.blocks) {
    if (b.type === "stat") {
      out.push(["Measure", "Value", "Note"].map(esc).join(","));
      for (const it of b.items)
        out.push([it.label, it.value, it.hint ?? ""].map(esc).join(","));
      out.push("");
    }
    if (b.type === "table") {
      if (b.caption) out.push(`# ${b.caption}`);
      out.push(b.columns.map(esc).join(","));
      for (const r of b.rows) out.push(r.cells.map(esc).join(","));
      out.push("");
    }
    if (b.type === "verbatim") {
      out.push(["Citation", "Language"].map(esc).join(","));
      out.push([b.cite, b.body].map(esc).join(","));
      out.push("");
    }
  }
  return out.join("\n");
}

/** True where there is anything worth putting in a spreadsheet. */
export function hasTabularContent(a: TheoAnswer): boolean {
  return a.blocks.some(
    (b) => b.type === "table" || b.type === "stat" || b.type === "verbatim",
  );
}

/* ------------------------------------------------------------------
   the one pager
   ------------------------------------------------------------------ */

const h = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function blockHtml(b: AnswerBlock): string {
  switch (b.type) {
    case "text":
      return `<p>${h(b.body)}</p>`;
    case "stat":
      return `<div class="stats">${b.items
        .map(
          (i) =>
            `<div class="stat"><span class="k">${h(i.label)}</span><span class="v">${h(i.value)}</span>${
              i.hint ? `<span class="n">${h(i.hint)}</span>` : ""
            }</div>`,
        )
        .join("")}</div>`;
    case "table":
      return `${b.caption ? `<h3>${h(b.caption)}</h3>` : ""}<table><thead><tr>${b.columns
        .map((c) => `<th>${h(c)}</th>`)
        .join("")}</tr></thead><tbody>${b.rows
        .map((r) => `<tr>${r.cells.map((c) => `<td>${h(c)}</td>`).join("")}</tr>`)
        .join("")}</tbody></table>`;
    case "verbatim":
      return `<blockquote><span class="cite">${h(b.cite)}</span>${h(b.body)}</blockquote>`;
    case "gap":
      return `<p class="gap">${h(b.body)}</p>`;
  }
}

/**
 * A self-contained page the browser can print to PDF.
 *
 * Deliberately plain: this gets forwarded, printed and dropped into a
 * deck, and anything that depends on our stylesheet or our fonts breaks
 * the moment it leaves. Every rule it needs travels with it.
 */
export function answerToPrintable(
  a: TheoAnswer,
  meta: { org: string; asOf: string },
): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${h(a.interpreted)}</title>
<style>
  @page { margin: 18mm; }
  * { box-sizing: border-box; }
  body { font: 11pt/1.5 -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
         color: #16161d; margin: 0; padding: 28px; }
  .brand { font-size: 8.5pt; letter-spacing: .14em; text-transform: uppercase;
           color: #9a6b12; font-weight: 700; }
  h1 { font-size: 17pt; margin: 6px 0 2px; }
  .sub { color: #5a5a6e; font-size: 9.5pt; margin: 0 0 18px; }
  .lead { font-size: 11.5pt; margin: 0 0 16px; }
  .stats { display: flex; flex-wrap: wrap; gap: 14px; margin: 0 0 16px; }
  .stat { border: 1px solid #dcdce4; border-radius: 8px; padding: 10px 14px; min-width: 150px; }
  .stat .k { display: block; font-size: 8pt; letter-spacing: .09em;
             text-transform: uppercase; color: #5a5a6e; }
  .stat .v { display: block; font-size: 16pt; font-weight: 600; margin-top: 3px; }
  .stat .n { display: block; font-size: 8.5pt; color: #5a5a6e; margin-top: 3px; }
  h3 { font-size: 10.5pt; margin: 16px 0 6px; }
  table { width: 100%; border-collapse: collapse; margin: 0 0 14px; font-size: 9.5pt; }
  th { text-align: left; font-size: 8pt; letter-spacing: .08em; text-transform: uppercase;
       color: #5a5a6e; border-bottom: 1px solid #dcdce4; padding: 6px 8px 5px; }
  td { padding: 6px 8px; border-bottom: 1px solid #eeeef3; vertical-align: top; }
  tr { break-inside: avoid; }
  blockquote { margin: 0 0 14px; padding: 12px 14px; background: #f7f7fb;
               border-left: 3px solid #dcdce4; font-size: 9.5pt; }
  blockquote .cite { display: block; font-weight: 600; margin-bottom: 4px; }
  .gap { color: #8a4b2a; }
  footer { margin-top: 22px; padding-top: 10px; border-top: 1px solid #dcdce4;
           color: #5a5a6e; font-size: 8.5pt; }
  @media print { body { padding: 0; } .noprint { display: none; } }
</style></head>
<body>
  <div class="brand">Breakpoint</div>
  <h1>${h(a.interpreted)}</h1>
  <p class="sub">${h(meta.org)} · ${h(meta.asOf)}</p>
  ${a.lead ? `<p class="lead">${h(a.lead)}</p>` : ""}
  ${a.blocks.map(blockHtml).join("\n")}
  <footer>${h(a.provenance)}<br>
  Prepared by Breakpoint from the client's lease records and observed center conditions.
  For discussion. Not legal advice.</footer>
  <script class="noprint">window.addEventListener("load", () => window.print());</script>
</body></html>`;
}
