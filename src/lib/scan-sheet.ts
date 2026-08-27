/**
 * The day's scan sheet.
 *
 * While the sweep is people rather than crawlers, the team needs a work
 * packet: which locations are due today, where to look for each one,
 * and which stores decide the clause. This generates it as a
 * self-contained printable page, one center per block, so a morning's
 * sweep is a sheet to work down rather than twenty tabs to reconstruct.
 *
 * Client-safe: pure string building, no imports from server code.
 */

export type SheetLocation = {
  id: string;
  centerName: string;
  city: string;
  state: string;
  /** Directory urls and Places ids linked to this center. */
  sources: { kind: string; url: string | null; placeId: string | null }[];
  /** The stores the clause turns on, with the status we hold. */
  watched: { name: string; status: string }[];
  /** One line: the tightest test and its margin. */
  tightest: string;
};

const h = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function scanSheetHtml(
  locations: SheetLocation[],
  meta: { orgName: string; date: string },
): string {
  const blocks = locations
    .map((l) => {
      const sources = l.sources.length
        ? l.sources
            .map(
              (s) =>
                `<li><span class="k">${h(s.kind)}</span> ${h(s.url ?? s.placeId ?? "")}</li>`,
            )
            .join("")
        : `<li class="gap">No sources linked. Find the center's published directory and add it to the board.</li>`;

      const watched = l.watched.length
        ? l.watched
            .map(
              (w) =>
                `<tr><td>${h(w.name)}</td><td class="${w.status === "open" ? "ok" : "bad"}">${h(w.status)}</td><td class="box">☐ open&nbsp;&nbsp;☐ closed&nbsp;&nbsp;☐ unclear</td></tr>`,
            )
            .join("")
        : `<tr><td colspan="3">Occupancy test only: count the directory against the roster.</td></tr>`;

      return `<section>
  <h2>${h(l.centerName)} <span class="loc">${h(l.id)} · ${h(l.city)}, ${h(l.state)}</span></h2>
  <p class="tight">${h(l.tightest)}</p>
  <p class="k">Where to look</p>
  <ul>${sources}</ul>
  <p class="k">Named by the clause · mark what you see</p>
  <table><thead><tr><th>Store</th><th>On file</th><th>Observed today</th></tr></thead>
  <tbody>${watched}</tbody></table>
</section>`;
    })
    .join("\n");

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Scan sheet · ${h(meta.date)}</title>
<style>
  @page { margin: 14mm; }
  body { font: 10pt/1.45 -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
         color: #16161d; margin: 0; padding: 24px; }
  h1 { font-size: 14pt; margin: 0 0 2px; }
  .sub { color: #5a5a6e; font-size: 9pt; margin: 0 0 16px; }
  section { border: 1px solid #dcdce4; border-radius: 8px; padding: 12px 14px;
            margin: 0 0 12px; break-inside: avoid; }
  h2 { font-size: 11pt; margin: 0 0 2px; }
  .loc { font-weight: 400; font-size: 8.5pt; color: #5a5a6e; }
  .tight { margin: 0 0 8px; font-size: 9pt; color: #8a5a12; }
  .k { font-size: 7.5pt; letter-spacing: .09em; text-transform: uppercase;
       color: #5a5a6e; margin: 8px 0 3px; font-weight: 700; }
  ul { margin: 0; padding-left: 16px; font-size: 9pt; }
  ul .k { display: inline; margin-right: 6px; }
  .gap { color: #8a4b2a; }
  table { width: 100%; border-collapse: collapse; font-size: 9pt; }
  th { text-align: left; font-size: 7.5pt; letter-spacing: .08em; text-transform: uppercase;
       color: #5a5a6e; border-bottom: 1px solid #dcdce4; padding: 3px 6px; }
  td { padding: 4px 6px; border-bottom: 1px solid #eeeef3; }
  .ok { color: #1a7a3a; } .bad { color: #a33d1f; }
  .box { color: #5a5a6e; }
  footer { margin-top: 14px; color: #5a5a6e; font-size: 8pt; }
</style></head>
<body>
  <h1>Scan sheet</h1>
  <p class="sub">${h(meta.orgName)} · ${h(meta.date)} · ${locations.length} location${locations.length === 1 ? "" : "s"} due</p>
  ${blocks}
  <footer>Enter results through the weekly check. A confirmed change files as a store report; a directory read alone stays a signal.</footer>
  <script>window.addEventListener("load", () => window.print());</script>
</body></html>`;
}
